import { Router } from "express";
import {
  db,
  stakingPlansTable,
  userStakesTable,
  stakingRewardLogsTable,
  stakeClaimsTable,
  stakingAdminActionsTable,
  stakingRoiHistoryTable,
  usersTable,
} from "@workspace/db";
import { eq, and, desc, asc, sql } from "@workspace/db/orm";
import { requireAuth, requirePlatformAdmin } from "../middlewares/auth";
import { validateBody, getValidatedBody } from "../middlewares/validate";
import {
  CreateStakeBody,
  ClaimStakeRewardBody,
  StakingPlanBody,
  StakingPlanPatchBody,
  StakingSettingsBody,
  StakingProjectionBody,
  ManualStakeRewardBody,
} from "../lib/routeBodySchemas";
import { debitWallet, creditWallet, WalletError } from "../helpers/walletService";
import { validateInvestmentFunding } from "../helpers/investmentFundingService";
import { clientIp } from "../helpers/trustedDeviceService";
import {
  getStakingSettings,
  updateStakingSettings,
  projectEarnings,
  processStakingRewardsCycle,
  manualCreditStakeReward,
  getStakingDashboardStats,
  getPlatformStakingStats,
  aprToApy,
  settleMaturedStake,
} from "../helpers/stakingEngine";
import { notifyUser } from "../helpers/notificationService";
import { generateStakingAgreementPdf } from "../helpers/stakingAgreementPdf";

const router = Router();

function mapPlan(p: typeof stakingPlansTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    planType: p.planType,
    currency: p.currency,
    minAmount: Number(p.minAmount),
    maxAmount: Number(p.maxAmount),
    aprPercent: Number(p.aprPercent),
    apyPercent: Number(p.apyPercent),
    roiPercent: Number(p.roiPercent),
    lockDurationDays: p.lockDurationDays,
    isFlexible: p.isFlexible,
    rewardFrequency: p.rewardFrequency,
    compoundEnabled: p.compoundEnabled,
    autoRenew: p.autoRenew,
    earlyWithdrawalPenalty: Number(p.earlyWithdrawalPenalty),
    promotionalBonusPercent: Number(p.promotionalBonusPercent),
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    isPopular: p.isPopular,
    isRecommended: p.isRecommended,
    riskLevel: p.riskLevel,
    maxUsers: p.maxUsers,
    totalPoolLimit: p.totalPoolLimit ? Number(p.totalPoolLimit) : null,
    totalStaked: Number(p.totalStaked),
    activeStakers: p.activeStakers,
    themeColor: p.themeColor,
    iconKey: p.iconKey,
    sortOrder: p.sortOrder,
    promoEndsAt: p.promoEndsAt?.toISOString() ?? null,
  };
}

function mapStake(s: typeof userStakesTable.$inferSelect) {
  return {
    id: s.id,
    planId: s.planId,
    planName: s.planName,
    principal: Number(s.principal),
    currency: s.currency,
    aprPercent: Number(s.aprPercent),
    apyPercent: Number(s.apyPercent),
    roiPercent: Number(s.roiPercent),
    accruedRewards: Number(s.accruedRewards),
    claimedRewards: Number(s.claimedRewards),
    pendingRewards: Number(s.pendingRewards),
    autoReinvest: s.autoReinvest,
    compoundEnabled: s.compoundEnabled,
    status: s.status,
    startedAt: s.startedAt?.toISOString() ?? null,
    maturesAt: s.maturesAt?.toISOString() ?? null,
    lastRewardAt: s.lastRewardAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/settings/public", async (_req, res) => {
  const settings = await getStakingSettings();
  res.json({
    stakingEnabled: settings.stakingEnabled,
    defaultCurrency: settings.defaultCurrency,
  });
});

router.get("/plans", async (_req, res) => {
  try {
    const settings = await getStakingSettings();
    if (!settings.stakingEnabled) {
      res.json([]);
      return;
    }
    const plans = await db
      .select()
      .from(stakingPlansTable)
      .where(eq(stakingPlansTable.isActive, true))
      .orderBy(asc(stakingPlansTable.sortOrder), asc(stakingPlansTable.id));
    res.json(plans.map(mapPlan));
  } catch {
    res.json([]);
  }
});

