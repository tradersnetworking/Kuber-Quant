import {
  db, usersTable, transactionsTable, investmentsTable,
  algoSubscriptionsTable, algoStrategiesTable, eaSubscriptionsTable, eaStrategiesTable,
  roiPayoutsTable,
} from "@workspace/db";
import { desc, eq } from "@workspace/db/orm";
import { canViewRole } from "./roleHierarchy";
import { mapTxn } from "../routes/transactions";
import { listEnrichedMtAccounts, listEnrichedMt5Requests } from "./mtLinkedAccountsService";
import { listAllExchangeOrders } from "./exchangeService";

async function assertSupportCanViewUser(viewerRole: string, userId: number) {
  const [user] = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    fullName: usersTable.fullName,
    role: usersTable.role,
  }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user || !canViewRole(viewerRole, user.role)) return null;
  return user;
}

/** Per-user finance & trading snapshot for support ticket resolution (read-only). */
export async function getSupportUserFinance(viewerRole: string, userId: number) {
  const user = await assertSupportCanViewUser(viewerRole, userId);
  if (!user) return null;

  const [
    txns,
    investments,
    algoSubs,
    eaSubs,
    payouts,
    mtAccounts,
    mtRequests,
    algoStrategies,
    eaStrategies,
  ] = await Promise.all([
    db.select().from(transactionsTable).where(eq(transactionsTable.userId, userId)).orderBy(desc(transactionsTable.createdAt)).limit(100),
    db.select().from(investmentsTable).where(eq(investmentsTable.userId, userId)).orderBy(desc(investmentsTable.createdAt)).limit(50),
    db.select().from(algoSubscriptionsTable).where(eq(algoSubscriptionsTable.userId, userId)).orderBy(desc(algoSubscriptionsTable.createdAt)).limit(50),
    db.select().from(eaSubscriptionsTable).where(eq(eaSubscriptionsTable.userId, userId)).orderBy(desc(eaSubscriptionsTable.createdAt)).limit(50),
    db.select().from(roiPayoutsTable).where(eq(roiPayoutsTable.userId, userId)).orderBy(desc(roiPayoutsTable.createdAt)).limit(50),
    listEnrichedMtAccounts().then(rows => rows.filter(a => a.userId === userId)),
    listEnrichedMt5Requests().then(rows => rows.filter(r => r.userId === userId)),
    db.select().from(algoStrategiesTable),
    db.select().from(eaStrategiesTable),
  ]);

  const algoMap = new Map(algoStrategies.map(s => [s.id, s]));
  const eaMap = new Map(eaStrategies.map(s => [s.id, s]));
  const exchangeOrders = (await listAllExchangeOrders("all")).filter(o => o.userId === userId);

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
    transactions: txns.map(t => ({
      ...mapTxn(t, user.email),
      userName: user.fullName,
    })),
    investments: investments.map(i => ({
      id: i.id,
      userId: i.userId,
      type: i.type,
      planName: i.planName,
      amount: Number(i.amount),
      currency: i.currency,
      profit: Number(i.profit),
      profitPercent: Number(i.profitPercent),
      status: i.status,
      maturityDate: i.maturityDate,
      createdAt: i.createdAt,
    })),
    algoSubscriptions: algoSubs.map(s => ({
      id: s.id,
      strategyId: s.strategyId,
      strategyName: algoMap.get(s.strategyId)?.name || `Strategy #${s.strategyId}`,
      active: s.active,
      createdAt: s.createdAt,
    })),
    eaSubscriptions: eaSubs.map(s => ({
      id: s.id,
      strategyId: s.strategyId,
      strategyName: eaMap.get(s.strategyId)?.name || `EA #${s.strategyId}`,
      mtAccountNumber: s.mtAccountNumber,
      mtPlatform: s.mtPlatform,
      plan: s.plan,
      status: s.status,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
    })),
    roiPayouts: payouts.map(p => ({
      id: p.id,
      investmentId: p.investmentId,
      amount: Number(p.amount),
      roiPercent: Number(p.roiPercent),
      status: p.status,
      planName: p.planName,
      note: p.note,
      processedAt: p.processedAt,
      createdAt: p.createdAt,
    })),
    mtAccounts,
    mtRequests,
    exchangeOrders,
  };
}

export async function getSupportExchangeOrder(viewerRole: string, orderId: number, expectedUserId?: number) {
  const { getExchangeOrderWithContext } = await import("./exchangeService");
  const order = await getExchangeOrderWithContext(orderId);
  if (!order) return null;
  const user = await assertSupportCanViewUser(viewerRole, order.userId);
  if (!user) return null;
  if (expectedUserId != null && order.userId !== expectedUserId) return null;
  return order;
}
