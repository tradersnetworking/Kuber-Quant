import { Router } from "express";
import {
  db, usersTable, transactionsTable, investmentsTable,
  kycRecordsTable, investmentPlansTable, mt5AccountsTable,
  ticketsTable, ticketRepliesTable, referralEarningsTable,
  paymentGatewaysTable, siteSettingsTable, notificationsTable,
  userPaymentAccountsTable,
} from "@workspace/db";
import { eq, desc, sql, asc, inArray, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { mapUser } from "./auth";
import { mapKyc } from "./kyc";
import { mapPlan } from "./plans";
import { mapAccount } from "./mt5";
import { mapTicket } from "./tickets";
import { creditWallet, debitWallet, WalletError } from "../helpers/walletService";
import { sendTransactionalEmail, buildTransactionEmail, buildKycEmail } from "../helpers/mailer";
import {
  approveTransaction,
  rejectTransaction,
  getPlatformLedger,
  countPlatformLedger,
  getLedgerQueueSummary,
} from "../helpers/transactionLedgerService";
import { logAudit } from "../helpers/audit";
import { mapTxn as mapTxnBase } from "./transactions";
import { createUploadMiddleware, getUploadUrl } from "../middlewares/upload";
import { canViewRole, filterUsersByViewerRole, assignableRoles } from "../helpers/roleHierarchy";
import { mapPaymentAccount } from "../helpers/paymentAccountSync";

const qrCodeUpload = createUploadMiddleware("qr_codes");
const brandingUpload = createUploadMiddleware("branding");

function mapGateway(g: any) {
  return {
    id: g.id, name: g.name, type: g.type, symbol: g.symbol || null,
    network: g.network || null, description: g.description || null,
    walletAddress: g.walletAddress || null, upiId: g.upiId || null,
    qrCodeUrl: g.qrCodeUrl || null,
    minAmount: Number(g.minAmount || 0),
    maxAmount: g.maxAmount ? Number(g.maxAmount) : null,
    isEnabled: g.isEnabled, sortOrder: g.sortOrder,
    extraConfig: g.extraConfig || {},
    createdAt: g.createdAt.toISOString(),
  };
}

const router = Router();

async function getSetting(key: string, fallback: string): Promise<string> {
  const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  return row?.value ?? fallback;
}

function mapTxn(t: any, email?: string, userName?: string, reviewerEmail?: string | null) {
  return {
    ...mapTxnBase(t, email),
    userName: userName || null,
    reviewedByEmail: reviewerEmail || null,
  };
}

router.get("/analytics", requireAuth, requireAdmin, async (req, res) => {
  const viewerRole = (req as any).user.role as string;
  const txns = await db.select().from(transactionsTable).orderBy(transactionsTable.createdAt);
  const allUsers = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  const users = filterUsersByViewerRole(viewerRole, allUsers);
  const visibleUserIds = new Set(users.map((u) => u.id));
  const investments = await db.select().from(investmentsTable);
  const userMap = new Map(users.map(u => [u.id, u]));

  const revenueByMonth: Record<string, number> = {};
  const depositsByMonth: Record<string, number> = {};
  const withdrawalsByMonth: Record<string, number> = {};
  const usersByMonth: Record<string, number> = {};
  const now = new Date();

  const monthLabel = (d: Date) => d.toLocaleString("en-US", { month: "short" });

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    revenueByMonth[key] = 0;
    depositsByMonth[key] = 0;
    withdrawalsByMonth[key] = 0;
    usersByMonth[key] = 0;
  }

  for (const t of txns) {
    const key = `${t.createdAt.getFullYear()}-${String(t.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (depositsByMonth[key] === undefined) continue;
    const amt = Number(t.amount);
    if (t.type === "deposit" && t.status === "approved") {
      depositsByMonth[key] += amt;
      revenueByMonth[key] += amt;
    }
    if (t.type === "withdrawal" && t.status === "approved") {
      withdrawalsByMonth[key] += amt;
      revenueByMonth[key] -= amt;
    }
  }
  for (const u of users) {
    const key = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (usersByMonth[key] !== undefined) usersByMonth[key]++;
  }

  const monthKeys = Object.keys(revenueByMonth).sort();
  const cashFlow = monthKeys.slice(-6).map(key => {
    const [y, m] = key.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return {
      month: monthLabel(d),
      deposits: depositsByMonth[key],
      withdrawals: withdrawalsByMonth[key],
      revenue: revenueByMonth[key],
    };
  });

  const userGrowth = monthKeys.slice(-6).map(key => {
    const [y, m] = key.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return { month: monthLabel(d), users: usersByMonth[key] };
  });

  const activeInvestments = investments.filter(i => i.status === "active");
  const subscriptionMix = [
    { name: "Investment Plans", value: activeInvestments.length || 1, color: "#F59E0B" },
    { name: "Copy Trading", value: users.filter(u => u.role === "user").length > 0 ? Math.ceil(users.length * 0.28) : 0, color: "#6366f1" },
    { name: "Algo/EA", value: users.filter(u => u.role === "user").length > 0 ? Math.ceil(users.length * 0.18) : 0, color: "#22c55e" },
    { name: "Account Handling", value: users.filter(u => u.role === "user").length > 0 ? Math.ceil(users.length * 0.09) : 0, color: "#f43f5e" },
  ].filter(s => s.value > 0);

  res.json({
    cashFlow,
    userGrowth,
    subscriptionMix: subscriptionMix.length ? subscriptionMix : [{ name: "Investment Plans", value: 1, color: "#F59E0B" }],
    recentActivity: txns.slice(-20).reverse()
      .filter(t => visibleUserIds.has(t.userId))
      .map(t => {
      const u = userMap.get(t.userId);
      return {
        id: t.id, type: t.type, amount: Number(t.amount), currency: t.currency,
        status: t.status, createdAt: t.createdAt.toISOString(),
        userName: u?.fullName || u?.email || "User",
      };
    }),
  });
});

router.get("/stats", requireAuth, requireAdmin, async (req, res) => {
  const viewerRole = (req as any).user.role as string;
  const allUsers = await db.select().from(usersTable);
  const users = filterUsersByViewerRole(viewerRole, allUsers);
  const txns = await db.select().from(transactionsTable);
  const investments = await db.select().from(investmentsTable);
  const kycs = await db.select().from(kycRecordsTable);
  const tickets = await db.select().from(ticketsTable);

  const deposits = txns.filter(t => t.type === "deposit" && t.status === "approved");
  const withdrawals = txns.filter(t => t.type === "withdrawal" && t.status === "approved");
  const pending = txns.filter(t => t.status === "pending");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const newUsers = users.filter(u => u.createdAt >= startOfMonth);
  const pendingKyc = kycs.filter(k => k.status === "submitted").length;
  const openTickets = tickets.filter(t => t.status === "open").length;
  const managers = users.filter(u => u.role === "manager").length;

  res.json({
    totalUsers: users.length,
    totalDeposits: deposits.reduce((s, t) => s + Number(t.amount), 0),
    totalWithdrawals: withdrawals.reduce((s, t) => s + Number(t.amount), 0),
    totalInvestments: investments.reduce((s, i) => s + Number(i.amount), 0),
    pendingTransactions: pending.length,
    activeUsers: users.filter(u => u.isActive).length,
    totalProfit: investments.reduce((s, i) => s + Number(i.profit), 0),
    newUsersThisMonth: newUsers.length,
    pendingKyc,
    openTickets,
    totalManagers: managers,
  });
});

router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  const viewerRole = (req as any).user.role as string;
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(filterUsersByViewerRole(viewerRole, users).map(mapUser));
});

router.get("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const viewerRole = (req as any).user.role as string;
  const id = parseInt(String(req.params.id));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (!canViewRole(viewerRole, user.role)) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(mapUser(user));
});

router.get("/users/:id/full", requireAuth, requireAdmin, async (req, res) => {
  const viewerRole = (req as any).user.role as string;
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user id" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (!canViewRole(viewerRole, user.role)) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const { getUserFullDetail } = await import("../helpers/userFullDetailService");
  const detail = await getUserFullDetail(id);
  res.json(detail);
});

router.get("/users/:id/payment-accounts", requireAuth, requireAdmin, async (req, res) => {
  const viewerRole = (req as any).user.role as string;
  const id = parseInt(String(req.params.id));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (!canViewRole(viewerRole, user.role)) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const rows = await db.select().from(userPaymentAccountsTable)
    .where(and(eq(userPaymentAccountsTable.userId, id), eq(userPaymentAccountsTable.isActive, true)))
    .orderBy(userPaymentAccountsTable.isDefault);
  res.json(rows.map(mapPaymentAccount));
});

router.patch("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const viewerRole = (req as any).user.role as string;
  const id = parseInt(String(req.params.id));
  const { role, kycStatus, balanceFiat, balanceCrypto, isActive, managerId } = req.body;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "User not found" }); return; }
  if (!canViewRole(viewerRole, existing.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (role !== undefined && !assignableRoles(viewerRole).includes(role)) {
    res.status(403).json({ error: "Forbidden — cannot assign this role" });
    return;
  }

  const updates: Record<string, any> = {};
  if (role !== undefined) updates.role = role;
  if (kycStatus !== undefined) updates.kycStatus = kycStatus;
  if (balanceFiat !== undefined) updates.balanceFiat = String(balanceFiat);
  if (balanceCrypto !== undefined) updates.balanceCrypto = String(balanceCrypto);
  if (isActive !== undefined) updates.isActive = isActive;
  if (managerId !== undefined) updates.managerId = managerId;
  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(mapUser(user));
});

router.get("/transactions", requireAuth, requireAdmin, async (req, res) => {
  const viewerRole = (req as any).user.role as string;
  const txns = await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt));
  const users = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    fullName: usersTable.fullName,
    role: usersTable.role,
  }).from(usersTable);
  const userMap = new Map(users.map(u => [u.id, u]));
  const reviewerIds = [...new Set(txns.map(t => t.reviewedByUserId).filter(Boolean))] as number[];
  const reviewers = reviewerIds.length
    ? await db.select({ id: usersTable.id, email: usersTable.email }).from(usersTable).where(inArray(usersTable.id, reviewerIds))
    : [];
  const reviewerMap = new Map(reviewers.map(r => [r.id, r.email]));
  res.json(txns
    .filter((t) => {
      const u = userMap.get(t.userId);
      return u ? canViewRole(viewerRole, u.role) : false;
    })
    .map(t => {
      const u = userMap.get(t.userId);
      return mapTxn(t, u?.email, u?.fullName, t.reviewedByUserId ? reviewerMap.get(t.reviewedByUserId) || null : null);
    }));
});

router.get("/ledger/summary", requireAuth, requireAdmin, async (req, res) => {
  const viewerRole = (req as any).user.role as string;
  const allUsers = await db.select({ id: usersTable.id, role: usersTable.role }).from(usersTable);
  const visibleIds = allUsers.filter(u => canViewRole(viewerRole, u.role)).map(u => u.id);
  const summary = await getLedgerQueueSummary(visibleIds);
  res.json(summary);
});

router.get("/ledger", requireAuth, requireAdmin, async (req, res) => {
  const viewerRole = (req as any).user.role as string;
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const offset = Number(req.query.offset) || 0;
  const typeParam = req.query.type as string | undefined;
  const types = typeParam && typeParam !== "all"
    ? typeParam.split(",").filter(Boolean) as ("deposit" | "withdrawal")[]
    : undefined;

  const allUsers = await db.select({ id: usersTable.id, role: usersTable.role }).from(usersTable);
  const visibleIds = allUsers.filter(u => canViewRole(viewerRole, u.role)).map(u => u.id);

  const [entries, total] = await Promise.all([
    getPlatformLedger({ userIds: visibleIds, types, limit, offset }),
    countPlatformLedger(visibleIds),
  ]);

  res.json({ entries, total, limit, offset });
});

router.get("/transactions/:id/blockchain-verify", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid transaction id" }); return; }

  try {
    const { verifyBlockchainDeposit } = await import("../helpers/blockchainVerificationService");
    const result = await verifyBlockchainDeposit(id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Verification failed" });
  }
});

router.post("/transactions/:id/approve", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { adminNotes, verifyBlockchain } = req.body;
  const reviewerUserId = (req as any).user.userId as number;

  try {
    const [existing] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Transaction not found" }); return; }

    if (verifyBlockchain) {
      const { verifyBlockchainDeposit, isCryptoDeposit } = await import("../helpers/blockchainVerificationService");
      if (isCryptoDeposit(existing)) {
        const chain = await verifyBlockchainDeposit(id);
        if (!chain.verified) {
          res.status(400).json({
            error: chain.message,
            code: "BLOCKCHAIN_NOT_VERIFIED",
            blockchain: chain,
          });
          return;
        }
      }
    }

    const txn = await approveTransaction({ transactionId: id, reviewerUserId, adminNotes });
    await logAudit({
      req,
      userId: reviewerUserId,
      role: (req as any).user.role,
      action: "transaction_approved",
      entity: "transaction",
      entityId: id,
      details: {
        type: txn.type,
        amount: txn.amount,
        currency: txn.currency,
        targetUserId: txn.userId,
        adminNotes: adminNotes || null,
      },
    });
    const users = await db.select({ id: usersTable.id, email: usersTable.email, fullName: usersTable.fullName }).from(usersTable);
    const userMap = new Map(users.map(u => [u.id, u]));
    const u = userMap.get(txn.userId);
    const reviewer = users.find(r => r.id === txn.reviewedByUserId);
    res.json(mapTxn(txn, u?.email, u?.fullName, reviewer?.email || null));
  } catch (err) {
    if (err instanceof WalletError) {
      res.status(400).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});

router.post("/transactions/:id/reject", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { adminNotes } = req.body;
  const reviewerUserId = (req as any).user.userId as number;

  try {
    const txn = await rejectTransaction({ transactionId: id, reviewerUserId, adminNotes });
    await logAudit({
      req,
      userId: reviewerUserId,
      role: (req as any).user.role,
      action: "transaction_rejected",
      entity: "transaction",
      entityId: id,
      details: {
        type: txn.type,
        amount: txn.amount,
        currency: txn.currency,
        targetUserId: txn.userId,
        adminNotes: adminNotes || null,
      },
    });
    const users = await db.select({ id: usersTable.id, email: usersTable.email, fullName: usersTable.fullName }).from(usersTable);
    const userMap = new Map(users.map(u => [u.id, u]));
    const u = userMap.get(txn.userId);
    const reviewer = users.find(r => r.id === txn.reviewedByUserId);
    res.json(mapTxn(txn, u?.email, u?.fullName, reviewer?.email || null));
  } catch (err) {
    if (err instanceof WalletError) {
      res.status(400).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});

router.get("/kyc", requireAuth, requireAdmin, async (req, res) => {
  const viewerRole = (req as any).user.role as string;
  const kycs = await db.select().from(kycRecordsTable).orderBy(desc(kycRecordsTable.createdAt));
  const users = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    fullName: usersTable.fullName,
    role: usersTable.role,
  }).from(usersTable);
  const userMap = new Map(users.map(u => [u.id, u]));
  res.json(kycs
    .filter((k) => {
      const u = userMap.get(k.userId);
      return u ? canViewRole(viewerRole, u.role) : false;
    })
    .map(k => {
      const u = userMap.get(k.userId);
      return mapKyc(k, u?.email, u?.fullName);
    }));
});

router.post("/kyc/:id/approve", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [kyc] = await db.update(kycRecordsTable).set({ status: "verified" })
    .where(eq(kycRecordsTable.id, id)).returning();
  if (!kyc) { res.status(404).json({ error: "KYC not found" }); return; }
  const [user] = await db.update(usersTable).set({ kycStatus: "verified" }).where(eq(usersTable.id, kyc.userId)).returning();
  if (user) {
    await sendTransactionalEmail({
      to: user.email,
      purpose: "kyc_approved",
      subject: "KYC verified successfully",
      html: buildKycEmail({ name: user.fullName, status: "approved" }),
    });
  }
  res.json(mapKyc(kyc));
});

router.post("/kyc/:id/reject", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { reason } = req.body;
  const [kyc] = await db.update(kycRecordsTable)
    .set({ status: "rejected", rejectionReason: reason || "Not approved" })
    .where(eq(kycRecordsTable.id, id)).returning();
  if (!kyc) { res.status(404).json({ error: "KYC not found" }); return; }
  const [user] = await db.update(usersTable).set({ kycStatus: "rejected" }).where(eq(usersTable.id, kyc.userId)).returning();
  if (user) {
    await sendTransactionalEmail({
      to: user.email,
      purpose: "kyc_rejected",
      subject: "KYC verification update",
      html: buildKycEmail({ name: user.fullName, status: "rejected", reason: reason || "Not approved" }),
    });
  }
  res.json(mapKyc(kyc));
});

router.get("/plans", requireAuth, requireAdmin, async (_req, res) => {
  const plans = await db.select().from(investmentPlansTable).orderBy(investmentPlansTable.id);
  res.json(plans.map(mapPlan));
});

router.post("/plans", requireAuth, requireAdmin, async (req, res) => {
  const { name, description, minAmount, maxAmount, roiPercent, durationDays, currency, isActive, category,
    planType, profitFrequency, capitalReturn, autoRenewal, earlyWithdrawalPenalty, features, maxInvestors } = req.body;
  if (!name || !minAmount || !maxAmount || !roiPercent || !durationDays) {
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

router.patch("/plans/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { name, description, minAmount, maxAmount, roiPercent, durationDays, currency, isActive, category,
    planType, profitFrequency, capitalReturn, autoRenewal, earlyWithdrawalPenalty, features, maxInvestors } = req.body;
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (minAmount !== undefined) updates.minAmount = String(minAmount);
  if (maxAmount !== undefined) updates.maxAmount = String(maxAmount);
  if (roiPercent !== undefined) updates.roiPercent = String(roiPercent);
  if (durationDays !== undefined) updates.durationDays = durationDays;
  if (currency !== undefined) updates.currency = currency;
  if (isActive !== undefined) updates.isActive = isActive;
  if (category !== undefined) updates.category = category;
  if (planType !== undefined) updates.planType = planType;
  if (profitFrequency !== undefined) updates.profitFrequency = profitFrequency;
  if (capitalReturn !== undefined) updates.capitalReturn = capitalReturn;
  if (autoRenewal !== undefined) updates.autoRenewal = autoRenewal;
  if (earlyWithdrawalPenalty !== undefined) updates.earlyWithdrawalPenalty = String(earlyWithdrawalPenalty);
  if (features !== undefined) updates.features = JSON.stringify(features);
  if (maxInvestors !== undefined) updates.maxInvestors = maxInvestors;
  const [plan] = await db.update(investmentPlansTable).set(updates).where(eq(investmentPlansTable.id, id)).returning();
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  res.json(mapPlan(plan));
});

router.delete("/plans/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [plan] = await db.delete(investmentPlansTable).where(eq(investmentPlansTable.id, id)).returning();
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  res.json({ message: "Plan deleted" });
});

router.post("/wallet-adjust", requireAuth, requireAdmin, async (req, res) => {
  const { userId, amount, walletType, reason } = req.body;
  if (!userId || amount === undefined || !walletType || !reason) {
    res.status(400).json({ error: "userId, amount, walletType, reason are required" }); return;
  }
  const numAmount = Number(amount);
  const currency = walletType === "fiat" ? "USD" : "USDT";
  try {
    if (numAmount >= 0) {
      await creditWallet({ userId, amount: numAmount, currency, type: "adjustment", description: reason });
    } else {
      await debitWallet({ userId, amount: Math.abs(numAmount), currency, type: "adjustment", description: reason });
    }
    res.json({ message: `Wallet adjusted by ${numAmount} for user ${userId}` });
  } catch (err) {
    if (err instanceof WalletError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
});

router.post("/transactions/manual", requireAuth, requireAdmin, async (req, res) => {
  const { userId, type, amount, currency, notes, autoApprove, paymentMethod } = req.body;
  if (!userId || !type || amount === undefined) {
    res.status(400).json({ error: "userId, type, and amount are required" }); return;
  }
  if (!["deposit", "withdrawal"].includes(type)) {
    res.status(400).json({ error: "type must be deposit or withdrawal" }); return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, Number(userId))).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const curr = currency || "USD";
  const approveNow = autoApprove === true;
  const [txn] = await db.insert(transactionsTable).values({
    userId: Number(userId),
    type,
    amount: String(amount),
    currency: curr,
    status: approveNow ? "approved" : "pending",
    paymentMethod: paymentMethod || "manual_admin",
    notes: notes || null,
    adminNotes: approveNow ? "Created and approved by admin" : "Created by admin — pending review",
  }).returning();

  try {
    if (approveNow) {
      const reviewerUserId = (req as any).user.userId as number;
      if (type === "deposit") {
        await creditWallet({
          userId: Number(userId), amount: Number(amount), currency: curr,
          type: "deposit", referenceType: "transaction", referenceId: txn.id,
          description: notes || "Manual admin deposit",
        });
      } else {
        await debitWallet({
          userId: Number(userId), amount: Number(amount), currency: curr,
          type: "withdrawal", referenceType: "transaction", referenceId: txn.id,
          description: notes || "Manual admin withdrawal",
        });
      }
      await db.update(transactionsTable).set({
        reviewedByUserId: reviewerUserId,
        reviewedAt: new Date(),
      }).where(eq(transactionsTable.id, txn.id));
    } else if (type === "withdrawal") {
      const feePercent = Number(await getSetting("withdrawal_fee_percent", "2"));
      const fee = Number(amount) * (feePercent / 100);
      await debitWallet({
        userId: Number(userId), amount: Number(amount) + fee, currency: curr,
        type: "withdrawal", referenceType: "transaction", referenceId: txn.id,
        description: notes || `Pending admin withdrawal #${txn.id} (fee: ${fee.toFixed(2)})`,
      });
    }
    res.status(201).json(mapTxn(txn, user.email, user.fullName));
  } catch (err) {
    await db.update(transactionsTable).set({ status: "rejected", adminNotes: "Wallet operation failed" }).where(eq(transactionsTable.id, txn.id));
    if (err instanceof WalletError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
});