router.get("/plans/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [plan] = await db.select().from(stakingPlansTable).where(eq(stakingPlansTable.id, id)).limit(1);
  if (!plan || !plan.isActive) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  res.json(mapPlan(plan));
});

router.post("/project", validateBody(StakingProjectionBody), async (req, res) => {
  const body = getValidatedBody<{
    principal: number;
    aprPercent: number;
    apyPercent?: number;
    durationDays: number;
    compoundEnabled?: boolean;
    rewardFrequency?: string;
  }>(req);
  const apy = body.apyPercent ?? aprToApy(body.aprPercent);
  res.json(
    projectEarnings({
      principal: body.principal,
      aprPercent: body.aprPercent,
      apyPercent: apy,
      durationDays: body.durationDays,
      compoundEnabled: body.compoundEnabled ?? false,
      rewardFrequency: body.rewardFrequency ?? "daily",
    }),
  );
});

router.get("/dashboard", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  res.json(await getStakingDashboardStats(userId));
});

router.get("/stakes", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const status = req.query.status as string | undefined;
  let query = db.select().from(userStakesTable).where(eq(userStakesTable.userId, userId)).orderBy(desc(userStakesTable.createdAt));
  const rows = await query;
  const filtered = status ? rows.filter((r) => r.status === status) : rows;
  res.json(filtered.map(mapStake));
});

router.get("/stakes/:id", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const id = Number(req.params.id);
  const [stake] = await db
    .select()
    .from(userStakesTable)
    .where(and(eq(userStakesTable.id, id), eq(userStakesTable.userId, userId)))
    .limit(1);
  if (!stake) {
    res.status(404).json({ error: "Stake not found" });
    return;
  }
  const rewards = await db
    .select()
    .from(stakingRewardLogsTable)
    .where(eq(stakingRewardLogsTable.stakeId, id))
    .orderBy(desc(stakingRewardLogsTable.processedAt))
    .limit(50);
  res.json({
    ...mapStake(stake),
    rewardHistory: rewards.map((r) => ({
      id: r.id,
      amount: Number(r.amount),
      rewardType: r.rewardType,
      note: r.note,
      processedAt: r.processedAt.toISOString(),
    })),
  });
});

