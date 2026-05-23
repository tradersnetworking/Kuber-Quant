import { Router } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const txns = await db.select().from(transactionsTable).where(eq(transactionsTable.userId, userId));
  const deposits = txns.filter(t => t.type === "deposit" && t.status === "approved")
    .reduce((s, t) => s + Number(t.amount), 0);
  const withdrawals = txns.filter(t => t.type === "withdrawal" && t.status === "approved")
    .reduce((s, t) => s + Number(t.amount), 0);

  const fiat = Number(user.balanceFiat);
  const crypto = Number(user.balanceCrypto);

  res.json({
    fiatBalance: fiat,
    cryptoBalance: crypto,
    totalDeposited: deposits,
    totalWithdrawn: withdrawals,
    totalProfit: Number(user.totalProfit),
    btcBalance: crypto * 0.4,
    ethBalance: crypto * 0.3,
    usdtBalance: crypto * 0.2,
    inrBalance: fiat * 83.5,
  });
});

router.post("/transfer", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { fromWallet, toWallet, amount } = req.body;
  if (!fromWallet || !toWallet || !amount || amount <= 0) {
    res.status(400).json({ error: "fromWallet, toWallet, amount are required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const fiat = Number(user.balanceFiat);
  const crypto = Number(user.balanceCrypto);

  if (fromWallet === "fiat" && fiat < amount) {
    res.status(400).json({ error: "Insufficient fiat balance" }); return;
  }
  if (fromWallet !== "fiat" && crypto < amount) {
    res.status(400).json({ error: "Insufficient crypto balance" }); return;
  }

  const updates: any = {};
  if (fromWallet === "fiat") {
    updates.balanceFiat = String(fiat - amount);
    updates.balanceCrypto = String(crypto + amount);
  } else {
    updates.balanceCrypto = String(crypto - amount);
    updates.balanceFiat = String(fiat + amount);
  }
  await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));
  res.json({ message: "Transfer successful" });
});

export default router;