router.get("/mt5-accounts", requireAuth, requireAdmin, async (_req, res) => {
  const { listEnrichedMtAccounts } = await import("../helpers/mtLinkedAccountsService");
  res.json(await listEnrichedMtAccounts());
});

router.patch("/mt5-accounts/:id/review", requireAuth, requireAdmin, async (req, res) => {
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

router.get("/mt5-requests", requireAuth, requireAdmin, async (_req, res) => {
  const { listEnrichedMt5Requests } = await import("../helpers/mtLinkedAccountsService");
  res.json(await listEnrichedMt5Requests());
});

router.post("/mt5-requests/:id/forward", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { forwardMt5Request } = await import("../helpers/mtLinkedAccountsService");
  const result = await forwardMt5Request(id);
  if (!result.ok) { res.status(404).json({ error: result.error }); return; }
  res.json({ message: "Request forwarded" });
});

router.patch("/mt5-requests/:id/status", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { status, externalResponse } = req.body;
  const { updateMt5RequestStatus } = await import("../helpers/mtLinkedAccountsService");
  await updateMt5RequestStatus(id, status, externalResponse);
  res.json({ message: "Status updated" });
});

router.get("/tickets", requireAuth, requireAdmin, async (_req, res) => {
  const tickets = await db.select().from(ticketsTable).orderBy(desc(ticketsTable.createdAt));
  const users = await db.select({ id: usersTable.id, email: usersTable.email, fullName: usersTable.fullName }).from(usersTable);
  const userMap = new Map(users.map(u => [u.id, u]));
  const mapped = await Promise.all(tickets.map(t => {
    const u = userMap.get(t.userId);
    return mapTicket(t, u?.email, u?.fullName);
  }));
  res.json(mapped);
});

