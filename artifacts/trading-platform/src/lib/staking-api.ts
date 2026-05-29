import { authFetchJson, publicFetchJson } from "./api-fetch";

export type StakingPlan = {
  id: number;
  name: string;
  description: string | null;
  planType: string;
  currency: string;
  minAmount: number;
  maxAmount: number;
  aprPercent: number;
  apyPercent: number;
  roiPercent: number;
  lockDurationDays: number;
  isFlexible: boolean;
  rewardFrequency: string;
  compoundEnabled: boolean;
  autoRenew: boolean;
  earlyWithdrawalPenalty: number;
  promotionalBonusPercent: number;
  isFeatured: boolean;
  isPopular: boolean;
  isRecommended: boolean;
  riskLevel: string;
  themeColor: string | null;
  iconKey: string | null;
  totalStaked: number;
  activeStakers: number;
};

export type UserStake = {
  id: number;
  planId: number;
  planName: string;
  principal: number;
  currency: string;
  aprPercent: number;
  apyPercent: number;
  accruedRewards: number;
  claimedRewards: number;
  pendingRewards: number;
  autoReinvest: boolean;
  compoundEnabled: boolean;
  status: string;
  startedAt: string | null;
  maturesAt: string | null;
  lastRewardAt: string | null;
  createdAt: string;
};

export type StakingDashboard = {
  totalStaked: number;
  totalRewardsEarned: number;
  pendingRewards: number;
  claimedRewards: number;
  activeStakes: number;
  maturedStakes: number;
  walletFiat: number;
  walletCrypto: number;
  portfolio: Array<{ planName: string; principal: number; currency: string; status: string }>;
};

export async function fetchStakingPlans() {
  return publicFetchJson<StakingPlan[]>("/staking/plans");
}

export async function fetchStakingDashboard() {
  return authFetchJson<StakingDashboard>("/staking/dashboard");
}

export async function fetchMyStakes(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return authFetchJson<UserStake[]>(`/staking/stakes${q}`);
}

export async function fetchStakeDetail(id: number) {
  return authFetchJson<UserStake & { rewardHistory: Array<{ id: number; amount: number; rewardType: string; note: string | null; processedAt: string }> }>(
    `/staking/stakes/${id}`,
  );
}

export async function projectStakingReturns(body: {
  principal: number;
  aprPercent: number;
  durationDays: number;
  compoundEnabled?: boolean;
  rewardFrequency?: string;
}) {
  return publicFetchJson<{
    estimatedReward: number;
    estimatedTotal: number;
    simpleInterest: number;
    compoundInterest: number;
  }>("/staking/project", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function createStake(body: { planId: number; amount: number; autoReinvest?: boolean; agreementAccepted: true }) {
  return authFetchJson<UserStake>("/staking/stakes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function claimStakeRewards(stakeId: number, amount?: number) {
  return authFetchJson<{ status: string; amount?: number }>(`/staking/stakes/${stakeId}/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(amount != null ? { amount } : {}),
  });
}

export async function withdrawStakeEarly(stakeId: number) {
  return authFetchJson<{ status: string; amount: number; penalty: number }>(`/staking/stakes/${stakeId}/withdraw-early`, {
    method: "POST",
  });
}
