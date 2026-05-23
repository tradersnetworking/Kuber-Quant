import { Router } from "express";
import { db, usersTable, ticketsTable, kycRecordsTable, transactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireManagerOrAdmin } from "../middlewares/auth";
import { mapUser } from "./auth";
import { mapKyc } from "./kyc";
import { mapTicket } from "./tickets";

const router = Router();

router.get("/stats", requireAuth, requireManagerOrAdmin, async (req, res) => {
  const { userId } = (req as any).user;
  const clients = await db.select().from(usersTable).where(eq(usersTable.managerId, userId));
  const clientIds = clients.map(c => c.id);

  let pendingKyc = 0;
  let pendingTxns = 0;
  let openTickets = 0;
  let totalVolume = 0;

  for (const clientId of clientIds) {
    const kycs = await db.select().from(kycRecordsTable).where(eq(kycRecordsTable.userId, clientId));
    pendingKyc += kycs.filter(k => k.status === "submitted").length;

    const txns = await db.select().from(transactionsTable).where(eq(transactionsTable.userId, clientId));
    pendingTxns += txns.filter(t => t.status === "pending").length;
    totalVolume += txns.reduce((s, t) => s + Number(t.amount), 0);

    const tickets = await db.select().from(ticketsTable).where(eq(ticketsTable.userId, clientId));
    openTickets += tickets.filter(t => t.status === "open").length;
  }

  res.json({
    totalClients: clients.length,
    pendingTickets: openTickets,
    pendingKyc,
    pendingTransactions: pendingTxns,
    totalClientVolume: totalVolume,
  });
});

router.get("/clients", requireAuth, requireManagerOrAdmin, async (req, res) => {
  const { userId } = (req as any).user;
  const clients = await db.select().from(usersTable)
    .where(eq(usersTable.managerId, userId))
    .orderBy(desc(usersTable.createdAt));
  res.json(clients.map(mapUser));
});

router.get("/kyc", requireAuth, requireManagerOrAdmin, async (req, res) => {
  const { userId } = (req as any).user;
  const clients = await db.select().from(usersTable).where(eq(usersTable.managerId, userId));
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
  const { userId } = (req as any).user;
  const clients = await db.select().from(usersTable).where(eq(usersTable.managerId, userId));
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

router.get("/transactions", requireAuth, requireManagerOrAdmin, async (req, res) => {
  const { userId } = (req as any).user;
  const clients = await db.select().from(usersTable).where(eq(usersTable.managerId, userId));
  const clientIds = clients.map(c => c.id);

  if (clientIds.length === 0) { res.json([]); return; }

  const allTxns: any[] = [];
  for (const clientId of clientIds) {
    const txns = await db.select().from(transactionsTable)
      .where(eq(transactionsTable.userId, clientId))
      .orderBy(desc(transactionsTable.createdAt));
    const client = clients.find(c => c.id === clientId);
    allTxns.push(...txns.map(t => ({
      id: t.id, userId: t.userId, userEmail: client?.email || null,
      userName: client?.fullName || null, type: t.type,
      amount: Number(t.amount), currency: t.currency, status: t.status,
      paymentMethod: t.paymentMethod || null, txHash: t.txHash || null,
      notes: t.notes || null, createdAt: t.createdAt.toISOString(),
    })));
  }
  res.json(allTxns);
});

export default router;
