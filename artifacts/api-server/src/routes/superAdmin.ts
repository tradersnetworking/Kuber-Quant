import { Router } from "express";
import {
  db, usersTable, mt5RequestsTable, eaSubscriptionsTable, siteSettingsTable,
  investmentPlansTable, copyTradersTable, transactionsTable, investmentsTable,
  kycRecordsTable, ticketsTable, algoSubscriptionsTable, algoStrategiesTable,
  mt5AccountsTable,
} from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { requireAuth, requireSuperAdmin } from "../middlewares/auth";
import { mapPlan } from "./plans";
import { mapUser } from "./auth";
import { linkMtTradingAccount } from "../helpers/mtAccountLink";
import { mapAccount } from "./mt5";

const router = Router();

function generateReferralCode(): string {
  return "KQ" + randomBytes(3).toString("hex").toUpperCase();
}

router.use(requireAuth, requireSuperAdmin);

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
router.get("/stats", async (_req, res) => {
  const [users, mt5Requests, eaSubs, txns, investments, kycs, tickets, algoSubs] = await Promise.all([
    db.select().from(usersTable),
    db.select().from(mt5RequestsTable).orderBy(desc(mt5RequestsTable.createdAt)),
    db.select().from(eaSubscriptionsTable),
    db.select().from(transactionsTable),
    db.select().from(investmentsTable),
    db.select().from(kycRecordsTable),
    db.select().from(ticketsTable),
    db.select().from(algoSubscriptionsTable),
  ]);

  const admins    = users.filter(u => u.role === "admin").length;
  const managers  = users.filter(u => u.role === "manager").length;
  const investors = users.filter(u => u.role === "user").length;
  const pending   = mt5Requests.filter(r => r.status === "pending").length;
  const forwarded = mt5Requests.filter(r => r.status === "forwarded").length;
  const activeEA  = eaSubs.filter(s => s.status === "active").length;

  const deposits = txns.filter(t => t.type === "deposit" && t.status === "approved");
  const withdrawals = txns.filter(t => t.type === "withdrawal" && t.status === "approved");
  const pendingTxns = txns.filter(t => t.status === "pending");
  const activeInvestments = investments.filter(i => i.status === "active");

  res.json({
    totalUsers: users.length, admins, managers, investors,
    pendingMt5Requests: pending, forwardedMt5Requests: forwarded, activeEASubscriptions: activeEA,
    totalDeposits: deposits.reduce((s, t) => s + Number(t.amount), 0),
    totalWithdrawals: withdrawals.reduce((s, t) => s + Number(t.amount), 0),
    netFunds: deposits.reduce((s, t) => s + Number(t.amount), 0) - withdrawals.reduce((s, t) => s + Number(t.amount), 0),
    totalInvestments: investments.reduce((s, i) => s + Number(i.amount), 0),
    activeInvestmentCount: activeInvestments.length,
    totalProfit: investments.reduce((s, i) => s + Number(i.profit), 0),
    pendingTransactions: pendingTxns.length,
    pendingKyc: kycs.filter(k => k.status === "submitted").length,
    openTickets: tickets.filter(t => t.status === "open").length,
    activeAlgoSubscriptions: algoSubs.filter(s => s.active).length,
  });
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
  const { getUserFullDetail } = await import("../helpers/userFullDetailService");
  const detail = await getUserFullDetail(id);
  if (!detail) { res.status(404).json({ error: "User not found" }); return; }
  res.json(detail);
});

