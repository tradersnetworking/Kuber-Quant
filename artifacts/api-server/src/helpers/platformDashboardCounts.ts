import {
  db,
  usersTable,
  transactionsTable,
  investmentsTable,
  kycRecordsTable,
  ticketsTable,
  mt5RequestsTable,
  eaSubscriptionsTable,
  algoSubscriptionsTable,
} from "@workspace/db";
import { eq, and, gte, lte, ne, sql, isNotNull, inArray, desc, or, isNull } from "@workspace/db/orm";
import type { Transaction, Investment } from "@workspace/db";
import type { UserRole } from "./roleHierarchy";

export type UserRoleCounts = {
  totalUsers: number;
  superAdmins: number;
  supportAgents: number;
  managers: number;
  investors: number;
};

export type OperationalCounts = {
  pendingMt5Requests: number;
  forwardedMt5Requests: number;
  activeEASubscriptions: number;
  pendingTransactions: number;
  pendingKyc: number;
  openTickets: number;
  activeAlgoSubscriptions: number;
};

export async function fetchUserRoleCounts(): Promise<UserRoleCounts> {
  const rows = await db
    .select({
      role: usersTable.role,
      count: sql<number>`count(*)::int`,
    })
    .from(usersTable)
    .groupBy(usersTable.role);

  const byRole = new Map(rows.map(r => [r.role, r.count]));
  const superAdmins = byRole.get("superadmin") ?? 0;
  const supportAgents = byRole.get("support") ?? 0;
  const managers = byRole.get("manager") ?? 0;
  const investors = byRole.get("user") ?? 0;
  const admins = byRole.get("admin") ?? 0;

  return {
    totalUsers: superAdmins + supportAgents + managers + investors + admins,
    superAdmins,
    supportAgents,
    managers,
    investors,
  };
}

export async function fetchOperationalCounts(): Promise<OperationalCounts> {
  const [
    [mt5Pending],
    [mt5Forwarded],
    [eaActive],
    [pendingTx],
    [pendingKyc],
    [openTickets],
    [activeAlgo],
  ] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(mt5RequestsTable).where(eq(mt5RequestsTable.status, "pending")),
    db.select({ n: sql<number>`count(*)::int` }).from(mt5RequestsTable).where(eq(mt5RequestsTable.status, "forwarded")),
    db.select({ n: sql<number>`count(*)::int` }).from(eaSubscriptionsTable).where(eq(eaSubscriptionsTable.status, "active")),
    db.select({ n: sql<number>`count(*)::int` }).from(transactionsTable).where(eq(transactionsTable.status, "pending")),
    db.select({ n: sql<number>`count(*)::int` }).from(kycRecordsTable).where(eq(kycRecordsTable.status, "submitted")),
    db.select({ n: sql<number>`count(*)::int` }).from(ticketsTable).where(eq(ticketsTable.status, "open")),
    db.select({ n: sql<number>`count(*)::int` }).from(algoSubscriptionsTable).where(eq(algoSubscriptionsTable.active, true)),
  ]);

  return {
    pendingMt5Requests: mt5Pending?.n ?? 0,
    forwardedMt5Requests: mt5Forwarded?.n ?? 0,
    activeEASubscriptions: eaActive?.n ?? 0,
    pendingTransactions: pendingTx?.n ?? 0,
    pendingKyc: pendingKyc?.n ?? 0,
    openTickets: openTickets?.n ?? 0,
    activeAlgoSubscriptions: activeAlgo?.n ?? 0,
  };
}

