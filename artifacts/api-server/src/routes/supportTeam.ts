import { Router } from "express";
import {
  db, usersTable, ticketsTable, ticketRepliesTable, transactionsTable, kycRecordsTable,
  investmentsTable, algoSubscriptionsTable, algoStrategiesTable, eaSubscriptionsTable, roiPayoutsTable,
} from "@workspace/db";
import { eq, desc, or, ilike, inArray, and } from "@workspace/db/orm";
import { requireAuth, requireSupport } from "../middlewares/auth";
import { mapUser } from "./auth";
import { mapTicket } from "./tickets";
import { mapKyc } from "./kyc";
import { getUserFullDetail } from "../helpers/userFullDetailService";
import { createStaffEscalation, STAFF_ESCALATION_CATEGORY } from "../helpers/staffEscalationService";
import { sendTicketReplyNotification } from "../helpers/ticketAutoReplyService";
import { canViewRole, filterUsersByViewerRole, visibleRolesFor } from "../helpers/roleHierarchy";
import { mapTxn } from "./transactions";
import { parseQueryDateRange, inDateRange } from "../helpers/platformStatsService";
import { getPlatformLedger } from "../helpers/transactionLedgerService";
import { fetchSupportTicketStats } from "../helpers/platformDashboardCounts";
import { loadStaffTickets } from "../helpers/ticketListService";
import { validateBody, getValidatedBody } from "../middlewares/validate";
import { TicketReplyBody, TicketStatusBody, ManagerReportBody } from "../lib/routeBodySchemas";

const router = Router();

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

async function getViewableUser(id: number, viewerRole: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user || !canViewRole(viewerRole, user.role)) return null;
  return user;
}

router.get("/stats", requireAuth, requireSupport, async (_req, res) => {
  res.json(await fetchSupportTicketStats());
});

router.get("/tickets", requireAuth, requireSupport, async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const priority = typeof req.query.priority === "string" ? req.query.priority : undefined;
  res.json(await loadStaffTickets({ status, category, priority }));
});

router.get("/tickets/:id", requireAuth, requireSupport, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id)).limit(1);
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, ticket.userId)).limit(1);
  res.json(await mapTicket(ticket, user?.email, user?.fullName));
});

router.post("/tickets/:id/reply", requireAuth, requireSupport, validateBody(TicketReplyBody), async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { message } = getValidatedBody<{ message: string }>(req);
  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id)).limit(1);
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  const { userId } = (req as any).user;
  await db.insert(ticketRepliesTable).values({ ticketId: id, userId, message: message.trim(), isAdmin: true });
  if (ticket.status === "open") {
    await db.update(ticketsTable).set({ status: "in_progress" }).where(eq(ticketsTable.id, id));
  }
  const [updated] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id)).limit(1);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, updated!.userId)).limit(1);

  if (user?.email) {
    void sendTicketReplyNotification({
      ticketId: id,
      userEmail: user.email,
      userName: user.fullName || "",
      message: message.trim(),
    }).catch(() => {});
  }

  res.json(await mapTicket(updated!, user?.email, user?.fullName));
});

router.patch("/tickets/:id/status", requireAuth, requireSupport, validateBody(TicketStatusBody), async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { status } = getValidatedBody<{ status: "open" | "in_progress" | "resolved" | "closed" }>(req);
  const [ticket] = await db.update(ticketsTable).set({ status }).where(eq(ticketsTable.id, id)).returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, ticket.userId)).limit(1);
  res.json(await mapTicket(ticket, user?.email, user?.fullName));
});

router.post("/tickets/:id/close", requireAuth, requireSupport, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [ticket] = await db.update(ticketsTable).set({ status: "closed" }).where(eq(ticketsTable.id, id)).returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, ticket.userId)).limit(1);
  res.json(await mapTicket(ticket, user?.email, user?.fullName));
});

router.post("/tickets/:id/resolve", requireAuth, requireSupport, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [ticket] = await db.update(ticketsTable).set({ status: "resolved" }).where(eq(ticketsTable.id, id)).returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, ticket.userId)).limit(1);
  res.json(await mapTicket(ticket, user?.email, user?.fullName));
});