router.post("/tickets/:id/reply", requireAuth, requireAdmin, async (req, res) => {
  const { userId } = (req as any).user;
  const id = parseInt(String(req.params.id));
  const { message } = req.body;
  if (!message) { res.status(400).json({ error: "message is required" }); return; }
  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id)).limit(1);
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  await db.insert(ticketRepliesTable).values({ ticketId: id, userId, message, isAdmin: true });
  await db.update(ticketsTable).set({ status: "in_progress" }).where(eq(ticketsTable.id, id));

  const [ticketUser] = await db.select().from(usersTable).where(eq(usersTable.id, ticket.userId)).limit(1);
  if (ticketUser) {
    await sendTransactionalEmail({
      to: ticketUser.email,
      purpose: "ticket_reply",
      subject: `Support ticket #${id} — new reply`,
      html: `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#050A14;color:#fff;padding:32px">
  <div style="max-width:480px;margin:0 auto;background:#0a1628;border-radius:12px;padding:28px;border:1px solid rgba(212,175,55,0.2)">
    <h2 style="color:#D4AF37;margin:0 0 12px">Support Ticket Update</h2>
    <p>Hi ${ticketUser.fullName},</p>
    <p style="line-height:1.6;color:rgba(255,255,255,0.75)">Our team replied to your ticket <strong>#${id}</strong>:</p>
    <blockquote style="border-left:3px solid #D4AF37;padding-left:12px;color:rgba(255,255,255,0.6);margin:16px 0">${message}</blockquote>
    <p style="font-size:13px;color:rgba(255,255,255,0.4)">Log in to view the full conversation.</p>
  </div>
</body></html>`,
    });
  }

  res.json({ message: "Reply sent" });
});