export async function sumInvestmentProfit(): Promise<number> {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${investmentsTable.profit}::numeric), 0)` })
    .from(investmentsTable);
  return Number(row?.total ?? 0);
}

/** Load transactions scoped to a stats window (avoids full-table scan when period is bounded). */
export async function fetchTransactionsForStats(
  from: Date | null,
  to: Date | null,
): Promise<Transaction[]> {
  if (!from || !to) {
    return db.select().from(transactionsTable);
  }
  return db
    .select()
    .from(transactionsTable)
    .where(and(gte(transactionsTable.createdAt, from), lte(transactionsTable.createdAt, to)));
}

/** Load investments scoped to a stats window. */
export async function fetchInvestmentsForStats(
  from: Date | null,
  to: Date | null,
): Promise<Investment[]> {
  if (!from || !to) {
    return db.select().from(investmentsTable);
  }
  return db
    .select()
    .from(investmentsTable)
    .where(and(gte(investmentsTable.createdAt, from), lte(investmentsTable.createdAt, to)));
}

/** Today's withdrawal requests only — for dashboard today-payments KPI. */
export async function fetchTodayWithdrawalTransactions(from: Date, to: Date): Promise<Transaction[]> {
  return db
    .select()
    .from(transactionsTable)
    .where(and(
      eq(transactionsTable.type, "withdrawal"),
      ne(transactionsTable.status, "rejected"),
      gte(transactionsTable.createdAt, from),
      lte(transactionsTable.createdAt, to),
    ));
}

/** Investments maturing today — for dashboard today-payments KPI. */
export async function fetchInvestmentsMaturingBetween(from: Date, to: Date): Promise<Investment[]> {
  return db
    .select()
    .from(investmentsTable)
    .where(and(
      isNotNull(investmentsTable.maturityDate),
      gte(investmentsTable.maturityDate, from),
      lte(investmentsTable.maturityDate, to),
    ));
}

export type VisibleUserRow = {
  id: number;
  role: string;
  isActive: boolean;
  createdAt: Date;
};

export async function fetchVisibleUserRows(visibleRoles: UserRole[]): Promise<VisibleUserRow[]> {
  if (!visibleRoles.length) return [];
  return db
    .select({
      id: usersTable.id,
      role: usersTable.role,
      isActive: usersTable.isActive,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(inArray(usersTable.role, visibleRoles));
}

export async function fetchTransactionsForUserIds(
  userIds: number[],
  from: Date | null,
  to: Date | null,
): Promise<Transaction[]> {
  if (!userIds.length) return [];
  const scoped = inArray(transactionsTable.userId, userIds);
  if (from && to) {
    return db
      .select()
      .from(transactionsTable)
      .where(and(scoped, gte(transactionsTable.createdAt, from), lte(transactionsTable.createdAt, to)));
  }
  return db.select().from(transactionsTable).where(scoped);
}

export async function fetchInvestmentsForUserIds(
  userIds: number[],
  from: Date | null,
  to: Date | null,
): Promise<Investment[]> {
  if (!userIds.length) return [];
  const scoped = inArray(investmentsTable.userId, userIds);
  if (from && to) {
    return db
      .select()
      .from(investmentsTable)
      .where(and(scoped, gte(investmentsTable.createdAt, from), lte(investmentsTable.createdAt, to)));
  }
  return db.select().from(investmentsTable).where(scoped);
}

export async function sumInvestmentProfitForUserIds(userIds: number[]): Promise<number> {
  if (!userIds.length) return 0;
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${investmentsTable.profit}::numeric), 0)` })
    .from(investmentsTable)
    .where(inArray(investmentsTable.userId, userIds));
  return Number(row?.total ?? 0);
}

export async function countPendingTransactionsForUserIds(userIds: number[]): Promise<number> {
  if (!userIds.length) return 0;
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(transactionsTable)
    .where(and(inArray(transactionsTable.userId, userIds), eq(transactionsTable.status, "pending")));
  return row?.n ?? 0;
}

export type VisibleUserDetailRow = VisibleUserRow & {
  fullName: string;
  email: string;
};

export async function fetchVisibleUserDetailRows(visibleRoles: UserRole[]): Promise<VisibleUserDetailRow[]> {
  if (!visibleRoles.length) return [];
  return db
    .select({
      id: usersTable.id,
      role: usersTable.role,
      isActive: usersTable.isActive,
      createdAt: usersTable.createdAt,
      fullName: usersTable.fullName,
      email: usersTable.email,
    })
    .from(usersTable)
    .where(inArray(usersTable.role, visibleRoles))
    .orderBy(usersTable.createdAt);
}

