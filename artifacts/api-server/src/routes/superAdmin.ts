import { Router } from "express";
import {
  db, usersTable, mt5RequestsTable, eaSubscriptionsTable, siteSettingsTable,
  investmentPlansTable, copyTradersTable, transactionsTable, investmentsTable,
  kycRecordsTable, ticketsTable, algoSubscriptionsTable, algoStrategiesTable,
  mt5AccountsTable,
} from "@workspace/db";
import { eq, desc, and } from "@workspace/db/orm";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { requireAuth, requirePlatformAdmin } from "../middlewares/auth";
import { forbidAdminCredentialWrites } from "../middlewares/platformAdminGuard";
import { mapPlan } from "./plans";
import { mapUser } from "./auth";
import { linkMtTradingAccount } from "../helpers/mtAccountLink";
import { mapAccount } from "./mt5";
import {
  parseStatsPeriod,
  parseStaffStatsPeriod,
  resolveStatsDateRange,
  computePlatformFinancialStats,
  computeTodayPayments,
} from "../helpers/platformStatsService";
import {
  fetchUserRoleCounts,
  fetchOperationalCounts,
  fetchTransactionsForStats,
  fetchInvestmentsForStats,
  fetchTodayWithdrawalTransactions,
  fetchInvestmentsMaturingBetween,
  sumInvestmentProfit,
} from "../helpers/platformDashboardCounts";
import { computePlatformLedgerAudit } from "../helpers/platformLedgerAuditService";
import { getExchangeRates, usdToInr } from "../helpers/exchangeRateService";
import superAdminBackupRouter from "./superAdminBackup";
import { EA_CATALOG } from "./eaStrategies";
import {
  listPartnerApiKeys,
  createPartnerApiKey,
  updatePartnerApiKey,
  deletePartnerApiKey,
  PARTNER_SCOPES,
} from "../helpers/partnerApiKeyService";
import { N8nEventType } from "../helpers/n8nWebhookService";
import {
  handleGetReconciliation,
  handleGetTreasury,
  handlePostReconciliationRun,
} from "../helpers/treasuryRouteHandlers";
import { respondSchemaDrift } from "../helpers/schemaErrorUtil";
import { validateBody, getValidatedBody } from "../middlewares/validate";
import {
  CreateStaffUserBody,
  CreateSupportAgentBody,
  BulkUserUpdatesBody,
  PatchUserRoleBody,
  BanLoginBody,
  SettingsJsonBody,
  Mt5EndpointBody,
  TradeCopierSettingsBody,
  VpsBridgeSettingsBody,
  MarketDataSettingsBody,
  SmtpSettingsBody,
  SmtpTestBody,
  SupportInboxSettingsBody,
  EmailCommunicationTestBody,
  Mt5RequestStatusBody,
  ExchangeOrderAdminNotesBody,
  ExchangeOrderRejectBody,
} from "../lib/routeBodySchemas";

const EA_CATALOG_NAMES = new Map(EA_CATALOG.map(item => [item.id, item.name]));

const router = Router();

function generateReferralCode(): string {
  return "KQ" + randomBytes(3).toString("hex").toUpperCase();
}

router.use(requireAuth, requirePlatformAdmin, forbidAdminCredentialWrites);

router.use("/backup", superAdminBackupRouter);

router.get("/treasury", handleGetTreasury);

router.get("/reconciliation", handleGetReconciliation);

router.post("/reconciliation/run", handlePostReconciliationRun);

router.post("/backup/run", async (_req, res) => {
  const { runDatabaseBackup } = await import("../helpers/databaseBackup");
  const result = await runDatabaseBackup();
  if (!result.ok) {
    res.status(result.message?.includes("not configured") ? 503 : 500).json(result);
    return;
  }
  res.json(result);
});

// ── Dashboard overview (home page samples) ───────────────────────────────────
router.get("/overview", async (_req, res) => {
  const { getEaCatalog } = await import("../helpers/eaCatalog");
  const [plans, mt5Requests, mt5Accounts, eaCatalog, copyTraders, users] = await Promise.all([
    db.select().from(investmentPlansTable).orderBy(investmentPlansTable.id).limit(8),
    db.select().from(mt5RequestsTable).orderBy(desc(mt5RequestsTable.createdAt)).limit(8),
    db.select().from(mt5AccountsTable).orderBy(desc(mt5AccountsTable.createdAt)).limit(6),
    getEaCatalog(),
    db.select().from(copyTradersTable).orderBy(desc(copyTradersTable.createdAt)).limit(4),
    db.select({ id: usersTable.id, fullName: usersTable.fullName, email: usersTable.email }).from(usersTable),
  ]);

  const userMap = new Map(users.map(u => [u.id, u]));

  res.json({
    investmentPlans: plans.map(mapPlan),
    eaStrategies: eaCatalog.slice(0, 6),
    mt5Requests: mt5Requests.map(r => {
      const u = userMap.get(r.userId);
      return {
        id: r.id,
        userId: r.userId,
        userName: u?.fullName || `User #${r.userId}`,
        type: r.type,
        status: r.status,
        profitSharingPercent: r.profitSharingPercent,
        details: r.details,
        createdAt: r.createdAt,
      };
    }),
    mt5Accounts: mt5Accounts.map(a => {
      const u = userMap.get(a.userId);
      return {
        id: a.id,
        userId: a.userId,
        userName: u?.fullName || `User #${a.userId}`,
        accountNumber: a.accountNumber,
        broker: a.broker,
        serverName: a.serverName,
        balance: Number(a.balance || 0),
        equity: Number(a.equity || 0),
        profit: Number(a.profit || 0),
        status: a.status,
      };
    }),
    copyTraders: copyTraders.map(t => ({
      id: t.id,
      name: t.name,
      roi: Number(t.roi),
      monthlyRoi: Number(t.monthlyRoi),
      followers: t.followers,
      winRate: Number(t.winRate),
      riskLevel: t.riskLevel,
      status: t.status,
    })),
  });
});