router.post("/tickets/:id/close", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  await db.update(ticketsTable).set({ status: "closed" }).where(eq(ticketsTable.id, id));
  res.json({ message: "Ticket closed" });
});

router.get("/referral-stats", requireAuth, requireAdmin, async (_req, res) => {
  const earnings = await db.select().from(referralEarningsTable);
  const users = await db.select().from(usersTable);
  const userMap = new Map(users.map(u => [u.id, u]));

  const topReferrerMap = new Map<number, { count: number; earnings: number }>();
  for (const e of earnings) {
    const r = topReferrerMap.get(e.referrerId) || { count: 0, earnings: 0 };
    r.count++;
    r.earnings += Number(e.amount);
    topReferrerMap.set(e.referrerId, r);
  }

  const topReferrers = Array.from(topReferrerMap.entries())
    .sort((a, b) => b[1].earnings - a[1].earnings)
    .slice(0, 10)
    .map(([userId, stats]) => {
      const u = userMap.get(userId);
      return { userId, userName: u?.fullName || "Unknown", referralCount: stats.count, earnings: stats.earnings };
    });

  const totalPaid = earnings.filter(e => e.status === "paid").reduce((s, e) => s + Number(e.amount), 0);
  const pending = earnings.filter(e => e.status === "pending").reduce((s, e) => s + Number(e.amount), 0);

  res.json({
    totalReferrals: earnings.length,
    totalCommissionPaid: totalPaid,
    pendingCommission: pending,
    topReferrers,
  });
});