router.get("/managers", requireAuth, requireSupport, async (req, res) => {
  const viewerRole = (req as any).user.role as string;
  const allManagers = await db.select().from(usersTable)
    .where(eq(usersTable.role, "manager"))
    .orderBy(desc(usersTable.createdAt));
  const managers = filterUsersByViewerRole(viewerRole, allManagers);

  const managerIds = managers.map(m => m.id);
  const clientCounts = new Map<number, number>();
  if (managerIds.length) {
    const clients = await db.select({ id: usersTable.id, managerId: usersTable.managerId })
      .from(usersTable)
      .where(inArray(usersTable.managerId, managerIds));
    for (const c of clients) {
      if (c.managerId) clientCounts.set(c.managerId, (clientCounts.get(c.managerId) || 0) + 1);
    }
  }

  res.json(managers.map(m => ({
    ...mapUser(m),
    clientCount: clientCounts.get(m.id) || 0,
  })));
});

router.get("/managers/:id/clients", requireAuth, requireSupport, async (req, res) => {
  const viewerRole = (req as any).user.role as string;
  const managerId = parseInt(String(req.params.id), 10);
  if (isNaN(managerId)) { res.status(400).json({ error: "Invalid manager id" }); return; }

  const manager = await getViewableUser(managerId, viewerRole);
  if (!manager || manager.role !== "manager") {
    res.status(404).json({ error: "Manager not found" });
    return;
  }

  const allClients = await db.select().from(usersTable)
    .where(eq(usersTable.managerId, managerId))
    .orderBy(desc(usersTable.createdAt));
  const clients = filterUsersByViewerRole(viewerRole, allClients);
  const clientIds = clients.map(c => c.id);

  if (clientIds.length === 0) { res.json([]); return; }

  const allTxns = await db.select().from(transactionsTable)
    .where(inArray(transactionsTable.userId, clientIds));

  const txByUser = new Map<number, typeof allTxns>();
  for (const id of clientIds) txByUser.set(id, []);
  for (const t of allTxns) txByUser.get(t.userId)?.push(t);

  res.json(clients.map(c => ({
    ...mapUser(c),
    managerId,
    managerName: manager.fullName,
    ...summarizeTransactions(txByUser.get(c.id) || []),
  })));
});

router.get("/kyc", requireAuth, requireSupport, async (req, res) => {
  const viewerRole = (req as any).user.role as string;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const visibleRoles = visibleRolesFor(viewerRole);

  if (!visibleRoles.length) {
    res.json([]);
    return;
  }

  const conditions = [inArray(usersTable.role, visibleRoles)];
  if (status && status !== "all") {
    conditions.push(eq(kycRecordsTable.status, status as typeof kycRecordsTable.$inferSelect.status));
  }

  const rows = await db
    .select({
      kyc: kycRecordsTable,
      email: usersTable.email,
      fullName: usersTable.fullName,
      role: usersTable.role,
      managerId: usersTable.managerId,
    })
    .from(kycRecordsTable)
    .innerJoin(usersTable, eq(kycRecordsTable.userId, usersTable.id))
    .where(and(...conditions))
    .orderBy(desc(kycRecordsTable.createdAt));

  res.json(rows.map(({ kyc, email, fullName, role, managerId }) => ({
    ...mapKyc(kyc, email, fullName),
    userRole: role,
    managerId: managerId ?? null,
  })));
});

router.get("/users/lookup", requireAuth, requireSupport, async (req, res) => {
  const viewerRole = (req as any).user.role as string;
  const q = String(req.query.q || "").trim();
  if (!q) { res.status(400).json({ error: "q query param required" }); return; }
  const roleFilter = typeof req.query.role === "string" ? req.query.role : undefined;

  const users = await db.select().from(usersTable)
    .where(or(
      ilike(usersTable.email, `%${q}%`),
      ilike(usersTable.fullName, `%${q}%`),
    ))
    .limit(40);

  let filtered = filterUsersByViewerRole(viewerRole, users);
  if (roleFilter && roleFilter !== "all") {
    filtered = filtered.filter(u => u.role === roleFilter);
  }

  res.json(filtered.slice(0, 20).map(mapUser));
});