// ── Dashboard Stats ──────────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
  const period = parseStaffStatsPeriod(String(req.query.period || "present"));
  const fromParam = typeof req.query.from === "string" ? req.query.from : undefined;
  const toParam = typeof req.query.to === "string" ? req.query.to : undefined;
  const { from, to, label: periodLabel } = resolveStatsDateRange(period, fromParam, toParam);
  const isPresent = period === "present";
  const todayRange = resolveStatsDateRange("day");
  const investorIds = (await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "user"))).map(u => u.id);

  const [
    roleCounts,
    operationalCounts,
    txns,
    investments,
    todayWithdrawalTxns,
    todayMaturityInvestments,
    totalProfitAllTime,
    ledgerAudit,
  ] = await Promise.all([
    fetchUserRoleCounts(),
    fetchOperationalCounts(),
    fetchTransactionsForStats(from, to),
    fetchInvestmentsForStats(from, to),
    fetchTodayWithdrawalTransactions(todayRange.from!, todayRange.to!),
    fetchInvestmentsMaturingBetween(todayRange.from!, todayRange.to!),
    isPresent ? sumInvestmentProfit() : Promise.resolve(0),
    computePlatformLedgerAudit({ from, to, investorIds, mode: isPresent ? "present" : "period" }),
  ]);

  const financials = isPresent
    ? { totalProfit: totalProfitAllTime }
    : await computePlatformFinancialStats({ transactions: txns, investments, from, to });

  const todayPayments = await computeTodayPayments({
    transactions: todayWithdrawalTxns,
    investments: todayMaturityInvestments,
  });

  const fx = await getExchangeRates();
  const todayPaymentsInr = todayPayments.todayPaymentsUsd * fx.USD_INR;
  const fiatAudit = ledgerAudit.fiat;
  const safeNum = (n: number) => (Number.isFinite(n) ? n : 0);
  const platformFiatBalance = safeNum(ledgerAudit.present.availableFiat);
  const platformCryptoBalance = safeNum(ledgerAudit.present.availableCrypto);
  const activeInvested = safeNum(ledgerAudit.present.activeInvested);

  res.json({
    period,
    periodLabel,
    periodFrom: from?.toISOString() ?? null,
    periodTo: to?.toISOString() ?? null,
    platformFiatBalance,
    platformFiatBalanceInr: usdToInr(platformFiatBalance, fx),
    platformCryptoBalance,
    platformCryptoBalanceInr: usdToInr(platformCryptoBalance, fx),
    activeInvested,
    activeInvestedInr: usdToInr(activeInvested, fx),
    walletAvailable: ledgerAudit.present.walletAvailable,
    walletAvailableInr: usdToInr(ledgerAudit.present.walletAvailable, fx),
    totalAssets: ledgerAudit.present.totalAssets,
    totalAssetsInr: usdToInr(ledgerAudit.present.totalAssets, fx),
    ledgerAudit,
    fiatBalanceAudit: {
      ...fiatAudit,
      periodNetFlowInr: usdToInr(fiatAudit.periodNetFlow, fx),
      periodDepositsInr: usdToInr(fiatAudit.periodDeposits, fx),
      periodWithdrawalsInr: usdToInr(fiatAudit.periodWithdrawals, fx),
      periodMaturityProfitsInr: usdToInr(fiatAudit.periodMaturityProfits, fx),
    },
    totalUsers: roleCounts.totalUsers,
    superAdmins: roleCounts.superAdmins,
    supportAgents: roleCounts.supportAgents,
    managers: roleCounts.managers,
    investors: roleCounts.investors,
    pendingMt5Requests: operationalCounts.pendingMt5Requests,
    forwardedMt5Requests: operationalCounts.forwardedMt5Requests,
    activeEASubscriptions: operationalCounts.activeEASubscriptions,
    totalDeposits: fiatAudit.periodDeposits + ledgerAudit.crypto.periodDeposits,
    totalWithdrawals: fiatAudit.periodWithdrawals + ledgerAudit.crypto.periodWithdrawals,
    netFunds: (fiatAudit.periodDeposits + ledgerAudit.crypto.periodDeposits)
      - (fiatAudit.periodWithdrawals + ledgerAudit.crypto.periodWithdrawals),
    totalFiatDeposits: fiatAudit.periodDeposits,
    totalFiatWithdrawals: fiatAudit.periodWithdrawals,
    totalCryptoDeposits: ledgerAudit.crypto.periodDeposits,
    totalCryptoWithdrawals: ledgerAudit.crypto.periodWithdrawals,
    totalInvestments: isPresent ? activeInvested : fiatAudit.periodInvestmentOut,
    activeInvestmentCount: ledgerAudit.present.activeInvestmentCount,
    totalProfit: financials.totalProfit,
    todayLabel: todayPayments.todayLabel,
    todayPaymentsUsd: todayPayments.todayPaymentsUsd,
    todayPaymentsInr,
    todayWithdrawalRequestsUsd: todayPayments.todayWithdrawalRequestsUsd,
    todayWithdrawalRequestsCount: todayPayments.todayWithdrawalRequestsCount,
    todayMaturityPayoutsUsd: todayPayments.todayMaturityPayoutsUsd,
    todayMaturityCount: todayPayments.todayMaturityCount,
    pendingTransactions: operationalCounts.pendingTransactions,
    pendingKyc: operationalCounts.pendingKyc,
    openTickets: operationalCounts.openTickets,
    activeAlgoSubscriptions: operationalCounts.activeAlgoSubscriptions,
    exchangeRates: {
      USD_INR: fx.USD_INR,
      USD_EUR: fx.USD_EUR,
      updatedAt: fx.updatedAt,
      source: fx.source,
    },
  });
  } catch (err) {
    if (respondSchemaDrift(res, err)) return;
    throw err;
  }
});

router.get("/investments", async (_req, res) => {
  const [investments, users] = await Promise.all([
    db.select().from(investmentsTable).orderBy(desc(investmentsTable.createdAt)).limit(500),
    db.select({ id: usersTable.id, email: usersTable.email, fullName: usersTable.fullName, role: usersTable.role }).from(usersTable),
  ]);
  const userMap = new Map(users.map(u => [u.id, u]));
  res.json(investments.map(i => {
    const u = userMap.get(i.userId);
    return {
      id: i.id, userId: i.userId, userName: u?.fullName || "Unknown", userEmail: u?.email || "",
      userRole: u?.role || "user", type: i.type, planName: i.planName,
      amount: Number(i.amount), currency: i.currency, profit: Number(i.profit),
      profitPercent: Number(i.profitPercent), status: i.status,
      maturityDate: i.maturityDate, createdAt: i.createdAt,
    };
  }));
});

router.get("/algo-subscriptions", async (_req, res) => {
  const [subs, users, strategies] = await Promise.all([
    db.select().from(algoSubscriptionsTable).orderBy(desc(algoSubscriptionsTable.createdAt)).limit(500),
    db.select({ id: usersTable.id, email: usersTable.email, fullName: usersTable.fullName, role: usersTable.role }).from(usersTable),
    db.select().from(algoStrategiesTable),
  ]);
  const userMap = new Map(users.map(u => [u.id, u]));
  const stratMap = new Map(strategies.map(s => [s.id, s]));
  res.json(subs.map(s => {
    const u = userMap.get(s.userId);
    const strat = stratMap.get(s.strategyId);
    return {
      id: s.id, userId: s.userId, userName: u?.fullName || "Unknown", userEmail: u?.email || "",
      userRole: u?.role || "user", strategyId: s.strategyId, strategyName: strat?.name || `Strategy #${s.strategyId}`,
      active: s.active, createdAt: s.createdAt,
    };
  }));
});

router.patch("/algo-subscriptions/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { active } = req.body;
  if (typeof active !== "boolean") {
    res.status(400).json({ error: "active (boolean) is required" });
    return;
  }
  const [updated] = await db.update(algoSubscriptionsTable)
    .set({ active })
    .where(eq(algoSubscriptionsTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Subscription not found" }); return; }
  res.json(updated);
});

// ── Manage All Users ─────────────────────────────────────────────────────────
router.get("/users", async (req, res) => {
  const roleFilter = typeof req.query.role === "string" ? req.query.role : undefined;
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  const filtered = roleFilter ? users.filter(u => u.role === roleFilter) : users;
  res.json(filtered.map(mapUser));
});

router.get("/users/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(mapUser(user));
});

router.get("/users/:id/full", async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user id" }); return; }
  const full = req.query.full === "true" || req.query.full === "1";
  const { getUserFullDetail } = await import("../helpers/userFullDetailService");
  const detail = await getUserFullDetail(id, { full });
  if (!detail) { res.status(404).json({ error: "User not found" }); return; }
  res.json(detail);
});

router.post("/users", validateBody(CreateStaffUserBody), async (req, res) => {
  const { email, password, fullName, phone, role, managerId, kycStatus } = getValidatedBody<{
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role?: "user" | "manager" | "support" | "admin" | "superadmin";
    managerId?: number;
    kycStatus?: "pending" | "submitted" | "verified" | "rejected";
  }>(req);
  const userRole = role || "user";
  try {
    const { assertCanAssignRole, assertCanSetPassword } = await import("../helpers/credentialPolicy");
    const viewerRole = (req as any).user?.role ?? "";
    assertCanAssignRole(viewerRole, userRole);
    assertCanSetPassword(viewerRole);
  } catch (err: any) {
    res.status(403).json({ error: err.message });
    return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    email: email.toLowerCase(),
    passwordHash,
    fullName,
    phone: phone || null,
    role: userRole,
    kycStatus: kycStatus || "pending",
    managerId: managerId ? Number(managerId) : null,
    referralCode: generateReferralCode(),
  }).returning();
  res.status(201).json(mapUser(user));
});