// ── Payment Gateways ───────────────────────────────────────────────────────
router.get("/payment-gateways", requireAuth, requireAdmin, async (_req, res) => {
  const gateways = await db.select().from(paymentGatewaysTable).orderBy(asc(paymentGatewaysTable.sortOrder));
  res.json(gateways.map(mapGateway));
});

router.post("/payment-gateways", requireAuth, requireAdmin, async (req, res) => {
  const { name, type, symbol, network, description, walletAddress, upiId, qrCodeUrl, minAmount, maxAmount, isEnabled, sortOrder, extraConfig } = req.body;
  if (!name || !type) { res.status(400).json({ error: "name and type are required" }); return; }
  const [gw] = await db.insert(paymentGatewaysTable).values({
    name, type, symbol, network, description, walletAddress, upiId, qrCodeUrl,
    minAmount: minAmount ? String(minAmount) : "10",
    maxAmount: maxAmount ? String(maxAmount) : undefined,
    isEnabled: isEnabled !== false, sortOrder: sortOrder || 0, extraConfig: extraConfig || {},
  }).returning();
  res.status(201).json(mapGateway(gw));
});

router.patch("/payment-gateways/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const updates: any = {};
  const fields = ["name","type","symbol","network","description","walletAddress","upiId","qrCodeUrl","isEnabled","sortOrder","extraConfig"];
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.minAmount !== undefined) updates.minAmount = String(req.body.minAmount);
  if (req.body.maxAmount !== undefined) updates.maxAmount = String(req.body.maxAmount);
  const [gw] = await db.update(paymentGatewaysTable).set(updates).where(eq(paymentGatewaysTable.id, id)).returning();
  if (!gw) { res.status(404).json({ error: "Gateway not found" }); return; }
  res.json(mapGateway(gw));
});

