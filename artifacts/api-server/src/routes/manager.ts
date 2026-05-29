import { Router } from "express";
import {
  db, usersTable, ticketsTable, ticketRepliesTable, kycRecordsTable, transactionsTable,
  investmentsTable, walletLedgerTable, referralEarningsTable, roiPayoutsTable,
} from "@workspace/db";
import { eq, desc, inArray } from "@workspace/db/orm";
import { requireAuth, requireManagerOrAdmin } from "../middlewares/auth";
import { mapUser } from "./auth";
import { canViewRole, filterUsersByViewerRole } from "../helpers/roleHierarchy";
import { mapKyc } from "./kyc";
import { mapTicket } from "./tickets";
import { getUserFullDetail } from "../helpers/userFullDetailService";
import { createStaffEscalation, STAFF_ESCALATION_CATEGORY } from "../helpers/staffEscalationService";
import { computePlatformFinancialStats, parseQueryDateRange } from "../helpers/platformStatsService";
import { getExchangeRates, usdToInr } from "../helpers/exchangeRateService";
import {
  fetchTransactionsForUserIds,
  fetchInvestmentsForUserIds,
  fetchRecentTransactionsForUserIds,
  countPendingTransactionsForUserIds,
  countKycSubmittedForUserIds,
  countOpenTicketsForUserIds,
  sumTransactionVolumeForUserIds,
} from "../helpers/platformDashboardCounts";
import { validateBody, getValidatedBody } from "../middlewares/validate";
import { ManagerReportBody } from "../lib/routeBodySchemas";

const router = Router();

function mapTransaction(t: any, client?: { email?: string; fullName?: string }) {
  return {
    id: t.id, userId: t.userId, userEmail: client?.email || null,
    userName: client?.fullName || null, type: t.type,
    amount: Number(t.amount), currency: t.currency, status: t.status,
    paymentMethod: t.paymentMethod || null, txHash: t.txHash || null,
    notes: t.notes || null, createdAt: t.createdAt.toISOString(),
  };
}

function summarizeTransactions(txns: { type: string; amount: string | number; status: string }[]) {
  let totalDeposits = 0, totalWithdrawals = 0, pendingDeposits = 0, pendingWithdrawals = 0;
  for (const t of txns) {
    const amt = Number(t.amount);
    if (t.type === "deposit") {
      if (t.status === "approved") totalDeposits += amt;
      else if (t.status === "pending") pendingDeposits += amt;
    }
    if (t.type === "withdrawal") {
      if (t.status === "approved") totalWithdrawals += amt;
      else if (t.status === "pending") pendingWithdrawals += amt;
    }
  }
  return { totalDeposits, totalWithdrawals, pendingDeposits, pendingWithdrawals };
}

async function getManagerClient(req: any, clientId: number) {
  const { userId, role } = req.user;
  const [client] = await db.select().from(usersTable).where(eq(usersTable.id, clientId)).limit(1);
  if (!client || !canViewRole(role, client.role)) return null;
  if (role === "manager" && client.managerId !== userId) return null;
  return client;
}