// ── Support team accounts ───────────────────────────────────────────────────
router.get("/support-team", async (_req, res) => {
  const agents = await db.select().from(usersTable).where(eq(usersTable.role, "support")).orderBy(desc(usersTable.createdAt));
  res.json(agents.map(mapUser));
});

router.get("/support-team/candidates", async (req, res) => {
  const q = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  const eligible = users
    .filter(u =>
      u.isActive &&
      (u.role === "user" || u.role === "manager") &&
      (!q ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        String(u.id).includes(q))
    )
    .slice(0, 50);
  res.json(eligible.map(mapUser));
});

router.post("/support-team", validateBody(CreateSupportAgentBody), async (req, res) => {
  const body = getValidatedBody<{
    userId?: number;
    email?: string;
    password?: string;
    fullName?: string;
    phone?: string;
  }>(req);
  const { userId, email, password, fullName, phone } = body;

  if (userId != null) {
    const id = userId;
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (existing.role === "support") {
      res.status(409).json({ error: "User is already on the support team" });
      return;
    }
    if (existing.role === "superadmin") {
      res.status(400).json({ error: "Super admin accounts cannot be added to the support team" });
      return;
    }
    if (!existing.isActive) {
      res.status(400).json({ error: "Account is inactive — reactivate before adding to support" });
      return;
    }
    const [agent] = await db.update(usersTable).set({
      role: "support",
      kycStatus: "verified",
      managerId: null,
    }).where(eq(usersTable.id, id)).returning();
    res.json(mapUser(agent!));
    return;
  }

  if (!email || !password || !fullName) {
    res.status(400).json({ error: "email, password, and fullName are required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [agent] = await db.insert(usersTable).values({
    email: email.toLowerCase(),
    passwordHash,
    fullName,
    phone: phone || null,
    role: "support",
    kycStatus: "verified",
    referralCode: generateReferralCode(),
  }).returning();
  res.status(201).json(mapUser(agent));
});

router.delete("/support-team/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!existing || existing.role !== "support") {
    res.status(404).json({ error: "Support agent not found" });
    return;
  }
  await db.update(usersTable).set({ role: "user" }).where(eq(usersTable.id, id));
  res.json({ message: "Support agent demoted to user" });
});

router.post("/users/:id/ban-login", validateBody(BanLoginBody), async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { reason } = getValidatedBody<{ reason?: string }>(req);
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "User not found" }); return; }
  if (existing.role === "superadmin") {
    res.status(400).json({ error: "Cannot ban a super admin account" });
    return;
  }
  const [user] = await db.update(usersTable).set({
    isActive: false,
    suspendReason: (reason && String(reason).trim()) || "Login banned by super admin",
  }).where(eq(usersTable.id, id)).returning();
  const actor = (req as any).user;
  const { logAudit } = await import("../helpers/audit");
  await logAudit({
    req,
    userId: actor.userId,
    role: actor.role,
    action: "user_ban_login",
    entity: "user",
    entityId: id,
    details: { targetEmail: existing.email },
  });
  res.json({ message: "User banned from login", user: mapUser(user!) });
});

router.post("/users/:id/unban-login", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "User not found" }); return; }
  const [user] = await db.update(usersTable).set({
    isActive: true,
    suspendReason: null,
  }).where(eq(usersTable.id, id)).returning();
  const actor = (req as any).user;
  const { logAudit } = await import("../helpers/audit");
  await logAudit({
    req,
    userId: actor.userId,
    role: actor.role,
    action: "user_unban_login",
    entity: "user",
    entityId: id,
    details: { targetEmail: existing.email },
  });
  res.json({ message: "User login restored", user: mapUser(user!) });
});

router.patch("/users/bulk", validateBody(BulkUserUpdatesBody), async (req, res) => {
  const { userIds, updates } = getValidatedBody<{
    userIds: number[];
    updates?: Record<string, unknown>;
  }>(req);
  try {
    const { bulkUpdateUsers } = await import("../helpers/userBulkUpdate");
    const { mapUser } = await import("./auth");
    const result = await bulkUpdateUsers(userIds.map(Number), updates ?? {});
    res.json({
      message: `Updated ${result.updated} user(s)`,
      updated: result.updated,
      clientsReleased: result.clientsReleased,
      users: result.users.map(mapUser),
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Bulk update failed" });
  }
});

router.post("/users/:id/promote-manager", async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user id" }); return; }
  try {
    const { promoteUserToManager } = await import("../helpers/userAccessControl");
    const { mapUser } = await import("./auth");
    const user = await promoteUserToManager(id);
    res.json({ message: "User promoted to manager", user: mapUser(user) });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Promotion failed" });
  }
});

router.post("/users/:id/demote-manager", async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user id" }); return; }
  try {
    const { demoteManagerToUser } = await import("../helpers/userAccessControl");
    const { mapUser } = await import("./auth");
    const { user, clientsReleased } = await demoteManagerToUser(id);
    res.json({
      message: `Manager demoted. ${clientsReleased} client(s) reassigned to super admin pool.`,
      clientsReleased,
      user: mapUser(user),
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Demotion failed" });
  }
});

router.patch("/users/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "User not found" }); return; }

  const { email } = req.body;
  if (email && email.toLowerCase() !== existing.email) {
    const dup = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (dup.length > 0 && dup[0]!.id !== id) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }
  }

  if (existing.role === "superadmin" && req.body.role && req.body.role !== "superadmin") {
    const superAdmins = await db.select().from(usersTable).where(eq(usersTable.role, "superadmin"));
    if (superAdmins.length <= 1) {
      res.status(400).json({ error: "Cannot demote the only super admin account" });
      return;
    }
  }

  try {
    const viewerRole = (req as any).user?.role ?? "";
    const { assertCanAssignRole, assertCanSetPassword } = await import("../helpers/credentialPolicy");
    if (req.body.role) assertCanAssignRole(viewerRole, String(req.body.role));
    if (req.body.password) assertCanSetPassword(viewerRole);
    const { applyUserPatch } = await import("../helpers/userBulkUpdate");
    const { user, clientsReleased } = await applyUserPatch(id, req.body, existing);
    res.json({ ...mapUser(user), clientsReleased });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Update failed" });
  }
});

router.delete("/users/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "User not found" }); return; }
  if (existing.role === "superadmin") {
    const superAdmins = await db.select().from(usersTable).where(eq(usersTable.role, "superadmin"));
    if (superAdmins.length <= 1) {
      res.status(400).json({ error: "Cannot deactivate the only super admin account" });
      return;
    }
  }
  const [user] = await db.update(usersTable).set({ isActive: false }).where(eq(usersTable.id, id)).returning();
  res.json({ message: "Account deactivated", user: mapUser(user) });
});

/** @deprecated use PATCH /users/:id with role field */
router.patch("/users/:id/role", validateBody(PatchUserRoleBody), async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { role } = getValidatedBody<{ role: "user" | "manager" | "support" | "admin" | "superadmin" }>(req);
  const viewerRole = (req as any).user?.role ?? "";
  try {
    const { assertCanAssignRole } = await import("../helpers/credentialPolicy");
    assertCanAssignRole(viewerRole, role);
  } catch (err: any) {
    res.status(403).json({ error: err.message });
    return;
  }
  await db.update(usersTable).set({ role }).where(eq(usersTable.id, id));
  res.json({ message: "Role updated" });
});

