import {
  db,
  investmentPlansTable,
  stakingPlansTable,
  copyTradersTable,
  algoStrategiesTable,
} from "@workspace/db";
import { asc, desc } from "@workspace/db/orm";
import { mapPlan } from "../routes/plans";

/**
 * Read-only catalog listings shared by manager and support-team portals.
 * These mirror the shapes returned by the super-admin CRUD routes so the same
 * front-end panels can render them in read-only mode.
 */

export async function listInvestmentPlansCatalog() {
  const plans = await db.select().from(investmentPlansTable).orderBy(investmentPlansTable.id);
  return plans.map(mapPlan);
}

function mapStakingPlanCatalog(p: typeof stakingPlansTable.$inferSelect) {
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

export async function listStakingPlansCatalog() {
  const plans = await db.select().from(stakingPlansTable).orderBy(asc(stakingPlansTable.sortOrder));
  return plans.map(mapStakingPlanCatalog);
}

function mapCopyTraderCatalog(t: typeof copyTradersTable.$inferSelect) {
  return {
    id: t.id, name: t.name, avatarUrl: t.avatarUrl, bio: t.bio,
    roi: Number(t.roi), monthlyRoi: Number(t.monthlyRoi), followers: t.followers,
    winRate: Number(t.winRate), totalTrades: t.totalTrades, status: t.status,
    minInvestment: Number(t.minInvestment), riskLevel: t.riskLevel,
    createdAt: t.createdAt.toISOString(),
  };
}

export async function listCopyTradersCatalog() {
  const traders = await db.select().from(copyTradersTable).orderBy(desc(copyTradersTable.createdAt));
  return traders.map(mapCopyTraderCatalog);
}

function mapAlgoStrategyCatalog(s: typeof algoStrategiesTable.$inferSelect) {
  return {
    id: s.id, name: s.name, description: s.description,
    roi: Number(s.roi), riskLevel: s.riskLevel, subscribers: s.subscribers,
    status: s.status, minInvestment: Number(s.minInvestment), currency: s.currency,
    priceMonthly: Number(s.priceMonthly),
    priceQuarterly: Number(s.priceQuarterly),
    priceBiannual: Number(s.priceBiannual),
    priceAnnual: Number(s.priceAnnual),
    createdAt: s.createdAt.toISOString(),
  };
}

export async function listAlgoStrategiesCatalog() {
  const strategies = await db.select().from(algoStrategiesTable).orderBy(desc(algoStrategiesTable.createdAt));
  return strategies.map(mapAlgoStrategyCatalog);
}

export async function listEaStrategyCatalog() {
  const { getEaCatalog } = await import("./eaCatalog");
  return getEaCatalog();
}
