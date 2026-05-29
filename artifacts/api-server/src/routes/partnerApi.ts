import { Router } from "express";
import { db, usersTable, transactionsTable, kycRecordsTable } from "@workspace/db";
import { eq, desc } from "@workspace/db/orm";
import { requirePartnerApiKey, requirePartnerScope } from "../middlewares/partnerAuth";
import { mapKyc } from "./kyc";

const router = Router();

router.use(requirePartnerApiKey);

router.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "v1" });
});

router.get("/users/:id", requirePartnerScope("users.read"), async (req, res) => {
  const id = Number(req.params.id);
  const [user] = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    fullName: usersTable.fullName,
    role: usersTable.role,
    kycStatus: usersTable.kycStatus,
    isActive: usersTable.isActive,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.id, id)).limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    ...user,
    createdAt: user.createdAt.toISOString(),
  });
});

router.get("/transactions", requirePartnerScope("transactions.read"), async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const userId = req.query.userId ? Number(req.query.userId) : undefined;

  const baseQuery = db.select({
    id: transactionsTable.id,
    userId: transactionsTable.userId,
    type: transactionsTable.type,
    amount: transactionsTable.amount,
    currency: transactionsTable.currency,
    status: transactionsTable.status,
    createdAt: transactionsTable.createdAt,
  }).from(transactionsTable);

  const rows = userId
    ? await baseQuery.where(eq(transactionsTable.userId, userId)).orderBy(desc(transactionsTable.createdAt)).limit(limit)
    : await baseQuery.orderBy(desc(transactionsTable.createdAt)).limit(limit);

  res.json(rows.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.get("/kyc/:userId", requirePartnerScope("kyc.read"), async (req, res) => {
  const userId = Number(req.params.userId);
  const [kyc] = await db.select().from(kycRecordsTable)
    .where(eq(kycRecordsTable.userId, userId))
    .limit(1);

  if (!kyc) {
    res.status(404).json({ error: "KYC record not found" });
    return;
  }

  res.json(mapKyc(kyc));
});

export default router;