router.delete("/payment-gateways/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [gw] = await db.delete(paymentGatewaysTable).where(eq(paymentGatewaysTable.id, id)).returning();
  if (!gw) { res.status(404).json({ error: "Gateway not found" }); return; }
  res.json({ message: "Gateway deleted" });
});

router.post("/upload/qr-code", requireAuth, requireAdmin, qrCodeUpload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "QR code image is required" });
    return;
  }
  const url = getUploadUrl("qr_codes", req.file.filename);
  res.json({ url });
});

router.post("/upload/branding", requireAuth, requireAdmin, brandingUpload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Image file is required" });
    return;
  }
  const url = getUploadUrl("branding", req.file.filename);
  res.json({ url });
});

// ── Site Settings ──────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = [
  { key: "site_name", value: "Kuber Quant", label: "Site Name", category: "general", description: "Full platform name used in emails and metadata" },
  { key: "site_tagline", value: "Precision. Profit. Performance.", label: "Tagline", category: "general", description: "Hero tagline on landing page" },
  { key: "announcement_text", value: "", label: "Announcement Text", category: "general", description: "Global banner shown to all users (leave empty to hide)" },
  { key: "announcement_enabled", value: "false", label: "Announcement Enabled", category: "general", description: "Show/hide the global announcement banner" },
  { key: "maintenance_mode", value: "false", label: "Maintenance Mode", category: "general", description: "Puts the platform in maintenance mode" },
  { key: "support_email", value: "support@kuberquant.com", label: "Support Email", category: "contact", description: "Primary support email address" },
  { key: "support_phone", value: "", label: "Support Phone", category: "contact", description: "Support phone number" },
  { key: "support_telegram", value: "", label: "Telegram Handle", category: "contact", description: "Telegram username or link" },
  { key: "support_whatsapp", value: "", label: "WhatsApp Number", category: "contact", description: "WhatsApp support number" },
  { key: "footer_text", value: "© 2025 Kuber Quant. All rights reserved.", label: "Footer Text", category: "general", description: "Footer copyright text" },
  { key: "referral_commission_rate", value: "5", label: "Referral Commission %", category: "financial", description: "Percentage commission paid on referral investments" },
  { key: "min_deposit_fiat", value: "100", label: "Min Fiat Deposit ($)", category: "financial", description: "Minimum fiat deposit amount" },
  { key: "min_withdrawal_fiat", value: "50", label: "Min Fiat Withdrawal ($)", category: "financial", description: "Minimum fiat withdrawal amount" },
  { key: "withdrawal_fee_percent", value: "2", label: "Withdrawal Fee %", category: "financial", description: "Percentage fee deducted on withdrawals" },
  { key: "usd_inr_rate", value: "83.5", label: "USD → INR Rate", category: "financial", description: "1 USD in INR (auto-refreshed daily from live FX)" },
  { key: "usd_eur_rate", value: "0.92", label: "USD → EUR Rate", category: "financial", description: "1 USD in EUR (auto-refreshed daily)" },
  { key: "usdt_usd_rate", value: "1", label: "USDT → USD Rate", category: "financial", description: "USDT peg to USD" },
  { key: "fx_rates_updated_at", value: "", label: "FX Rates Updated At", category: "financial", description: "ISO timestamp of last FX refresh" },
  { key: "fx_rates_source", value: "fallback", label: "FX Rates Source", category: "financial", description: "Data source for exchange rates" },
  { key: "kyc_required", value: "true", label: "KYC Required", category: "financial", description: "Require KYC before deposits/withdrawals" },
  { key: "site_title_gold", value: "Kuber", label: "Header Title (Gold Part)", category: "appearance", description: "First part of the header title — shown in gold" },
  { key: "site_title_silver", value: "Quant", label: "Header Title (Silver Part)", category: "appearance", description: "Second part of the header title — shown in silver" },
  { key: "site_title_gold_color", value: "#D4AF37", label: "Gold Title Color", category: "appearance", description: "Hex color for the gold title word (default: #D4AF37)" },
  { key: "site_title_silver_color", value: "#C0C0C0", label: "Silver Title Color", category: "appearance", description: "Hex color for the silver title word (default: #C0C0C0)" },
  { key: "logo_url", value: "/kuber-quant-logo.png", label: "Logo URL", category: "appearance", description: "URL of the platform logo image" },
  { key: "favicon_url", value: "/favicon.png", label: "Favicon URL", category: "appearance", description: "URL of the favicon image" },
  { key: "primary_color", value: "#D4AF37", label: "Primary Color", category: "appearance", description: "Brand primary/accent color (hex)" },
  { key: "google_oauth_enabled", value: "false", label: "Google OAuth Enabled", category: "authentication", description: "Allow users to sign in with Google on the login page" },
  { key: "google_client_id", value: "", label: "Google OAuth Client ID", category: "authentication", description: "OAuth 2.0 Client ID from Google Cloud Console (overrides env if set)" },
];