router.get("/users/:id/full", requireAuth, requireSupport, async (req, res) => {
  const viewerRole = (req as any).user.role as string;
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user id" }); return; }
  const user = await getViewableUser(id, viewerRole);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const detail = await getUserFullDetail(id, { transactionLimit: 200, investmentLimit: 100 });
  if (!detail) { res.status(404).json({ error: "User not found" }); return; }
  res.json(detail);
});

router.post("/reports", requireAuth, requireSupport, validateBody(ManagerReportBody), async (req, res) => {
  const { userId: reporterUserId, role } = (req as any).user;
  const { subjectUserId, issueType, subject, message, priority } = getValidatedBody<{
    subjectUserId: number;
    issueType?: string;
    subject: string;
    message: string;
    priority?: "low" | "medium" | "high" | "urgent";
  }>(req);
  const subjectId = subjectUserId;
  const subjectUser = await getViewableUser(subjectId, role);
  if (!subjectUser) {
    res.status(403).json({ error: "Cannot report on this user" });
    return;
  }
  const [reporter] = await db.select().from(usersTable).where(eq(usersTable.id, reporterUserId)).limit(1);
  try {
    const result = await createStaffEscalation({
      reporterUserId,
      reporterRole: role,
      reporterName: reporter?.fullName || reporter?.email || "Support Agent",
      subjectUserId: subjectId,
      issueType: issueType?.trim() || "Issue",
      subject: subject.trim(),
      message: message.trim(),
      priority,
    });
    res.status(201).json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Failed to submit report" });
  }
});

router.get("/reports", requireAuth, requireSupport, async (req, res) => {
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
  const userIds = [...new Set(escalations.map(t => t.userId))];
  const users = userIds.length
    ? await db.select().from(usersTable).where(inArray(usersTable.id, userIds))
    : [];
  const userMap = new Map(users.map(u => [u.id, u]));
  res.json(await Promise.all(escalations.map(t => {
    const u = userMap.get(t.userId);
    return mapTicket(t, u?.email, u?.fullName);
  })));
});

router.get("/users/:id/status", requireAuth, requireSupport, async (req, res) => {
  const viewerRole = (req as any).user.role as string;
  const id = parseInt(String(req.params.id));
  const user = await getViewableUser(id, viewerRole);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  let managerName: string | null = null;
  if (user.managerId) {
    const [manager] = await db.select({ fullName: usersTable.fullName, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, user.managerId)).limit(1);
    managerName = manager?.fullName || manager?.email || null;
  }

  const [kyc] = await db.select().from(kycRecordsTable).where(eq(kycRecordsTable.userId, id)).limit(1);
  const txns = await db.select().from(transactionsTable).where(eq(transactionsTable.userId, id)).orderBy(desc(transactionsTable.createdAt)).limit(100);
  const userTickets = await db.select().from(ticketsTable).where(eq(ticketsTable.userId, id)).orderBy(desc(ticketsTable.createdAt)).limit(25);

  res.json({
    user: mapUser(user),
    managerName,
    kyc: kyc ? mapKyc(kyc, user.email, user.fullName) : null,
    recentTransactions: txns.map(t => ({
      id: t.id, type: t.type, amount: Number(t.amount), currency: t.currency,
      status: t.status, paymentMethod: t.paymentMethod, createdAt: t.createdAt.toISOString(),
    })),
    recentTickets: await Promise.all(userTickets.map(t => mapTicket(t, user.email, user.fullName))),
  });
});

router.get("/transactions/upcoming", requireAuth, requireSupport, async (req, res) => {
  const viewerRole = (req as any).user.role as string;
  const limit = Math.min(Number(req.query.limit) || 200, 300);
  const { listUpcomingForPlatform } = await import("../helpers/upcomingTransactionsService");
  res.json(await listUpcomingForPlatform(viewerRole, limit));
});