// ── MT5 Relay Requests ───────────────────────────────────────────────────────
router.get("/mt5-requests", async (_req, res) => {
  const { listEnrichedMt5Requests } = await import("../helpers/mtLinkedAccountsService");
  res.json(await listEnrichedMt5Requests());
});

router.post("/mt5-requests/:id/forward", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { forwardMt5Request } = await import("../helpers/mtLinkedAccountsService");
  const result = await forwardMt5Request(id);
  if (!result.ok) { res.status(404).json({ error: result.error }); return; }
  res.json({ message: "Request forwarded" });
});

router.patch("/mt5-requests/:id/status", validateBody(Mt5RequestStatusBody), async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { status, externalResponse } = getValidatedBody<{
    status: "pending" | "forwarded" | "accepted" | "rejected" | "completed";
    externalResponse?: string;
  }>(req);
  const { updateMt5RequestStatus } = await import("../helpers/mtLinkedAccountsService");
  await updateMt5RequestStatus(id, status, externalResponse);
  res.json({ message: "Status updated" });
});

// ── External MT5 Endpoint Config ─────────────────────────────────────────────
router.get("/settings/mt5-endpoint", async (_req, res) => {
  const [setting] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, "mt5_external_endpoint")).limit(1);
  res.json({ endpoint: setting?.value || "" });
});

router.post("/settings/mt5-endpoint", validateBody(Mt5EndpointBody), async (req, res) => {
  const { endpoint = "" } = getValidatedBody<{ endpoint?: string }>(req);
  const existing = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, "mt5_external_endpoint")).limit(1);
  if (existing.length > 0) {
    await db.update(siteSettingsTable).set({ value: endpoint }).where(eq(siteSettingsTable.key, "mt5_external_endpoint"));
  } else {
    await db.insert(siteSettingsTable).values({ key: "mt5_external_endpoint", value: endpoint, label: "MT5 External Endpoint", category: "mt5" });
  }
  res.json({ message: "MT5 external endpoint updated" });
});

// ── MT4/MT5 request form field config ─────────────────────────────────────────
router.get("/settings/mt5-relay-form", async (_req, res) => {
  const { getMt5RelayFormConfig } = await import("../helpers/mt5RelayFormSettings");
  res.json(await getMt5RelayFormConfig());
});

router.post("/settings/mt5-relay-form", validateBody(SettingsJsonBody), async (req, res) => {
  const { saveMt5RelayFormConfig } = await import("../helpers/mt5RelayFormSettings");
  const saved = await saveMt5RelayFormConfig(req.body);
  res.json(saved);
});

// ── Trade Copier API Settings ─────────────────────────────────────────────────
router.get("/settings/trade-copier", async (_req, res) => {
  const { getTradeCopierConfig } = await import("../helpers/tradeCopier");
  const cfg = await getTradeCopierConfig();
  res.json({ ...cfg, password: cfg.password ? "••••••••" : "", apiKey: cfg.apiKey ? "••••••••" : "" });
});

router.post("/settings/trade-copier", validateBody(TradeCopierSettingsBody), async (req, res) => {
  const { saveTradeCopierConfig, getTradeCopierConfig } = await import("../helpers/tradeCopier");
  const existing = await getTradeCopierConfig();
  const { baseUrl, authType, apiKey, username, password, masterAccountId } = req.body;
  await saveTradeCopierConfig({
    baseUrl: baseUrl ?? existing.baseUrl,
    authType: authType ?? existing.authType,
    apiKey: (apiKey && apiKey !== "••••••••") ? apiKey : existing.apiKey,
    username: username ?? existing.username,
    password: (password && password !== "••••••••") ? password : existing.password,
    masterAccountId: masterAccountId ?? existing.masterAccountId,
  });
  res.json({ message: "Trade Copier API settings saved" });
});

router.post("/settings/trade-copier/test", async (_req, res) => {
  const { testTradeCopierConnection } = await import("../helpers/tradeCopier");
  const result = await testTradeCopierConnection();
  res.json(result);
});

router.get("/settings/trade-copier/slaves", async (_req, res) => {
  const { listSlaves } = await import("../helpers/tradeCopier");
  const result = await listSlaves();
  res.json(result);
});

// ── Windows VPS Bridge ────────────────────────────────────────────────────────
router.get("/settings/vps-bridge", async (_req, res) => {
  const { getVpsBridgeConfig } = await import("../helpers/vpsBridge");
  const cfg = await getVpsBridgeConfig();
  res.json({ ...cfg, apiKey: cfg.apiKey ? "••••••••" : "" });
});

router.post("/settings/vps-bridge", validateBody(VpsBridgeSettingsBody), async (req, res) => {
  const { getVpsBridgeConfig, saveVpsBridgeConfig } = await import("../helpers/vpsBridge");
  const existing = await getVpsBridgeConfig();
  const body = req.body || {};
  await saveVpsBridgeConfig({
    enabled: body.enabled ?? existing.enabled,
    host: body.host ?? existing.host,
    port: body.port ?? existing.port,
    basePath: body.basePath ?? existing.basePath,
    apiKey: (body.apiKey && body.apiKey !== "••••••••") ? body.apiKey : existing.apiKey,
    useHttps: body.useHttps ?? existing.useHttps,
    marketQuotesPath: body.marketQuotesPath ?? existing.marketQuotesPath,
    tradeCopierDumpPath: body.tradeCopierDumpPath ?? existing.tradeCopierDumpPath,
    notes: body.notes ?? existing.notes,
  });
  res.json({ message: "VPS bridge settings saved" });
});

router.post("/settings/vps-bridge/test", async (_req, res) => {
  const { testVpsBridgeConnection } = await import("../helpers/vpsBridge");
  res.json(await testVpsBridgeConnection());
});

// ── Market Data API ───────────────────────────────────────────────────────────
router.get("/settings/market-data", async (_req, res) => {
  const { getMarketDataConfig } = await import("../helpers/marketData");
  const cfg = await getMarketDataConfig();
  res.json({ ...cfg, customApiKey: cfg.customApiKey ? "••••••••" : "" });
});

router.post("/settings/market-data", validateBody(MarketDataSettingsBody), async (req, res) => {
  const { getMarketDataConfig, saveMarketDataConfig } = await import("../helpers/marketData");
  const existing = await getMarketDataConfig();
  const body = req.body || {};
  await saveMarketDataConfig({
    provider: body.provider ?? existing.provider,
    defaultPairs: body.defaultPairs ?? existing.defaultPairs,
    refreshSeconds: body.refreshSeconds ?? existing.refreshSeconds,
    customApiUrl: body.customApiUrl ?? existing.customApiUrl,
    customApiKey: (body.customApiKey && body.customApiKey !== "••••••••") ? body.customApiKey : existing.customApiKey,
  });
  res.json({ message: "Market data settings saved" });
});

router.post("/settings/market-data/test", async (_req, res) => {
  const { testMarketDataConnection } = await import("../helpers/marketData");
  res.json(await testMarketDataConnection());
});

// ── SMTP / Email ─────────────────────────────────────────────────────────────
router.get("/settings/smtp", async (_req, res) => {
  const { getSmtpConfigPublic } = await import("../helpers/smtpSettings");
  res.json(await getSmtpConfigPublic());
});

router.post("/settings/smtp", validateBody(SmtpSettingsBody), async (req, res) => {
  const { getSmtpConfig, saveSmtpConfig } = await import("../helpers/smtpSettings");
  const { resetMailTransporter } = await import("../helpers/mailer");
  const existing = await getSmtpConfig();
  const body = req.body || {};
  await saveSmtpConfig({
    enabled: body.enabled ?? existing.enabled,
    host: body.host ?? existing.host,
    port: body.port ?? existing.port,
    secure: body.secure ?? existing.secure,
    user: body.user ?? existing.user,
    pass: (body.pass && body.pass !== "••••••••") ? body.pass : existing.pass,
    from: body.from ?? existing.from,
    tlsRejectUnauthorized: body.tlsRejectUnauthorized ?? existing.tlsRejectUnauthorized,
  });
  resetMailTransporter();
  res.json({ message: "SMTP settings saved" });
});