router.get("/site-settings", requireAuth, requireAdmin, async (_req, res) => {
  let settings = await db.select().from(siteSettingsTable).orderBy(asc(siteSettingsTable.category));
  const existingKeys = new Set(settings.map(s => s.key));
  const missing = DEFAULT_SETTINGS.filter(s => !existingKeys.has(s.key));
  if (settings.length === 0) {
    await db.insert(siteSettingsTable).values(DEFAULT_SETTINGS);
    settings = await db.select().from(siteSettingsTable).orderBy(asc(siteSettingsTable.category));
  } else if (missing.length > 0) {
    await db.insert(siteSettingsTable).values(missing).onConflictDoNothing();
    settings = await db.select().from(siteSettingsTable).orderBy(asc(siteSettingsTable.category));
  }
  res.json(settings.map(s => ({ ...s, description: s.description || null, updatedAt: s.updatedAt.toISOString() })));
});

router.patch("/site-settings", requireAuth, requireAdmin, async (req, res) => {
  const updates = req.body as Record<string, string>;
  const { invalidateSiteSettingsCache } = await import("../helpers/siteSettings");
  for (const [key, value] of Object.entries(updates)) {
    const existing = DEFAULT_SETTINGS.find(s => s.key === key);
    await db.insert(siteSettingsTable).values({
      key, value: String(value),
      label: existing?.label || key,
      category: existing?.category || "general",
      description: existing?.description,
    }).onConflictDoUpdate({ target: siteSettingsTable.key, set: { value: String(value) } });
  }
  invalidateSiteSettingsCache();
  res.json({ message: "Settings updated" });
});