router.post("/stakes", requireAuth, validateBody(CreateStakeBody), async (req, res) => {
  const { userId } = (req as any).user;
  const settings = await getStakingSettings();
  if (!settings.stakingEnabled) {
    res.status(403).json({ error: "Staking is currently disabled" });
    return;
  }

  const body = getValidatedBody<{
    planId: number;
    amount: number;
    autoReinvest?: boolean;
    agreementAccepted: boolean;
  }>(req);

  if (!body.agreementAccepted) {
    res.status(400).json({ error: "Staking agreement must be accepted" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (user?.kycStatus !== "verified") {
    res.status(400).json({ error: "KYC verification required before staking" });
    return;
  }

  const [plan] = await db
    .select()
    .from(stakingPlansTable)
    .where(and(eq(stakingPlansTable.id, body.planId), eq(stakingPlansTable.isActive, true)))
    .limit(1);
  if (!plan) {
    res.status(404).json({ error: "Staking plan not found" });
    return;
  }

  const amount = Number(body.amount);
  if (amount < Number(plan.minAmount) || amount > Number(plan.maxAmount)) {
    res.status(400).json({ error: `Amount must be between ${plan.minAmount} and ${plan.maxAmount}` });
    return;
  }

  if (plan.totalPoolLimit && Number(plan.totalStaked) + amount > Number(plan.totalPoolLimit)) {
    res.status(400).json({ error: "Plan pool limit reached" });
    return;
  }

  const funding = await validateInvestmentFunding(userId, amount, plan.currency);
  if (!funding.ok) {
    res.status(400).json({ error: funding.message, code: "INSUFFICIENT_BALANCE" });
    return;
  }

  try {
    await debitWallet({
      userId,
      amount,
      currency: plan.currency,
      type: "investment",
      description: `Stake in ${plan.name}`,
    });
  } catch (err) {
    if (err instanceof WalletError) {
      res.status(400).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }

  const startedAt = new Date();
  const maturesAt = plan.isFlexible ? null : new Date(startedAt.getTime() + plan.lockDurationDays * 86400000);

  const [stake] = await db
    .insert(userStakesTable)
    .values({
      userId,
      planId: plan.id,
      planName: plan.name,
      principal: String(amount),
      currency: plan.currency,
      aprPercent: plan.aprPercent,
      apyPercent: plan.apyPercent,
      roiPercent: plan.roiPercent,
      autoReinvest: body.autoReinvest ?? plan.autoRenew,
      compoundEnabled: plan.compoundEnabled,
      status: "active",
      startedAt,
      maturesAt,
      agreementAcceptedAt: new Date(),
      agreementIp: clientIp(req),
      clientMeta: { userAgent: req.headers["user-agent"] ?? null },
    })
    .returning();

  await db
    .update(stakingPlansTable)
    .set({
      totalStaked: sql`${stakingPlansTable.totalStaked} + ${amount}`,
      activeStakers: sql`${stakingPlansTable.activeStakers} + 1`,
    })
    .where(eq(stakingPlansTable.id, plan.id));

  await notifyUser({
    userId,
    title: "Stake Created",
    message: `You staked ${amount} ${plan.currency} in ${plan.name}.`,
    type: "success",
    category: "investment",
    actionUrl: `/earn/staking/${stake!.id}`,
  });

  res.status(201).json({ ...mapStake(stake!), agreementAvailable: true });
});

router.get("/agreement/preview", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const planId = Number(req.query.planId);
  const amount = Number(req.query.amount ?? 0);
  if (!planId || !Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: "planId and amount are required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const [plan] = await db.select().from(stakingPlansTable).where(eq(stakingPlansTable.id, planId)).limit(1);
  if (!user || !plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  const previewStake = {
    id: 0,
    userId,
    planId: plan.id,
    planName: plan.name,
    principal: String(amount),
    currency: plan.currency,
    aprPercent: plan.aprPercent,
    apyPercent: plan.apyPercent,
    roiPercent: plan.roiPercent,
    accruedRewards: "0",
    claimedRewards: "0",
    pendingRewards: "0",
    autoReinvest: false,
    compoundEnabled: plan.compoundEnabled,
    status: "preview",
    startedAt: new Date(),
    maturesAt: plan.isFlexible ? null : new Date(Date.now() + plan.lockDurationDays * 86400000),
    lastRewardAt: null,
    agreementAcceptedAt: new Date(),
    agreementIp: clientIp(req),
    clientMeta: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as typeof userStakesTable.$inferSelect;

  const { buffer } = await generateStakingAgreementPdf({
    user,
    plan,
    stake: previewStake,
    amount,
    ipAddress: clientIp(req),
  });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="staking-agreement-preview.pdf"`);
  res.send(buffer);
});

router.get("/stakes/:id/agreement", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const id = Number(req.params.id);
  const [stake] = await db
    .select()
    .from(userStakesTable)
    .where(and(eq(userStakesTable.id, id), eq(userStakesTable.userId, userId)))
    .limit(1);
  if (!stake) {
    res.status(404).json({ error: "Stake not found" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const [plan] = await db.select().from(stakingPlansTable).where(eq(stakingPlansTable.id, stake.planId)).limit(1);
  if (!user || !plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  const { buffer } = await generateStakingAgreementPdf({
    user,
    plan,
    stake,
    amount: Number(stake.principal),
    ipAddress: stake.agreementIp ?? undefined,
  });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="staking-agreement-${id}.pdf"`);
  res.send(buffer);
});

router.post("/stakes/:id/claim", requireAuth, validateBody(ClaimStakeRewardBody), async (req, res) => {
  const { userId } = (req as any).user;
  const stakeId = Number(req.params.id);
  const body = getValidatedBody<{ amount?: number }>(req);

  const [stake] = await db
    .select()
    .from(userStakesTable)
    .where(and(eq(userStakesTable.id, stakeId), eq(userStakesTable.userId, userId)))
    .limit(1);
  if (!stake || stake.status !== "active") {
    res.status(404).json({ error: "Active stake not found" });
    return;
  }

  const settings = await getStakingSettings();
  const claimAmount = body.amount ?? Number(stake.pendingRewards);
  if (claimAmount <= 0) {
    res.status(400).json({ error: "No rewards available to claim" });
    return;
  }
  if (claimAmount > Number(stake.pendingRewards)) {
    res.status(400).json({ error: "Claim amount exceeds pending rewards" });
    return;
  }

  if (settings.manualApprovalRequired) {
    const [claim] = await db
      .insert(stakeClaimsTable)
      .values({
        stakeId,
        userId,
        amount: String(claimAmount),
        currency: stake.currency,
        claimType: "reward",
        status: "pending",
        clientIp: clientIp(req),
      })
      .returning();
    res.json({ status: "pending_approval", claimId: claim!.id });
    return;
  }

  await creditWallet({
    userId,
    amount: claimAmount,
    currency: stake.currency,
    type: "profit",
    referenceType: "staking",
    referenceId: stakeId,
    description: `Staking reward claim — ${stake.planName}`,
  });

  await db
    .update(userStakesTable)
    .set({
      pendingRewards: String(Number(stake.pendingRewards) - claimAmount),
      claimedRewards: String(Number(stake.claimedRewards) + claimAmount),
    })
    .where(eq(userStakesTable.id, stakeId));

  res.json({ status: "claimed", amount: claimAmount });
});

router.post("/stakes/:id/withdraw-early", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const stakeId = Number(req.params.id);
  const [stake] = await db
    .select()
    .from(userStakesTable)
    .where(and(eq(userStakesTable.id, stakeId), eq(userStakesTable.userId, userId)))
    .limit(1);
  if (!stake || stake.status !== "active") {
    res.status(404).json({ error: "Active stake not found" });
    return;
  }

  const [plan] = await db.select().from(stakingPlansTable).where(eq(stakingPlansTable.id, stake.planId)).limit(1);
  if (plan?.isFlexible) {
    const principal = Number(stake.principal);
    await creditWallet({
      userId,
      amount: principal,
      currency: stake.currency,
      type: "investment",
      referenceType: "staking",
      referenceId: stakeId,
      description: `Flexible stake withdrawal — ${stake.planName}`,
    });
    await db.update(userStakesTable).set({ status: "withdrawn" }).where(eq(userStakesTable.id, stakeId));
    res.json({ status: "withdrawn", amount: principal, penalty: 0 });
    return;
  }

  const penaltyPct = Number(plan?.earlyWithdrawalPenalty ?? 0);
  const principal = Number(stake.principal);
  const penalty = (principal * penaltyPct) / 100;
  const payout = principal - penalty;

  await creditWallet({
    userId,
    amount: payout,
    currency: stake.currency,
    type: "investment",
    referenceType: "staking",
    referenceId: stakeId,
    description: `Early stake withdrawal (${penaltyPct}% penalty) — ${stake.planName}`,
  });

  await db.update(userStakesTable).set({ status: "withdrawn" }).where(eq(userStakesTable.id, stakeId));
  res.json({ status: "withdrawn", amount: payout, penalty });
});

router.get("/rewards", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const logs = await db
    .select()
    .from(stakingRewardLogsTable)
    .where(eq(stakingRewardLogsTable.userId, userId))
    .orderBy(desc(stakingRewardLogsTable.processedAt))
    .limit(100);
  res.json(
    logs.map((r) => ({
      id: r.id,
      stakeId: r.stakeId,
      amount: Number(r.amount),
      currency: r.currency,
      rewardType: r.rewardType,
      note: r.note,
      processedAt: r.processedAt.toISOString(),
    })),
  );
});

// ─── Admin routes ───────────────────────────────────────────────────────────

const admin = Router();
admin.use(requireAuth, requirePlatformAdmin);

admin.get("/stats", async (_req, res) => {
  res.json(await getPlatformStakingStats());
});

admin.get("/settings", async (_req, res) => {
  res.json(await getStakingSettings());
});

admin.patch("/settings", validateBody(StakingSettingsBody), async (req, res) => {
  const { userId } = (req as any).user;
  const body = getValidatedBody<Record<string, unknown>>(req);
  const updated = await updateStakingSettings(body as any, userId);
  await db.insert(stakingAdminActionsTable).values({
    adminId: userId,
    action: "update_settings",
    payload: body,
    ipAddress: clientIp(req),
  });
  res.json(updated);
});

admin.get("/plans", async (_req, res) => {
  const plans = await db.select().from(stakingPlansTable).orderBy(asc(stakingPlansTable.sortOrder));
  res.json(plans.map(mapPlan));
});

admin.post("/plans", validateBody(StakingPlanBody), async (req, res) => {
  const { userId } = (req as any).user;
  const body = getValidatedBody<any>(req);
  const apy = body.apyPercent ?? aprToApy(Number(body.aprPercent));
  const [plan] = await db
    .insert(stakingPlansTable)
    .values({
      ...body,
      minAmount: String(body.minAmount),
      maxAmount: String(body.maxAmount),
      aprPercent: String(body.aprPercent),
      apyPercent: String(apy),
      roiPercent: String(body.roiPercent ?? body.aprPercent),
      earlyWithdrawalPenalty: String(body.earlyWithdrawalPenalty ?? 0),
      promotionalBonusPercent: String(body.promotionalBonusPercent ?? 0),
      totalPoolLimit: body.totalPoolLimit != null ? String(body.totalPoolLimit) : null,
    })
    .returning();
  await db.insert(stakingAdminActionsTable).values({
    adminId: userId,
    action: "create_plan",
    targetType: "plan",
    targetId: plan!.id,
    ipAddress: clientIp(req),
  });
  res.status(201).json(mapPlan(plan!));
});

admin.patch("/plans/:id", validateBody(StakingPlanPatchBody), async (req, res) => {
  const { userId } = (req as any).user;
  const id = Number(req.params.id);
  const [existing] = await db.select().from(stakingPlansTable).where(eq(stakingPlansTable.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  const body = getValidatedBody<any>(req);
  const patch: Record<string, unknown> = { ...body };
  if (body.minAmount != null) patch.minAmount = String(body.minAmount);
  if (body.maxAmount != null) patch.maxAmount = String(body.maxAmount);
  if (body.aprPercent != null) {
    patch.aprPercent = String(body.aprPercent);
    patch.apyPercent = String(body.apyPercent ?? aprToApy(Number(body.aprPercent)));
  }
  if (body.roiPercent != null) patch.roiPercent = String(body.roiPercent);
  if (body.earlyWithdrawalPenalty != null) patch.earlyWithdrawalPenalty = String(body.earlyWithdrawalPenalty);
  if (body.promotionalBonusPercent != null) patch.promotionalBonusPercent = String(body.promotionalBonusPercent);
  if (body.totalPoolLimit != null) patch.totalPoolLimit = String(body.totalPoolLimit);

  const [plan] = await db.update(stakingPlansTable).set(patch).where(eq(stakingPlansTable.id, id)).returning();

  if (body.aprPercent != null) {
    await db.insert(stakingRoiHistoryTable).values({
      planId: id,
      previousApr: existing.aprPercent,
      newApr: String(body.aprPercent),
      previousApy: existing.apyPercent,
      newApy: patch.apyPercent as string,
      previousRoi: existing.roiPercent,
      newRoi: patch.roiPercent as string ?? String(body.aprPercent),
      changedBy: userId,
      reason: body.changeReason ?? "Admin update",
    });
  }

  await db.insert(stakingAdminActionsTable).values({
    adminId: userId,
    action: "update_plan",
    targetType: "plan",
    targetId: id,
    payload: body,
    ipAddress: clientIp(req),
  });
  res.json(mapPlan(plan!));
});

admin.delete("/plans/:id", async (req, res) => {
  const { userId } = (req as any).user;
  const id = Number(req.params.id);
  await db.update(stakingPlansTable).set({ isActive: false }).where(eq(stakingPlansTable.id, id));
  await db.insert(stakingAdminActionsTable).values({
    adminId: userId,
    action: "deactivate_plan",
    targetType: "plan",
    targetId: id,
    ipAddress: clientIp(req),
  });
  res.json({ ok: true });
});

admin.get("/stakes", async (_req, res) => {
  const rows = await db.select().from(userStakesTable).orderBy(desc(userStakesTable.createdAt)).limit(500);
  res.json(rows.map(mapStake));
});

admin.post("/process-rewards", async (_req, res) => {
  const result = await processStakingRewardsCycle();
  res.json(result);
});

admin.post("/stakes/:id/manual-reward", validateBody(ManualStakeRewardBody), async (req, res) => {
  const { userId } = (req as any).user;
  const stakeId = Number(req.params.id);
  const body = getValidatedBody<{ amount: number; remarks?: string }>(req);
  await manualCreditStakeReward({
    stakeId,
    amount: body.amount,
    adminId: userId,
    remarks: body.remarks,
  });
  await db.insert(stakingAdminActionsTable).values({
    adminId: userId,
    action: "manual_reward",
    targetType: "stake",
    targetId: stakeId,
    payload: body,
    ipAddress: clientIp(req),
  });
  res.json({ ok: true });
});

admin.post("/stakes/:id/settle", async (req, res) => {
  const { userId } = (req as any).user;
  const stakeId = Number(req.params.id);
  await settleMaturedStake(stakeId);
  await db.insert(stakingAdminActionsTable).values({
    adminId: userId,
    action: "force_settle",
    targetType: "stake",
    targetId: stakeId,
    ipAddress: clientIp(req),
  });
  res.json({ ok: true });
});

admin.get("/claims", async (_req, res) => {
  const claims = await db.select().from(stakeClaimsTable).orderBy(desc(stakeClaimsTable.createdAt)).limit(200);
  res.json(claims);
});

admin.post("/claims/:id/approve", async (req, res) => {
  const { userId } = (req as any).user;
  const claimId = Number(req.params.id);
  const [claim] = await db.select().from(stakeClaimsTable).where(eq(stakeClaimsTable.id, claimId)).limit(1);
  if (!claim || claim.status !== "pending") {
    res.status(404).json({ error: "Pending claim not found" });
    return;
  }
  const amount = Number(claim.amount);
  await creditWallet({
    userId: claim.userId,
    amount,
    currency: claim.currency,
    type: "profit",
    referenceType: "staking_claim",
    referenceId: claim.id,
    description: "Approved staking reward claim",
  });
  const [stake] = await db.select().from(userStakesTable).where(eq(userStakesTable.id, claim.stakeId)).limit(1);
  if (stake) {
    await db
      .update(userStakesTable)
      .set({
        pendingRewards: String(Math.max(0, Number(stake.pendingRewards) - amount)),
        claimedRewards: String(Number(stake.claimedRewards) + amount),
      })
      .where(eq(userStakesTable.id, stake.id));
  }
  await db
    .update(stakeClaimsTable)
    .set({ status: "processed", processedBy: userId, processedAt: new Date() })
    .where(eq(stakeClaimsTable.id, claimId));
  res.json({ ok: true });
});

admin.get("/audit", async (_req, res) => {
  const rows = await db
    .select()
    .from(stakingAdminActionsTable)
    .orderBy(desc(stakingAdminActionsTable.createdAt))
    .limit(200);
  res.json(rows);
});

router.use("/admin", admin);

export default router;