router.post("/settings/smtp/test", validateBody(SmtpTestBody), async (req, res) => {
  const { testSmtpConnection } = await import("../helpers/smtpSettings");
  const { testTo } = getValidatedBody<{ testTo?: string }>(req);
  res.json(await testSmtpConnection(testTo));
});

router.get("/settings/support-inbox", async (_req, res) => {
  const { getSupportInboxConfigPublic } = await import("../helpers/supportInboxSettings");
  res.json(await getSupportInboxConfigPublic());
});

router.post("/settings/support-inbox", validateBody(SupportInboxSettingsBody), async (req, res) => {
  const { getSupportInboxConfig, saveSupportInboxConfig } = await import("../helpers/supportInboxSettings");
  const existing = await getSupportInboxConfig();
  const body: Record<string, unknown> = req.body || {};
  await saveSupportInboxConfig({
    enabled: (body.enabled as boolean | undefined) ?? existing.enabled,
    host: (body.host as string | undefined) ?? existing.host,
    port: (body.port as number | undefined) ?? existing.port,
    secure: (body.secure as boolean | undefined) ?? existing.secure,
    user: (body.user as string | undefined) ?? existing.user,
    pass: (body.pass && body.pass !== "••••••••") ? String(body.pass) : existing.pass,
    inboxAddress: (body.inboxAddress as string | undefined) ?? existing.inboxAddress,
    tlsRejectUnauthorized: (body.tlsRejectUnauthorized as boolean | undefined) ?? existing.tlsRejectUnauthorized,
  });
  res.json({ message: "Support inbox settings saved" });
});

router.post("/settings/support-inbox/test", async (_req, res) => {
  const { testSupportInboxConnection } = await import("../helpers/supportMailService");
  res.json(await testSupportInboxConnection());
});

router.get("/settings/email-communication", async (_req, res) => {
  const {
    getEmailCommunicationConfig,
    getEmailCommunicationSummary,
    EMAIL_PURPOSE_META,
    ALL_EMAIL_PURPOSES,
  } = await import("../helpers/emailCommunicationSettings");
  const [config, summary] = await Promise.all([
    getEmailCommunicationConfig(),
    getEmailCommunicationSummary(),
  ]);
  res.json({
    config,
    purposeMeta: EMAIL_PURPOSE_META,
    purposes: ALL_EMAIL_PURPOSES,
    summary,
    resolvedFrom: summary.resolvedFrom,
  });
});

router.post("/settings/email-communication", validateBody(SettingsJsonBody), async (req, res) => {
  const { saveEmailCommunicationConfig, defaultEmailCommunicationConfig } = await import("../helpers/emailCommunicationSettings");
  const body = req.body?.config || req.body;
  const base = defaultEmailCommunicationConfig();
  await saveEmailCommunicationConfig({
    identities: Array.isArray(body.identities) ? body.identities : base.identities,
    assignments: { ...base.assignments, ...(body.assignments || {}) },
    autoEmails: { ...base.autoEmails, ...(body.autoEmails || {}) },
  });
  res.json({ message: "Email communication settings saved" });
});

router.post("/settings/email-communication/test", validateBody(EmailCommunicationTestBody), async (req, res) => {
  const { purpose, testTo } = getValidatedBody<{ purpose: string; testTo: string }>(req);
  const { sendTestPurposeEmail, ALL_EMAIL_PURPOSES } = await import("../helpers/emailCommunicationSettings");
  if (!ALL_EMAIL_PURPOSES.includes(purpose as (typeof ALL_EMAIL_PURPOSES)[number])) {
    res.status(400).json({ error: "Valid purpose is required" });
    return;
  }
  res.json(await sendTestPurposeEmail(purpose as import("../helpers/emailCommunicationSettings").EmailPurpose, testTo));
});

router.get("/settings/otp-communication", async (_req, res) => {
  const {
    getOtpCommunicationConfig,
    sanitizeOtpConfigForClient,
    getOtpCommunicationSummary,
    DEFAULT_OTP_MESSAGE,
  } = await import("../helpers/otpCommunicationSettings");
  const config = await getOtpCommunicationConfig();
  res.json({
    config: sanitizeOtpConfigForClient(config),
    summary: await getOtpCommunicationSummary(),
    defaultMessage: DEFAULT_OTP_MESSAGE,
  });
});

router.post("/settings/otp-communication", async (req, res) => {
  const { saveOtpCommunicationConfig, defaultOtpCommunicationConfig } = await import("../helpers/otpCommunicationSettings");
  const body = req.body?.config || req.body || {};
  const base = defaultOtpCommunicationConfig();
  const current = await import("../helpers/otpCommunicationSettings").then(m => m.getOtpCommunicationConfig());

  const mergeSecret = (incoming: string, existing: string) => {
    const v = String(incoming || "").trim();
    if (!v || v.includes("•")) return existing;
    return v;
  };

  await saveOtpCommunicationConfig({
    email: { ...base.email, ...(body.email || {}) },
    sms: {
      ...base.sms,
      ...(body.sms || {}),
      apiKey: mergeSecret(body.sms?.apiKey, current.sms.apiKey),
      accountSid: mergeSecret(body.sms?.accountSid, current.sms.accountSid),
    },
    whatsapp: {
      ...base.whatsapp,
      ...(body.whatsapp || {}),
      accessToken: mergeSecret(body.whatsapp?.accessToken, current.whatsapp.accessToken),
    },
    firebase: {
      ...base.firebase,
      ...(body.firebase || {}),
      apiKey: mergeSecret(body.firebase?.apiKey, current.firebase.apiKey),
    },
    preferredMobileChannel: body.preferredMobileChannel || base.preferredMobileChannel,
    login2faSms: body.login2faSms ?? base.login2faSms,
    login2faWhatsapp: body.login2faWhatsapp ?? base.login2faWhatsapp,
    otpMessageTemplate: body.otpMessageTemplate || base.otpMessageTemplate,
  });
  res.json({ message: "OTP communication settings saved" });
});

router.post("/settings/otp-communication/test", async (req, res) => {
  const { channel, phone, email, name } = req.body || {};
  const { createEmailOtp } = await import("../helpers/authHelpers");
  const { sendOtpViaChannel } = await import("../helpers/otpDeliveryService");
  const ch = channel === "whatsapp" ? "whatsapp" : channel === "sms" ? "sms" : "email";
  if (ch !== "email" && !phone) {
    res.status(400).json({ error: "phone is required for SMS/WhatsApp test" });
    return;
  }
  if (ch === "email" && !email) {
    res.status(400).json({ error: "email is required for email OTP test" });
    return;
  }
  const target = ch === "email" ? email.toLowerCase() : `sms:${phone}`;
  const { otp } = await createEmailOtp({ email: target, purpose: "registration", ttlMinutes: 10 });
  const result = await sendOtpViaChannel({
    channel: ch,
    email,
    phone,
    name: name || "Test User",
    otp,
    purpose: "Test",
    ttlMinutes: 10,
  });
  res.json(result);
});

router.get("/settings/mail-desk", async (_req, res) => {
  const { getSupportMailDeskConfig } = await import("../helpers/supportMailDeskSettings");
  res.json(await getSupportMailDeskConfig());
});

router.post("/settings/mail-desk", async (req, res) => {
  const { saveSupportMailDeskConfig } = await import("../helpers/supportMailDeskSettings");
  res.json(await saveSupportMailDeskConfig(req.body || {}));
});

