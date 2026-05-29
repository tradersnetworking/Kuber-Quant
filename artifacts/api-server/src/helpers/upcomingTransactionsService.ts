import { db, transactionsTable, usersTable } from "@workspace/db";
import { eq, desc, and, inArray } from "@workspace/db/orm";
import { canViewRole, filterUsersByViewerRole } from "./roleHierarchy";
import { normalizeProofUrl } from "./proofUrlUtil";

export type UpcomingTransactionRow = {
  id: number;
  userId: number;
  userEmail: string | null;
  userName: string | null;
  type: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string | null;
  notes: string | null;
  proofUrl: string | null;
  utrReference: string | null;
  txHash: string | null;
  gatewayProvider: string | null;
  paymentAccountId: number | null;
  createdAt: string;
};

export type UpcomingSummary = {
  pendingDeposits: number;
  pendingWithdrawals: number;
  pendingDepositAmount: number;
  pendingWithdrawalAmount: number;
  total: number;
};

export type UpcomingTransactionsPayload = {
  items: UpcomingTransactionRow[];
  summary: UpcomingSummary;
};

type UserLite = { id: number; email: string; fullName: string | null; role: string };

function buildSummary(items: UpcomingTransactionRow[]): UpcomingSummary {
  const deposits = items.filter(i => i.type === "deposit");
  const withdrawals = items.filter(i => i.type === "withdrawal");
  return {
    pendingDeposits: deposits.length,
    pendingWithdrawals: withdrawals.length,
    pendingDepositAmount: deposits.reduce((s, i) => s + i.amount, 0),
    pendingWithdrawalAmount: withdrawals.reduce((s, i) => s + i.amount, 0),
    total: items.length,
  };
}

function mapRows(
  txns: (typeof transactionsTable.$inferSelect)[],
  userMap: Map<number, UserLite>,
): UpcomingTransactionRow[] {
  return txns.map(t => {
    const u = userMap.get(t.userId);
    return {
      id: t.id,
      userId: t.userId,
      userEmail: u?.email ?? null,
      userName: u?.fullName ?? null,
      type: t.type,
      amount: Number(t.amount),
      currency: t.currency,
      status: t.status,
      paymentMethod: t.paymentMethod,
      notes: t.notes,
      proofUrl: normalizeProofUrl(t.proofUrl),
      utrReference: t.utrReference,
      txHash: t.txHash,
      gatewayProvider: t.gatewayProvider,
      paymentAccountId: t.paymentAccountId ?? null,
      createdAt: t.createdAt.toISOString(),
    };
  });
}

export async function listUpcomingForUser(userId: number, limit = 50): Promise<UpcomingTransactionsPayload> {
  const txns = await db.select().from(transactionsTable)
    .where(and(eq(transactionsTable.userId, userId), eq(transactionsTable.status, "pending")))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit);

  const [user] = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    fullName: usersTable.fullName,
    role: usersTable.role,
  }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  const userMap = new Map<number, UserLite>();
  if (user) userMap.set(user.id, user);

  const items = mapRows(txns, userMap);
  return { items, summary: buildSummary(items) };
}

export async function listUpcomingForManagerClients(
  managerId: number,
  viewerRole: string,
  limit = 100,
): Promise<UpcomingTransactionsPayload> {
  const allClients = await db.select().from(usersTable).where(eq(usersTable.managerId, managerId));
  const clients = filterUsersByViewerRole(viewerRole, allClients);
  const clientIds = clients.map(c => c.id);

  if (clientIds.length === 0) {
    return { items: [], summary: buildSummary([]) };
  }

  const txns = await db.select().from(transactionsTable)
    .where(and(inArray(transactionsTable.userId, clientIds), eq(transactionsTable.status, "pending")))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit);

  const userMap = new Map(clients.map(c => [c.id, {
    id: c.id,
    email: c.email,
    fullName: c.fullName,
    role: c.role,
  }]));

  const items = mapRows(txns, userMap);
  return { items, summary: buildSummary(items) };
}

export async function listUpcomingForPlatform(
  viewerRole: string,
  limit = 200,
): Promise<UpcomingTransactionsPayload> {
  const txns = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.status, "pending"))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit * 3);

  const users = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    fullName: usersTable.fullName,
    role: usersTable.role,
  }).from(usersTable);
  const userMap = new Map(users.map(u => [u.id, u]));

  const filtered = txns.filter(t => {
    const u = userMap.get(t.userId);
    return u ? canViewRole(viewerRole, u.role) : false;
  }).slice(0, limit);

  const items = mapRows(filtered, userMap);
  return { items, summary: buildSummary(items) };
}