// ── Managers ───────────────────────────────────────────────────────────────
router.get("/managers", requireAuth, requireAdmin, async (_req, res) => {
  const managers = await db.select().from(usersTable).where(eq(usersTable.role, "manager")).orderBy(desc(usersTable.createdAt));
  res.json(managers.map(mapUser));
});

router.post("/managers", requireAuth, requireAdmin, async (req, res) => {
  const { email, password, fullName, phone } = req.body;
  if (!email || !password || !fullName) {
    res.status(400).json({ error: "email, password, fullName are required" }); return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) { res.status(409).json({ error: "Email already in use" }); return; }
  const passwordHash = await bcrypt.hash(password, 10);
  const referralCode = "KC" + Math.random().toString(36).substring(2, 8).toUpperCase();
  const [manager] = await db.insert(usersTable).values({
    email: email.toLowerCase(), passwordHash, fullName, phone: phone || null,
    role: "manager", referralCode,
  }).returning();
  res.status(201).json(mapUser(manager));
});

router.delete("/managers/:id", requireAuth, requireAdmin, async (req, res) => {
  const viewerRole = (req as any).user.role as string;
  const id = parseInt(String(req.params.id));
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!existing || existing.role !== "manager") { res.status(404).json({ error: "Manager not found" }); return; }
  if (!canViewRole(viewerRole, existing.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const [user] = await db.update(usersTable).set({ role: "user" }).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "Manager not found" }); return; }
  res.json({ message: "Manager demoted to user" });
});

router.get("/transactions/export", requireAuth, requireAdmin, async (_req, res) => {
  const txns = await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt));
  const allUsers = await db.select().from(usersTable);
  const userMap = new Map(allUsers.map(u => [u.id, u]));
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = "ID,User ID,Email,Name,Type,Amount,Currency,Status,Method,UTR,Proof,Date\n";
  const rows = txns.map(t => {
    const u = userMap.get(t.userId);
    return [
      t.id, t.userId, u?.email, u?.fullName, t.type, t.amount, t.currency,
      t.status, t.paymentMethod, t.utrReference, t.proofUrl, t.createdAt.toISOString(),
    ].map(escape).join(",");
  }).join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="transactions-${Date.now()}.csv"`);
  res.send(header + rows);
});

router.post("/broadcast", requireAuth, requireAdmin, async (req, res) => {
  const { subject, message, role } = req.body;
  if (!subject || !message) {
    res.status(400).json({ error: "subject and message are required" });
    return;
  }
  const allUsers = await db.select().from(usersTable);
  const targets = role
    ? allUsers.filter(u => u.role === role)
    : allUsers.filter(u => u.role === "user");
  let sent = 0;
  for (const u of targets) {
    const ok = await sendTransactionalEmail({
      to: u.email,
      purpose: "broadcast",
      subject,
      html: `<p>${String(message).replace(/\n/g, "<br>")}</p>`,
      text: message,
    });
    if (ok) sent++;
    await db.insert(notificationsTable).values({
      userId: u.id, title: subject, message, type: "info", isRead: false,
    });
  }
  res.json({ sent, total: targets.length });
});

export default router;