router.get("/transactions", requireAuth, requireSupport, async (req, res) => {
  const viewerRole = (req as any).user.role as string;
  const { from, to } = parseQueryDateRange({
    period: req.query.period as string | undefined,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  });
  const txns = await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt));
  const users = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    fullName: usersTable.fullName,
    role: usersTable.role,
  }).from(usersTable);
  const userMap = new Map(users.map(u => [u.id, u]));
  res.json(txns
    .filter((t) => {
      const u = userMap.get(t.userId);
      return u ? canViewRole(viewerRole, u.role) : false;
    })
    .filter(t => inDateRange(t.createdAt, from, to))
    .map(t => {
      const u = userMap.get(t.userId);
      return {
        ...mapTxn(t, u?.email),
        userName: u?.fullName || null,
      };
    }));
});

router.get("/ledger", requireAuth, requireSupport, async (req, res) => {
  const viewerRole = (req as any).user.role as string;
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const offset = Number(req.query.offset) || 0;
  const typeParam = req.query.type as string | undefined;
  const types = typeParam && typeParam !== "all"
    ? typeParam.split(",").filter(Boolean) as ("deposit" | "withdrawal")[]
    : undefined;
  const { from, to, label: periodLabel } = parseQueryDateRange({
    period: req.query.period as string | undefined,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  });

  const allUsers = await db.select({ id: usersTable.id, role: usersTable.role }).from(usersTable);
  const visibleIds = allUsers.filter(u => canViewRole(viewerRole, u.role)).map(u => u.id);
  const entries = await getPlatformLedger({ userIds: visibleIds, types, limit, offset, from, to });
  res.json({ entries, total: entries.length, limit, offset, periodLabel });
});