router.get("/settings/mail-desk/templates", async (_req, res) => {
  const { listSupportMailTemplates } = await import("../helpers/supportMailTemplatesService");
  res.json(await listSupportMailTemplates(false));
});

router.post("/settings/mail-desk/templates", async (req, res) => {
  const { saveSupportMailTemplate } = await import("../helpers/supportMailTemplatesService");
  res.json(await saveSupportMailTemplate(req.body || {}));
});

router.delete("/settings/mail-desk/templates/:id", async (req, res) => {
  const { deleteSupportMailTemplate } = await import("../helpers/supportMailTemplatesService");
  const id = parseInt(String(req.params.id));
  await deleteSupportMailTemplate(id);
  res.json({ message: "Template deleted" });
});

// ── EA Subscriptions Overview ────────────────────────────────────────────────
router.get("/ea-subscriptions", async (_req, res) => {
  const { ensureDemoEaSubscriptions } = await import("../helpers/demoEaSubscriptions.js");
  await ensureDemoEaSubscriptions();
  const subs = await db.select().from(eaSubscriptionsTable).orderBy(desc(eaSubscriptionsTable.createdAt));
  res.json(subs.map(s => ({
    ...s,
    strategyName: EA_CATALOG_NAMES.get(s.strategyId) ?? `Strategy #${s.strategyId}`,
    expiresAt: s.expiresAt.toISOString(),
    createdAt: s.createdAt.toISOString(),
  })));
});

router.patch("/ea-subscriptions/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { status } = req.body;
  if (!status) { res.status(400).json({ error: "status is required" }); return; }
  await db.update(eaSubscriptionsTable).set({ status }).where(eq(eaSubscriptionsTable.id, id));
  res.json({ message: "Subscription updated" });
});

// ── Investment Plans (full CRUD) ─────────────────────────────────────────────

router.get("/plans", async (_req, res) => {
  const plans = await db.select().from(investmentPlansTable).orderBy(investmentPlansTable.id);
  res.json(plans.map(mapPlan));
});

router.post("/plans", async (req, res) => {
  const { name, description, minAmount, maxAmount, roiPercent, durationDays, currency, isActive, category,
    planType, profitFrequency, capitalReturn, autoRenewal, earlyWithdrawalPenalty, features, maxInvestors } = req.body;
  if (!name || minAmount == null || maxAmount == null || roiPercent == null || !durationDays) {
    res.status(400).json({ error: "name, minAmount, maxAmount, roiPercent, durationDays are required" }); return;
  }
  const [plan] = await db.insert(investmentPlansTable).values({
    name, description: description || null,
    minAmount: String(minAmount), maxAmount: String(maxAmount),
    roiPercent: String(roiPercent), durationDays,
    currency: currency || "USD", isActive: isActive !== false,
    category: category || "starter",
    planType: planType || "monthly",
    profitFrequency: profitFrequency || "monthly",
    capitalReturn: capitalReturn || "yes",
    autoRenewal: autoRenewal || false,
    earlyWithdrawalPenalty: String(earlyWithdrawalPenalty || 0),
    features: features ? JSON.stringify(features) : null,
    maxInvestors: maxInvestors || null,
  }).returning();
  res.status(201).json(mapPlan(plan));
});

router.patch("/plans/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const body = req.body;
  const updates: Record<string, unknown> = {};
  for (const key of ["name", "description", "durationDays", "currency", "isActive", "category", "planType", "profitFrequency", "capitalReturn", "autoRenewal", "maxInvestors"]) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  for (const key of ["minAmount", "maxAmount", "roiPercent", "earlyWithdrawalPenalty"]) {
    if (body[key] !== undefined) updates[key] = String(body[key]);
  }
  if (body.features !== undefined) updates.features = JSON.stringify(body.features);
  const [plan] = await db.update(investmentPlansTable).set(updates).where(eq(investmentPlansTable.id, id)).returning();
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  res.json(mapPlan(plan));
});

router.delete("/plans/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [plan] = await db.delete(investmentPlansTable).where(eq(investmentPlansTable.id, id)).returning();
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  res.json({ message: "Plan deleted" });
});

// ── Copy Traders (full CRUD) ─────────────────────────────────────────────────
function mapCopyTrader(t: typeof copyTradersTable.$inferSelect) {
  return {
    id: t.id, name: t.name, avatarUrl: t.avatarUrl, bio: t.bio,
    roi: Number(t.roi), monthlyRoi: Number(t.monthlyRoi), followers: t.followers,
    winRate: Number(t.winRate), totalTrades: t.totalTrades, status: t.status,
    minInvestment: Number(t.minInvestment), riskLevel: t.riskLevel,
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/copy-traders", async (_req, res) => {
  const traders = await db.select().from(copyTradersTable).orderBy(desc(copyTradersTable.createdAt));
  res.json(traders.map(mapCopyTrader));
});

router.post("/copy-traders", async (req, res) => {
  const { name, avatarUrl, bio, roi, monthlyRoi, winRate, totalTrades, status, minInvestment, riskLevel } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const [trader] = await db.insert(copyTradersTable).values({
    name, avatarUrl: avatarUrl || null, bio: bio || null,
    roi: String(roi ?? 0), monthlyRoi: String(monthlyRoi ?? 0),
    winRate: String(winRate ?? 0), totalTrades: totalTrades ?? 0,
    status: status || "active", minInvestment: String(minInvestment ?? 100),
    riskLevel: riskLevel || "medium",
  }).returning();
  res.status(201).json(mapCopyTrader(trader));
});

router.patch("/copy-traders/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const body = req.body;
  const updates: Record<string, unknown> = {};
  for (const key of ["name", "avatarUrl", "bio", "totalTrades", "status", "riskLevel"]) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  for (const key of ["roi", "monthlyRoi", "winRate", "minInvestment"]) {
    if (body[key] !== undefined) updates[key] = String(body[key]);
  }
  const [trader] = await db.update(copyTradersTable).set(updates).where(eq(copyTradersTable.id, id)).returning();
  if (!trader) { res.status(404).json({ error: "Trader not found" }); return; }
  res.json(mapCopyTrader(trader));
});

router.delete("/copy-traders/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [trader] = await db.delete(copyTradersTable).where(eq(copyTradersTable.id, id)).returning();
  if (!trader) { res.status(404).json({ error: "Trader not found" }); return; }
  res.json({ message: "Copy trader deleted" });
});

// ── EA Strategy Catalog (full CRUD) ──────────────────────────────────────────
router.get("/ea-catalog", async (_req, res) => {
  const { getEaCatalog } = await import("../helpers/eaCatalog");
  res.json(await getEaCatalog());
});

router.post("/ea-catalog", async (req, res) => {
  const { getEaCatalog, saveEaCatalog } = await import("../helpers/eaCatalog");
  const catalog = await getEaCatalog();
  const item = req.body;
  if (!item.name || !item.type) { res.status(400).json({ error: "name and type are required" }); return; }
  const maxId = catalog.reduce((m, s) => Math.max(m, s.id || 0), 1000);
  const newItem = { ...item, id: item.id || maxId + 1 };
  catalog.push(newItem);
  await saveEaCatalog(catalog);
  res.status(201).json(newItem);
});

router.patch("/ea-catalog/:id", async (req, res) => {
  const { getEaCatalog, saveEaCatalog } = await import("../helpers/eaCatalog");
  const id = parseInt(String(req.params.id));
  const catalog = await getEaCatalog();
  const idx = catalog.findIndex(s => s.id === id);
  if (idx < 0) { res.status(404).json({ error: "Strategy not found" }); return; }
  catalog[idx] = { ...catalog[idx], ...req.body, id };
  await saveEaCatalog(catalog);
  res.json(catalog[idx]);
});