router.get("/stats", requireAuth, requireManagerOrAdmin, async (req, res) => {
  const { userId, role } = (req as any).user;
  const { from, to, label: periodLabel } = parseQueryDateRange({
    period: req.query.period as string | undefined,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  });

  const allClients = await db.select().from(usersTable).where(eq(usersTable.managerId, userId));
  const clients = filterUsersByViewerRole(role, allClients);
  const clientIds = clients.map(c => c.id);

  if (clientIds.length === 0) {
    const fx = await getExchangeRates();
    res.json({
      totalClients: 0,
      pendingTickets: 0,
      pendingKyc: 0,
      pendingTransactions: 0,
      totalClientVolume: 0,
      periodLabel,
      fiatBalance: 0,
      fiatBalanceInr: 0,
      periodFiatDeposits: 0,
      periodFiatWithdrawals: 0,
      periodCryptoDeposits: 0,
      periodCryptoWithdrawals: 0,
      periodFiatDepositsInr: 0,
      periodFiatWithdrawalsInr: 0,
      periodCryptoDepositsInr: 0,
      periodCryptoWithdrawalsInr: 0,
      periodInvested: 0,
      periodInvestedInr: 0,
    });
    return;
  }

  const [
    pendingKyc,
    pendingTxns,
    openTickets,
    totalVolume,
    clientTxns,
    clientInvestments,
  ] = await Promise.all([
    countKycSubmittedForUserIds(clientIds),
    countPendingTransactionsForUserIds(clientIds),
    countOpenTicketsForUserIds(clientIds),
    sumTransactionVolumeForUserIds(clientIds),
    fetchTransactionsForUserIds(clientIds, from, to),
    fetchInvestmentsForUserIds(clientIds, from, to),
  ]);

  const financials = await computePlatformFinancialStats({
    transactions: clientTxns,
    investments: clientInvestments,
    from,
    to,
  });
  const fiatBalance = clients.reduce((s, c) => s + Number(c.balanceFiat || 0), 0);
  const fx = await getExchangeRates();

  res.json({
    totalClients: clients.length,
    pendingTickets: openTickets,
    pendingKyc,
    pendingTransactions: pendingTxns,
    totalClientVolume: totalVolume,
    periodLabel,
    fiatBalance,
    fiatBalanceInr: usdToInr(fiatBalance, fx),
    periodFiatDeposits: financials.totalFiatDeposits,
    periodFiatWithdrawals: financials.totalFiatWithdrawals,
    periodCryptoDeposits: financials.totalCryptoDeposits,
    periodCryptoWithdrawals: financials.totalCryptoWithdrawals,
    periodFiatDepositsInr: usdToInr(financials.totalFiatDeposits, fx),
    periodFiatWithdrawalsInr: usdToInr(financials.totalFiatWithdrawals, fx),
    periodCryptoDepositsInr: usdToInr(financials.totalCryptoDeposits, fx),
    periodCryptoWithdrawalsInr: usdToInr(financials.totalCryptoWithdrawals, fx),
    periodInvested: financials.totalInvestments,
    periodInvestedInr: usdToInr(financials.totalInvestments, fx),
  });
});

router.get("/clients", requireAuth, requireManagerOrAdmin, async (req, res) => {
  const { userId, role } = (req as any).user;
  const allClients = await db.select().from(usersTable)
    .where(eq(usersTable.managerId, userId))
    .orderBy(desc(usersTable.createdAt));
  const clients = filterUsersByViewerRole(role, allClients);
  const clientIds = clients.map(c => c.id);

  if (clientIds.length === 0) { res.json([]); return; }

  const allTxns = await db.select().from(transactionsTable)
    .where(inArray(transactionsTable.userId, clientIds));

  const txByUser = new Map<number, typeof allTxns>();
  for (const id of clientIds) txByUser.set(id, []);
  for (const t of allTxns) txByUser.get(t.userId)?.push(t);

  const txSummary = new Map<number, ReturnType<typeof summarizeTransactions>>();
  for (const id of clientIds) {
    txSummary.set(id, summarizeTransactions(txByUser.get(id) || []));
  }

  res.json(clients.map(c => ({
    ...mapUser(c),
    ...txSummary.get(c.id)!,
  })));
});

router.get("/clients/:id/full", requireAuth, requireManagerOrAdmin, async (req, res) => {
  const clientId = parseInt(String(req.params.id));
  if (isNaN(clientId)) { res.status(400).json({ error: "Invalid client id" }); return; }
  const client = await getManagerClient(req, clientId);
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }
  const detail = await getUserFullDetail(clientId, { transactionLimit: 200, investmentLimit: 100 });
  if (!detail) { res.status(404).json({ error: "Client not found" }); return; }
  res.json(detail);
});

router.post("/reports", requireAuth, requireManagerOrAdmin, validateBody(ManagerReportBody), async (req, res) => {
  const { userId: reporterUserId, role } = (req as any).user;
  const { subjectUserId, issueType, subject, message, priority } = getValidatedBody<{
    subjectUserId: number;
    issueType?: string;
    subject: string;
    message: string;
    priority?: "low" | "medium" | "high" | "urgent";
  }>(req);
  const clientId = subjectUserId;
  const client = await getManagerClient(req, clientId);
  if (!client) { res.status(403).json({ error: "Client not assigned to you" }); return; }
  const [reporter] = await db.select().from(usersTable).where(eq(usersTable.id, reporterUserId)).limit(1);
  try {
    const result = await createStaffEscalation({
      reporterUserId,
      reporterRole: role,
      reporterName: reporter?.fullName || reporter?.email || "Manager",
      subjectUserId: clientId,
      issueType: issueType?.trim() || "Client Issue",
      subject: subject.trim(),
      message: message.trim(),
      priority,
    });
    res.status(201).json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Failed to submit report" });
  }
});