router.post("/users", async (req, res) => {
  const { email, password, fullName, phone, role, managerId, kycStatus } = req.body;
  if (!email || !password || !fullName) {
    res.status(400).json({ error: "email, password, and fullName are required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  const userRole = role || "user";
  if (!["user", "manager", "admin", "superadmin"].includes(userRole)) {
    res.status(400).json({ error: "Invalid role" });
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

router.patch("/users/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const {
    email, fullName, phone, role, kycStatus, balanceFiat, balanceCrypto,
    isActive, managerId, password, isPromoter, promoterCommissionType, suspendReason,
  } = req.body;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "User not found" }); return; }

  if (email && email.toLowerCase() !== existing.email) {
    const dup = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (dup.length > 0 && dup[0]!.id !== id) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }
  }

  const updates: Record<string, unknown> = {};
  if (email !== undefined) updates.email = email.toLowerCase();
  if (fullName !== undefined) updates.fullName = fullName;
  if (phone !== undefined) updates.phone = phone || null;
  if (role !== undefined) {
    if (!["user", "manager", "support", "admin", "superadmin"].includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }
    updates.role = role;
  }
  if (kycStatus !== undefined) updates.kycStatus = kycStatus;
  if (balanceFiat !== undefined) updates.balanceFiat = String(balanceFiat);
  if (balanceCrypto !== undefined) updates.balanceCrypto = String(balanceCrypto);
  if (isActive !== undefined) updates.isActive = isActive;
  if (isPromoter !== undefined) {
    updates.isPromoter = !!isPromoter;
    if (isPromoter && !existing.isPromoter) updates.promoterEnabledAt = new Date();
  }
  if (promoterCommissionType !== undefined) updates.promoterCommissionType = promoterCommissionType || null;
  if (suspendReason !== undefined) updates.suspendReason = suspendReason || null;
  if (managerId !== undefined) updates.managerId = managerId;
  if (password) {
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }
    updates.passwordHash = await bcrypt.hash(password, 10);
  }

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  res.json(mapUser(user));
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
router.patch("/users/:id/role", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { role } = req.body;
  if (!["user", "manager", "admin", "superadmin"].includes(role)) {
    res.status(400).json({ error: "Invalid role" }); return;
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

router.patch("/mt5-requests/:id/status", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { status, externalResponse } = req.body;
  const { updateMt5RequestStatus } = await import("../helpers/mtLinkedAccountsService");
  await updateMt5RequestStatus(id, status, externalResponse);
  res.json({ message: "Status updated" });
});

// ── External MT5 Endpoint Config ─────────────────────────────────────────────
router.get("/settings/mt5-endpoint", async (_req, res) => {
  const [setting] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, "mt5_external_endpoint")).limit(1);
  res.json({ endpoint: setting?.value || "" });
});

router.post("/settings/mt5-endpoint", async (req, res) => {
  const endpoint = String(req.body.endpoint ?? "");
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

router.post("/settings/mt5-relay-form", async (req, res) => {
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

router.post("/settings/trade-copier", async (req, res) => {
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

router.post("/settings/vps-bridge", async (req, res) => {
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

router.post("/settings/market-data", async (req, res) => {
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

router.post("/settings/smtp", async (req, res) => {
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

router.post("/settings/smtp/test", async (req, res) => {
  const { testSmtpConnection } = await import("../helpers/smtpSettings");
  const testTo = typeof req.body?.testTo === "string" ? req.body.testTo : undefined;
  res.json(await testSmtpConnection(testTo));
});

router.get("/settings/support-inbox", async (_req, res) => {
  const { getSupportInboxConfigPublic } = await import("../helpers/supportInboxSettings");
  res.json(await getSupportInboxConfigPublic());
});

router.post("/settings/support-inbox", async (req, res) => {
  const { getSupportInboxConfig, saveSupportInboxConfig } = await import("../helpers/supportInboxSettings");
  const existing = await getSupportInboxConfig();
  const body = req.body || {};
  await saveSupportInboxConfig({
    enabled: body.enabled ?? existing.enabled,
    host: body.host ?? existing.host,
    port: body.port ?? existing.port,
    secure: body.secure ?? existing.secure,
    user: body.user ?? existing.user,
    pass: (body.pass && body.pass !== "••••••••") ? body.pass : existing.pass,
    inboxAddress: body.inboxAddress ?? existing.inboxAddress,
    tlsRejectUnauthorized: body.tlsRejectUnauthorized ?? existing.tlsRejectUnauthorized,
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

router.post("/settings/email-communication", async (req, res) => {
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

router.post("/settings/email-communication/test", async (req, res) => {
  const { purpose, testTo } = req.body || {};
  const { sendTestPurposeEmail, ALL_EMAIL_PURPOSES } = await import("../helpers/emailCommunicationSettings");
  if (!purpose || !ALL_EMAIL_PURPOSES.includes(purpose)) {
    res.status(400).json({ error: "Valid purpose is required" });
    return;
  }
  if (!testTo || typeof testTo !== "string") {
    res.status(400).json({ error: "testTo email is required" });
    return;
  }
  res.json(await sendTestPurposeEmail(purpose, testTo));
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
  const subs = await db.select().from(eaSubscriptionsTable).orderBy(desc(eaSubscriptionsTable.createdAt));
  res.json(subs);
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
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/algo-strategies", async (_req, res) => {
  const strategies = await db.select().from(algoStrategiesTable).orderBy(desc(algoStrategiesTable.createdAt));
  res.json(strategies.map(mapAlgoStrategy));
});

router.post("/algo-strategies", async (req, res) => {
  const { name, description, roi, riskLevel, status, minInvestment, currency } = req.body;
  if (!name || !description) { res.status(400).json({ error: "name and description are required" }); return; }
  const [strategy] = await db.insert(algoStrategiesTable).values({
    name,
    description,
    roi: String(roi ?? 0),
    riskLevel: riskLevel || "medium",
    status: status || "active",
    minInvestment: String(minInvestment ?? 100),
    currency: currency || "USD",
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
  for (const key of ["roi", "minInvestment"]) {
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

export default router;