router.delete("/ea-catalog/:id", async (req, res) => {
  const { getEaCatalog, saveEaCatalog } = await import("../helpers/eaCatalog");
  const id = parseInt(String(req.params.id));
  const catalog = await getEaCatalog();
  const next = catalog.filter(s => s.id !== id);
  if (next.length === catalog.length) { res.status(404).json({ error: "Strategy not found" }); return; }
  await saveEaCatalog(next);
  res.json({ message: "Strategy removed from catalog" });
});

// ── Algo Strategies (DB catalog — full CRUD) ─────────────────────────────────
function mapAlgoStrategy(s: typeof algoStrategiesTable.$inferSelect) {
  return {
    id: s.id, name: s.name, description: s.description,
    roi: Number(s.roi), riskLevel: s.riskLevel, subscribers: s.subscribers,
    status: s.status, minInvestment: Number(s.minInvestment), currency: s.currency,
    priceMonthly: Number(s.priceMonthly),
    priceQuarterly: Number(s.priceQuarterly),
    priceBiannual: Number(s.priceBiannual),
    priceAnnual: Number(s.priceAnnual),
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/algo-strategies", async (_req, res) => {
  const strategies = await db.select().from(algoStrategiesTable).orderBy(desc(algoStrategiesTable.createdAt));
  res.json(strategies.map(mapAlgoStrategy));
});

router.post("/algo-strategies", async (req, res) => {
  const { name, description, roi, riskLevel, status, minInvestment, currency, priceMonthly, priceQuarterly, priceBiannual, priceAnnual } = req.body;
  if (!name || !description) { res.status(400).json({ error: "name and description are required" }); return; }
  const [strategy] = await db.insert(algoStrategiesTable).values({
    name,
    description,
    roi: String(roi ?? 0),
    riskLevel: riskLevel || "medium",
    status: status || "active",
    minInvestment: String(minInvestment ?? 100),
    currency: currency || "USD",
    priceMonthly: String(priceMonthly ?? 99),
    priceQuarterly: String(priceQuarterly ?? 249),
    priceBiannual: String(priceBiannual ?? 449),
    priceAnnual: String(priceAnnual ?? 799),
  }).returning();
  res.status(201).json(mapAlgoStrategy(strategy));
});

router.patch("/algo-strategies/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const body = req.body;
  const updates: Record<string, unknown> = {};
  for (const key of ["name", "description", "riskLevel", "status", "currency"]) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  for (const key of ["roi", "minInvestment", "priceMonthly", "priceQuarterly", "priceBiannual", "priceAnnual"]) {
    if (body[key] !== undefined) updates[key] = String(body[key]);
  }
  const [strategy] = await db.update(algoStrategiesTable).set(updates).where(eq(algoStrategiesTable.id, id)).returning();
  if (!strategy) { res.status(404).json({ error: "Strategy not found" }); return; }
  res.json(mapAlgoStrategy(strategy));
});

router.delete("/algo-strategies/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [strategy] = await db.delete(algoStrategiesTable).where(eq(algoStrategiesTable.id, id)).returning();
  if (!strategy) { res.status(404).json({ error: "Strategy not found" }); return; }
  res.json({ message: "Algo strategy deleted" });
});

// ── MT4/MT5 Linked Accounts (user submissions + staff review) ─────────────────
router.get("/mt5-accounts", async (_req, res) => {
  const { listEnrichedMtAccounts } = await import("../helpers/mtLinkedAccountsService");
  res.json(await listEnrichedMtAccounts());
});

router.patch("/mt5-accounts/:id/review", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { status } = req.body;
  if (!["active", "inactive", "pending_review"].includes(status)) {
    res.status(400).json({ error: "status must be active, inactive, or pending_review" });
    return;
  }
  const { reviewMtAccount } = await import("../helpers/mtLinkedAccountsService");
  const account = await reviewMtAccount(id, status);
  if (!account) { res.status(404).json({ error: "Account not found" }); return; }
  res.json(account);
});

router.post("/mt5-accounts", async (req, res) => {
  const { userId, accountNumber, broker, serverName, platform, password, status, balance, equity, profit, managerId } = req.body;
  if (!userId || !accountNumber || !broker) {
    res.status(400).json({ error: "userId, accountNumber, and broker are required" });
    return;
  }
  if (!serverName) {
    res.status(400).json({ error: "serverName is required" });
    return;
  }
  const uid = parseInt(String(userId));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, uid)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  let account;
  if (password) {
    try {
      account = await linkMtTradingAccount(uid, {
        accountNumber: String(accountNumber),
        broker: String(broker),
        serverName: String(serverName),
        platform: platform === "mt4" ? "mt4" : "mt5",
        tradingPassword: String(password),
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to link account" });
      return;
    }
  } else {
    const [created] = await db.insert(mt5AccountsTable).values({
      userId: uid,
      accountNumber: String(accountNumber),
      broker: String(broker),
      serverName: String(serverName),
      platform: platform === "mt4" ? "mt4" : "mt5",
      status: status || "pending_review",
      balance: balance != null ? String(balance) : undefined,
      equity: equity != null ? String(equity) : undefined,
      profit: profit != null ? String(profit) : undefined,
      managerId: managerId ? parseInt(String(managerId)) : null,
    }).returning();
    account = created;
  }

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (balance != null) updates.balance = String(balance);
  if (equity != null) updates.equity = String(equity);
  if (profit != null) updates.profit = String(profit);
  if (managerId != null) updates.managerId = managerId ? parseInt(String(managerId)) : null;
  if (Object.keys(updates).length > 0) {
    const [updated] = await db.update(mt5AccountsTable).set(updates).where(eq(mt5AccountsTable.id, account.id)).returning();
    if (updated) account = updated;
  }

  res.status(201).json({
    ...mapAccount(account),
    userName: user.fullName,
    userEmail: user.email,
    userRole: user.role,
  });
});

router.patch("/mt5-accounts/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const body = req.body;
  const [existing] = await db.select().from(mt5AccountsTable).where(eq(mt5AccountsTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Account not found" }); return; }

  const updates: Record<string, unknown> = {};
  for (const key of ["broker", "serverName", "status", "managerId"]) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  if (body.platform) updates.platform = body.platform === "mt4" ? "mt4" : "mt5";
  if (body.accountNumber) updates.accountNumber = String(body.accountNumber);
  for (const key of ["balance", "equity", "profit"]) {
    if (body[key] !== undefined) updates[key] = String(body[key]);
  }
  if (body.password) {
    const { encryptSensitive } = await import("../helpers/encryption");
    updates.passwordEnc = encryptSensitive(String(body.password));
  }
  if (body.userId) {
    const uid = parseInt(String(body.userId));
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, uid)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    updates.userId = uid;
  }

  const [account] = await db.update(mt5AccountsTable).set(updates).where(eq(mt5AccountsTable.id, id)).returning();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, account.userId)).limit(1);
  res.json({
    ...mapAccount(account),
    userName: user?.fullName,
    userEmail: user?.email,
    userRole: user?.role,
  });
});

router.delete("/mt5-accounts/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [account] = await db.delete(mt5AccountsTable).where(eq(mt5AccountsTable.id, id)).returning();
  if (!account) { res.status(404).json({ error: "Account not found" }); return; }
  res.json({ message: "Account deleted" });
});

// ── Institutional Partners (home page) ───────────────────────────────────────
router.get("/partners", async (_req, res) => {
  const { getPartnersConfig } = await import("../helpers/partnersCatalog");
  res.json(await getPartnersConfig());
});

router.patch("/partners/title", async (req, res) => {
  const { title } = req.body;
  if (!title || typeof title !== "string") {
    res.status(400).json({ error: "title is required" });
    return;
  }
  const { updatePartnersTitle } = await import("../helpers/partnersCatalog");
  res.json(await updatePartnersTitle(title));
});