router.get("/reports", requireAuth, requireManagerOrAdmin, async (req, res) => {
  const { userId } = (req as any).user;
  const myReplies = await db.select({ ticketId: ticketRepliesTable.ticketId })
    .from(ticketRepliesTable)
    .where(eq(ticketRepliesTable.userId, userId));
  const ticketIds = [...new Set(myReplies.map(r => r.ticketId))];
  if (ticketIds.length === 0) { res.json([]); return; }

  const tickets = await db.select().from(ticketsTable)
    .where(inArray(ticketsTable.id, ticketIds))
    .orderBy(desc(ticketsTable.createdAt));
  const escalations = tickets.filter(t => t.category === STAFF_ESCALATION_CATEGORY);

  const users = await db.select().from(usersTable);
  const userMap = new Map(users.map(u => [u.id, u]));
  res.json(await Promise.all(escalations.map(t => {
    const u = userMap.get(t.userId);
    return mapTicket(t, u?.email, u?.fullName);
  })));
});

router.get("/clients/:id", requireAuth, requireManagerOrAdmin, async (req, res) => {
  const clientId = parseInt(String(req.params.id));
  if (isNaN(clientId)) { res.status(400).json({ error: "Invalid client id" }); return; }

  const client = await getManagerClient(req, clientId);
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }

  const [txns, kycRows, investments, ledger, referralEarnings, roiPayouts] = await Promise.all([
    db.select().from(transactionsTable).where(eq(transactionsTable.userId, clientId)).orderBy(desc(transactionsTable.createdAt)),
    db.select().from(kycRecordsTable).where(eq(kycRecordsTable.userId, clientId)).orderBy(desc(kycRecordsTable.createdAt)),
    db.select().from(investmentsTable).where(eq(investmentsTable.userId, clientId)).orderBy(desc(investmentsTable.createdAt)),
    db.select().from(walletLedgerTable).where(eq(walletLedgerTable.userId, clientId)).orderBy(desc(walletLedgerTable.createdAt)),
    db.select().from(referralEarningsTable).where(eq(referralEarningsTable.referrerId, clientId)).orderBy(desc(referralEarningsTable.createdAt)),
    db.select().from(roiPayoutsTable).where(eq(roiPayoutsTable.userId, clientId)).orderBy(desc(roiPayoutsTable.createdAt)),
  ]);

  const txStats = summarizeTransactions(txns);
  const investmentProfit = investments.reduce((s, i) => s + Number(i.profit), 0);
  const investmentTotal = investments.reduce((s, i) => s + Number(i.amount), 0);
  const referralPaid = referralEarnings.filter(r => r.status === "paid").reduce((s, r) => s + Number(r.amount), 0);
  const roiTotal = roiPayouts.filter(r => r.status === "processed").reduce((s, r) => s + Number(r.amount), 0);

  res.json({
    user: mapUser(client),
    summary: {
      ...txStats,
      balanceFiat: Number(client.balanceFiat),
      balanceCrypto: Number(client.balanceCrypto),
      totalProfit: Number(client.totalProfit),
      referralEarnings: Number(client.referralEarnings),
      referralCount: client.referralCount || 0,
      investmentTotal,
      investmentProfit,
      referralPaid,
      roiTotal,
      activeInvestments: investments.filter(i => i.status === "active").length,
    },
    kyc: kycRows.length > 0 ? mapKyc(kycRows[0], client.email, client.fullName) : null,
    transactions: txns.map(t => mapTransaction(t, client)),
    investments: investments.map(i => ({
      id: i.id, type: i.type, planName: i.planName, amount: Number(i.amount),
      currency: i.currency, profit: Number(i.profit), profitPercent: Number(i.profitPercent),
      status: i.status, maturityDate: i.maturityDate?.toISOString() || null,
      createdAt: i.createdAt.toISOString(),
    })),
    walletLedger: ledger.map(l => ({
      id: l.id, type: l.type, amount: Number(l.amount), currency: l.currency,
      walletType: l.walletType, balanceBefore: Number(l.balanceBefore),
      balanceAfter: Number(l.balanceAfter), referenceType: l.referenceType || null,
      referenceId: l.referenceId || null, description: l.description || null,
      createdAt: l.createdAt.toISOString(),
    })),
    referralEarnings: referralEarnings.map(r => ({
      id: r.id, referredUserId: r.referredUserId, amount: Number(r.amount),
      currency: r.currency, status: r.status, createdAt: r.createdAt.toISOString(),
    })),
    roiPayouts: roiPayouts.map(r => ({
      id: r.id, investmentId: r.investmentId, amount: Number(r.amount),
      roiPercent: Number(r.roiPercent), status: r.status, planName: r.planName || null,
      note: r.note || null, processedAt: r.processedAt?.toISOString() || null,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

router.get("/kyc", requireAuth, requireManagerOrAdmin, async (req, res) => {
  const { userId, role } = (req as any).user;
  const allClients = await db.select().from(usersTable).where(eq(usersTable.managerId, userId));
  const clients = filterUsersByViewerRole(role, allClients);
  const clientIds = clients.map(c => c.id);

  if (clientIds.length === 0) { res.json([]); return; }

  const allKycs: any[] = [];
  for (const clientId of clientIds) {
    const kycs = await db.select().from(kycRecordsTable).where(eq(kycRecordsTable.userId, clientId));
    const client = clients.find(c => c.id === clientId);
    allKycs.push(...kycs.map(k => mapKyc(k, client?.email, client?.fullName)));
  }
  res.json(allKycs);
});

router.get("/tickets", requireAuth, requireManagerOrAdmin, async (req, res) => {
  const { userId, role } = (req as any).user;
  const allClients = await db.select().from(usersTable).where(eq(usersTable.managerId, userId));
  const clients = filterUsersByViewerRole(role, allClients);
  const clientIds = clients.map(c => c.id);

  if (clientIds.length === 0) { res.json([]); return; }

  const allTickets: any[] = [];
  for (const clientId of clientIds) {
    const tickets = await db.select().from(ticketsTable)
      .where(eq(ticketsTable.userId, clientId))
      .orderBy(desc(ticketsTable.createdAt));
    const client = clients.find(c => c.id === clientId);
    for (const t of tickets) {
      allTickets.push(await mapTicket(t, client?.email, client?.fullName));
    }
  }
  res.json(allTickets);
});

router.get("/transactions/upcoming", requireAuth, requireManagerOrAdmin, async (req, res) => {
  const { userId, role } = (req as any).user;
  const limit = Math.min(Number(req.query.limit) || 100, 200);
  const { listUpcomingForManagerClients } = await import("../helpers/upcomingTransactionsService");
  res.json(await listUpcomingForManagerClients(userId, role, limit));
});

router.get("/transactions", requireAuth, requireManagerOrAdmin, async (req, res) => {
  const { userId, role } = (req as any).user;
  const allClients = await db.select().from(usersTable).where(eq(usersTable.managerId, userId));
  const clients = filterUsersByViewerRole(role, allClients);
  const clientIds = clients.map(c => c.id);

  if (clientIds.length === 0) { res.json([]); return; }

  const allTxns: any[] = [];
  for (const clientId of clientIds) {
    const txns = await db.select().from(transactionsTable)
      .where(eq(transactionsTable.userId, clientId))
      .orderBy(desc(transactionsTable.createdAt));
    const client = clients.find(c => c.id === clientId);
    allTxns.push(...txns.map(t => mapTransaction(t, client)));
  }
  res.json(allTxns);
});

router.get("/analytics", requireAuth, requireManagerOrAdmin, async (req, res) => {
  const { userId, role } = (req as any).user;
  const allClients = await db.select().from(usersTable).where(eq(usersTable.managerId, userId));
  const clients = filterUsersByViewerRole(role, allClients);
  const clientIds = clients.map(c => c.id);
  const clientMap = new Map(clients.map(c => [c.id, c]));

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const now = new Date();
  const cashFlow: { day: string; deposits: number; withdrawals: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    cashFlow.push({ day: dayNames[d.getDay()], deposits: 0, withdrawals: 0 });
  }

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const [weekTxns, recentTxns] = clientIds.length
    ? await Promise.all([
      fetchTransactionsForUserIds(clientIds, weekStart, now),
      fetchRecentTransactionsForUserIds(clientIds, 8),
    ])
    : [[], []];

  for (const t of weekTxns) {
    if (t.status !== "approved") continue;
    const daysAgo = Math.floor((now.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysAgo < 0 || daysAgo > 6) continue;
    const idx = 6 - daysAgo;
    const amt = Number(t.amount);
    if (t.type === "deposit") cashFlow[idx].deposits += amt;
    if (t.type === "withdrawal") cashFlow[idx].withdrawals += amt;
  }

  const investorGrowth: { week: string; investors: number }[] = [];
  for (let w = 3; w >= 0; w--) {
    const rangeStart = new Date(now);
    rangeStart.setDate(rangeStart.getDate() - (w + 1) * 7);
    const rangeEnd = new Date(now);
    rangeEnd.setDate(rangeEnd.getDate() - w * 7);
    const count = clients.filter(c => c.createdAt >= rangeStart && c.createdAt < rangeEnd).length;
    investorGrowth.push({ week: `Wk${4 - w}`, investors: count });
  }

  const recentActivity = recentTxns.map(t => {
    const client = clientMap.get(t.userId);
    return {
      type: t.type,
      user: client?.fullName || client?.email || "Client",
      amount: t.type === "deposit" || t.type === "withdrawal" ? `$${Number(t.amount).toLocaleString()}` : null,
      status: t.status,
      time: t.createdAt.toISOString(),
    };
  });

  res.json({ cashFlow, investorGrowth, recentActivity });
});

router.post("/tickets/:id/reply", requireAuth, requireManagerOrAdmin, async (req, res) => {
  const { userId } = (req as any).user;
  const id = parseInt(String(req.params.id));
  const { message } = req.body;
  if (!message) { res.status(400).json({ error: "message is required" }); return; }

  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id)).limit(1);
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

  const clients = await db.select().from(usersTable).where(eq(usersTable.managerId, userId));
  const isManagerClient = clients.some(c => c.id === ticket.userId);
  const role = (req as any).user.role;
  if (role === "manager" && !isManagerClient) {
    res.status(403).json({ error: "Not authorized to reply to this ticket" });
    return;
  }

  await db.insert(ticketRepliesTable).values({ ticketId: id, userId, message, isAdmin: true });
  await db.update(ticketsTable).set({ status: "in_progress" }).where(eq(ticketsTable.id, id));
  res.json({ message: "Reply sent" });
});

// ── Read-only platform catalog (for client guidance) ─────────────────────────
router.get("/plans", requireAuth, requireManagerOrAdmin, async (_req, res) => {
  const { listInvestmentPlansCatalog } = await import("../helpers/catalogReadService");
  res.json(await listInvestmentPlansCatalog());
});

router.get("/staking-plans", requireAuth, requireManagerOrAdmin, async (_req, res) => {
  const { listStakingPlansCatalog } = await import("../helpers/catalogReadService");
  res.json(await listStakingPlansCatalog());
});

router.get("/copy-traders", requireAuth, requireManagerOrAdmin, async (_req, res) => {
  const { listCopyTradersCatalog } = await import("../helpers/catalogReadService");
  res.json(await listCopyTradersCatalog());
});

router.get("/algo-strategies", requireAuth, requireManagerOrAdmin, async (_req, res) => {
  const { listAlgoStrategiesCatalog } = await import("../helpers/catalogReadService");
  res.json(await listAlgoStrategiesCatalog());
});

router.get("/ea-catalog", requireAuth, requireManagerOrAdmin, async (_req, res) => {
  const { listEaStrategyCatalog } = await import("../helpers/catalogReadService");
  res.json(await listEaStrategyCatalog());
});

export default router;