router.get("/investments", requireAuth, requireSupport, async (req, res) => {
  const viewerRole = (req as any).user.role as string;
  const [investments, users] = await Promise.all([
    db.select().from(investmentsTable).orderBy(desc(investmentsTable.createdAt)).limit(500),
    db.select({ id: usersTable.id, email: usersTable.email, fullName: usersTable.fullName, role: usersTable.role }).from(usersTable),
  ]);
  const userMap = new Map(users.map(u => [u.id, u]));
  res.json(investments
    .filter(i => {
      const u = userMap.get(i.userId);
      return u ? canViewRole(viewerRole, u.role) : false;
    })
    .map(i => {
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

router.get("/algo-subscriptions", requireAuth, requireSupport, async (_req, res) => {
  const viewerRole = (_req as any).user.role as string;
  const [subs, users, strategies] = await Promise.all([
    db.select().from(algoSubscriptionsTable).orderBy(desc(algoSubscriptionsTable.createdAt)).limit(500),
    db.select({ id: usersTable.id, email: usersTable.email, fullName: usersTable.fullName, role: usersTable.role }).from(usersTable),
    db.select().from(algoStrategiesTable),
  ]);
  const userMap = new Map(users.map(u => [u.id, u]));
  const stratMap = new Map(strategies.map(s => [s.id, s]));
  res.json(subs
    .filter(s => {
      const u = userMap.get(s.userId);
      return u ? canViewRole(viewerRole, u.role) : false;
    })
    .map(s => {
      const u = userMap.get(s.userId);
      const strat = stratMap.get(s.strategyId);
      return {
        id: s.id, userId: s.userId, userName: u?.fullName || "Unknown", userEmail: u?.email || "",
        userRole: u?.role || "user", strategyId: s.strategyId, strategyName: strat?.name || `Strategy #${s.strategyId}`,
        active: s.active, createdAt: s.createdAt,
      };
    }));
});

router.get("/ea-subscriptions", requireAuth, requireSupport, async (_req, res) => {
  const viewerRole = (_req as any).user.role as string;
  const { ensureDemoEaSubscriptions } = await import("../helpers/demoEaSubscriptions.js");
  await ensureDemoEaSubscriptions();
  const [subs, users] = await Promise.all([
    db.select().from(eaSubscriptionsTable).orderBy(desc(eaSubscriptionsTable.createdAt)),
    db.select({ id: usersTable.id, email: usersTable.email, fullName: usersTable.fullName, role: usersTable.role }).from(usersTable),
  ]);
  const userMap = new Map(users.map(u => [u.id, u]));
  res.json(subs
    .filter(s => {
      const u = userMap.get(s.userId);
      return u ? canViewRole(viewerRole, u.role) : false;
    })
    .map(s => {
      const u = userMap.get(s.userId);
      return {
        id: s.id,
        userId: s.userId,
        userName: u?.fullName || "Unknown",
        userEmail: u?.email || "",
        userRole: u?.role || "user",
        strategyId: s.strategyId,
        strategyName: `Strategy #${s.strategyId}`,
        mtAccountNumber: s.mtAccountNumber,
        mtPlatform: s.mtPlatform,
        plan: s.plan,
        profitSharingPercent: s.profitSharingPercent != null ? Number(s.profitSharingPercent) : null,
        amount: s.amount != null ? Number(s.amount) : null,
        currency: s.currency,
        status: s.status,
        expiresAt: s.expiresAt.toISOString(),
        createdAt: s.createdAt.toISOString(),
      };
    }));
});

router.get("/roi/payouts", requireAuth, requireSupport, async (_req, res) => {
  const viewerRole = (_req as any).user.role as string;
  const [payouts, users] = await Promise.all([
    db.select().from(roiPayoutsTable).orderBy(desc(roiPayoutsTable.createdAt)).limit(200),
    db.select({ id: usersTable.id, email: usersTable.email, fullName: usersTable.fullName, role: usersTable.role }).from(usersTable),
  ]);
  const userMap = new Map(users.map(u => [u.id, u]));
  res.json(payouts
    .filter(p => {
      const u = userMap.get(p.userId);
      return u ? canViewRole(viewerRole, u.role) : false;
    })
    .map(p => {
      const u = userMap.get(p.userId);
      return {
        id: p.id,
        userId: p.userId,
        userName: u?.fullName || "Unknown",
        userEmail: u?.email || "",
        userRole: u?.role || "user",
        investmentId: p.investmentId,
        amount: Number(p.amount),
        roiPercent: Number(p.roiPercent),
        status: p.status,
        planName: p.planName,
        createdAt: p.createdAt.toISOString(),
      };
    }));
});

// ── Per-user finance & trading (lookup only — no platform-wide lists) ─────────

router.get("/users/:id/finance", requireAuth, requireSupport, async (req, res) => {
  const viewerRole = (req as any).user.role as string;
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user id" }); return; }
  const { getSupportUserFinance } = await import("../helpers/supportFinanceDataService");
  const data = await getSupportUserFinance(viewerRole, id);
  if (!data) { res.status(404).json({ error: "User not found" }); return; }
  res.json(data);
});

router.get("/exchange/orders/:id", requireAuth, requireSupport, async (req, res) => {
  const viewerRole = (req as any).user.role as string;
  const id = Number(req.params.id);
  const userId = req.query.userId != null ? Number(req.query.userId) : undefined;
  const { getSupportExchangeOrder } = await import("../helpers/supportFinanceDataService");
  const order = await getSupportExchangeOrder(viewerRole, id, userId);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  res.json(order);
});

// ── Read-only platform catalog (Platform Reference) ──────────────────────────
router.get("/plans", requireAuth, requireSupport, async (_req, res) => {
  const { listInvestmentPlansCatalog } = await import("../helpers/catalogReadService");
  res.json(await listInvestmentPlansCatalog());
});

router.get("/staking-plans", requireAuth, requireSupport, async (_req, res) => {
  const { listStakingPlansCatalog } = await import("../helpers/catalogReadService");
  res.json(await listStakingPlansCatalog());
});

router.get("/copy-traders", requireAuth, requireSupport, async (_req, res) => {
  const { listCopyTradersCatalog } = await import("../helpers/catalogReadService");
  res.json(await listCopyTradersCatalog());
});

router.get("/algo-strategies", requireAuth, requireSupport, async (_req, res) => {
  const { listAlgoStrategiesCatalog } = await import("../helpers/catalogReadService");
  res.json(await listAlgoStrategiesCatalog());
});

router.get("/ea-catalog", requireAuth, requireSupport, async (_req, res) => {
  const { listEaStrategyCatalog } = await import("../helpers/catalogReadService");
  res.json(await listEaStrategyCatalog());
});

export default router;