router.post("/partners", async (req, res) => {
  const { name, logoUrl, websiteUrl, sortOrder, isActive } = req.body;
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const { createPartner } = await import("../helpers/partnersCatalog");
  const partner = await createPartner({
    name,
    logoUrl,
    websiteUrl,
    sortOrder: sortOrder ?? 0,
    isActive: isActive !== false,
  });
  res.status(201).json(partner);
});

router.patch("/partners/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { name, logoUrl, websiteUrl, sortOrder, isActive } = req.body;
  const { updatePartner } = await import("../helpers/partnersCatalog");
  const partner = await updatePartner(id, { name, logoUrl, websiteUrl, sortOrder, isActive });
  if (!partner) {
    res.status(404).json({ error: "Partner not found" });
    return;
  }
  res.json(partner);
});

router.delete("/partners/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { deletePartner } = await import("../helpers/partnersCatalog");
  const deleted = await deletePartner(id);
  if (!deleted) {
    res.status(404).json({ error: "Partner not found" });
    return;
  }
  res.json({ message: "Partner deleted" });
});

// ── Service visibility (homepage + investor nav) ───────────────────────────
router.get("/service-visibility", async (_req, res) => {
  const { getServiceVisibility } = await import("../helpers/serviceVisibility");
  res.json({ services: await getServiceVisibility() });
});

router.patch("/service-visibility", async (req, res) => {
  const { updateServiceVisibility } = await import("../helpers/serviceVisibility");
  const services = Array.isArray(req.body?.services) ? req.body.services : [];
  res.json({ services: await updateServiceVisibility(services) });
});

// ── About Kuber Quant (home page) ────────────────────────────────────────────
router.get("/about", async (_req, res) => {
  const { getCompanyAboutConfig, ABOUT_CATEGORY_LABELS } = await import("../helpers/companyAbout");
  res.json({ ...await getCompanyAboutConfig(), categoryLabels: ABOUT_CATEGORY_LABELS });
});

router.patch("/about/meta", async (req, res) => {
  const { sectionTitle, intro, footerDescription } = req.body || {};
  const { updateCompanyAboutMeta } = await import("../helpers/companyAbout");
  res.json(await updateCompanyAboutMeta({ sectionTitle, intro, footerDescription }));
});

router.post("/about/items", async (req, res) => {
  const { title, category } = req.body || {};
  if (!title || typeof title !== "string") {
    res.status(400).json({ error: "title is required" });
    return;
  }
  const { createAboutItem } = await import("../helpers/companyAbout");
  const item = await createAboutItem(req.body);
  res.status(201).json(item);
});

router.patch("/about/items/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { updateAboutItem } = await import("../helpers/companyAbout");
  const item = await updateAboutItem(id, req.body || {});
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  res.json(item);
});

router.delete("/about/items/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { deleteAboutItem } = await import("../helpers/companyAbout");
  const deleted = await deleteAboutItem(id);
  if (!deleted) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  res.json({ message: "Item deleted" });
});

// ── Crypto Exchange ───────────────────────────────────────────────────────────
router.get("/exchange/rates", async (req, res) => {
  try {
    const { listAllExchangeRates } = await import("../helpers/exchangeService");
    const fiat = String(req.query.fiat || "INR").toUpperCase();
    res.json(await listAllExchangeRates(fiat));
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to load exchange rates" });
  }
});

router.post("/exchange/rates/sync", async (_req, res) => {
  const { syncExchangeRatesFromCryptoGateways, listAllExchangeRates } = await import("../helpers/exchangeService");
  await syncExchangeRatesFromCryptoGateways();
  res.json(await listAllExchangeRates("INR"));
});

router.put("/exchange/rates", async (req, res) => {
  try {
    const { saveExchangeRates } = await import("../helpers/exchangeService");
    const rates = Array.isArray(req.body?.rates) ? req.body.rates : req.body;
    if (!Array.isArray(rates)) {
      res.status(400).json({ error: "rates array required" });
      return;
    }
    res.json(await saveExchangeRates(rates));
  } catch (err: any) {
    const message = err?.message || "Failed to save exchange rates";
    if (/buy_price_inr|sell_price_inr|buy_enabled|sell_enabled|column/.test(message)) {
      res.status(500).json({
        error: "Database schema is out of date. Run pnpm db:push on the server, then restart the API.",
      });
      return;
    }
    res.status(500).json({ error: message });
  }
});

router.get("/exchange/orders", async (req, res) => {
  const { listAllExchangeOrders } = await import("../helpers/exchangeService");
  const status = String(req.query.status || "all");
  res.json(await listAllExchangeOrders(status));
});

router.get("/exchange/orders/:id", async (req, res) => {
  const { getExchangeOrderWithContext } = await import("../helpers/exchangeService");
  const order = await getExchangeOrderWithContext(Number(req.params.id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(order);
});

router.post("/exchange/orders/:id/complete", validateBody(ExchangeOrderAdminNotesBody), async (req, res) => {
  const { completeExchangeOrder } = await import("../helpers/exchangeService");
  const { WalletError } = await import("../helpers/walletService");
  const adminId = (req as any).user.userId;
  const { adminNotes } = getValidatedBody<{ adminNotes?: string }>(req);
  try {
    res.json(await completeExchangeOrder(Number(req.params.id), adminId, adminNotes));
  } catch (err) {
    if (err instanceof WalletError) {
      res.status(400).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});

router.post("/exchange/orders/:id/reject", validateBody(ExchangeOrderRejectBody), async (req, res) => {
  const { rejectExchangeOrder } = await import("../helpers/exchangeService");
  const { WalletError } = await import("../helpers/walletService");
  const adminId = (req as any).user.userId;
  const { reason } = getValidatedBody<{ reason?: string }>(req);
  try {
    res.json(await rejectExchangeOrder(Number(req.params.id), adminId, reason));
  } catch (err) {
    if (err instanceof WalletError) {
      res.status(400).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});

router.get("/partner-keys/scopes", (_req, res) => {
  res.json({ scopes: PARTNER_SCOPES });
});

router.get("/partner-keys/webhook-events", (_req, res) => {
  const events: N8nEventType[] = [
    "user.registered", "deposit.submitted", "deposit.approved", "withdrawal.submitted",
    "withdrawal.approved", "kyc.submitted", "kyc.approved", "kyc.rejected",
    "investment.created", "ticket.created", "promoter.application", "promoter.approved", "promoter.rejected",
  ];
  res.json({ events });
});

router.get("/partner-keys", async (_req, res) => {
  res.json(await listPartnerApiKeys());
});

router.post("/partner-keys", async (req, res) => {
  const { name, scopes, webhookUrl, webhookSecret, webhookEvents } = req.body;
  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const createdBy = (req as any).user.userId;
  const result = await createPartnerApiKey({
    name,
    scopes: Array.isArray(scopes) ? scopes : [],
    webhookUrl,
    webhookSecret,
    webhookEvents: Array.isArray(webhookEvents) ? webhookEvents : [],
    createdBy,
  });
  res.status(201).json(result);
});

router.patch("/partner-keys/:id", async (req, res) => {
  const id = Number(req.params.id);
  const updated = await updatePartnerApiKey(id, req.body);
  if (!updated) {
    res.status(404).json({ error: "Partner key not found" });
    return;
  }
  res.json(updated);
});

router.delete("/partner-keys/:id", async (req, res) => {
  await deletePartnerApiKey(Number(req.params.id));
  res.json({ message: "Partner key revoked" });
});

router.get("/analytics/cohorts", async (req, res) => {
  const { computeCohortAnalytics } = await import("../helpers/cohortAnalyticsService");
  const months = Math.min(Number(req.query.months) || 12, 24);
  res.json(await computeCohortAnalytics(months));
});

export default router;