export async function fetchRecentTransactionsForUserIds(userIds: number[], limit: number): Promise<Transaction[]> {
  if (!userIds.length) return [];
  return db
    .select()
    .from(transactionsTable)
    .where(inArray(transactionsTable.userId, userIds))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit);
}

export async function countActiveInvestmentsForUserIds(userIds: number[]): Promise<number> {
  if (!userIds.length) return 0;
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(investmentsTable)
    .where(and(inArray(investmentsTable.userId, userIds), eq(investmentsTable.status, "active")));
  return row?.n ?? 0;
}

export async function countKycSubmittedForUserIds(userIds: number[]): Promise<number> {
  if (!userIds.length) return 0;
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(kycRecordsTable)
    .where(and(inArray(kycRecordsTable.userId, userIds), eq(kycRecordsTable.status, "submitted")));
  return row?.n ?? 0;
}

export async function countOpenTicketsForUserIds(userIds: number[]): Promise<number> {
  if (!userIds.length) return 0;
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(ticketsTable)
    .where(and(inArray(ticketsTable.userId, userIds), eq(ticketsTable.status, "open")));
  return row?.n ?? 0;
}

export async function sumTransactionVolumeForUserIds(userIds: number[]): Promise<number> {
  if (!userIds.length) return 0;
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${transactionsTable.amount}::numeric), 0)` })
    .from(transactionsTable)
    .where(inArray(transactionsTable.userId, userIds));
  return Number(row?.total ?? 0);
}

export type SupportTicketStats = {
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  totalTickets: number;
  urgentTickets: number;
  complaintTickets: number;
  queryTickets: number;
  pendingToday: number;
};

export async function fetchSupportTicketStats(): Promise<SupportTicketStats> {
  const complaintFilter = or(
    inArray(ticketsTable.category, ["Complaint", "complaint"]),
    sql`lower(trim(${ticketsTable.category})) = 'complaint'`,
  );
  const queryFilter = or(
    isNull(ticketsTable.category),
    eq(ticketsTable.category, ""),
    inArray(ticketsTable.category, ["Query", "General", "query", "general"]),
  );
  const urgentFilter = and(
    or(eq(ticketsTable.priority, "urgent"), eq(ticketsTable.priority, "high")),
    ne(ticketsTable.status, "closed"),
    ne(ticketsTable.status, "resolved"),
  );
  const pendingTodayFilter = and(
    sql`${ticketsTable.createdAt}::date = current_date`,
    or(eq(ticketsTable.status, "open"), eq(ticketsTable.status, "in_progress")),
  );

  const [
    statusRows,
    [urgentRow],
    [complaintsRow],
    [queriesRow],
    [pendingTodayRow],
    [totalRow],
  ] = await Promise.all([
    db
      .select({ status: ticketsTable.status, count: sql<number>`count(*)::int` })
      .from(ticketsTable)
      .groupBy(ticketsTable.status),
    db.select({ n: sql<number>`count(*)::int` }).from(ticketsTable).where(urgentFilter),
    db.select({ n: sql<number>`count(*)::int` }).from(ticketsTable).where(complaintFilter),
    db.select({ n: sql<number>`count(*)::int` }).from(ticketsTable).where(queryFilter),
    db.select({ n: sql<number>`count(*)::int` }).from(ticketsTable).where(pendingTodayFilter),
    db.select({ n: sql<number>`count(*)::int` }).from(ticketsTable),
  ]);

  const byStatus = new Map(statusRows.map(r => [r.status, r.count]));

  return {
    openTickets: byStatus.get("open") ?? 0,
    inProgressTickets: byStatus.get("in_progress") ?? 0,
    resolvedTickets: byStatus.get("resolved") ?? 0,
    closedTickets: byStatus.get("closed") ?? 0,
    totalTickets: totalRow?.n ?? 0,
    urgentTickets: urgentRow?.n ?? 0,
    complaintTickets: complaintsRow?.n ?? 0,
    queryTickets: queriesRow?.n ?? 0,
    pendingToday: pendingTodayRow?.n ?? 0,
  };
}
