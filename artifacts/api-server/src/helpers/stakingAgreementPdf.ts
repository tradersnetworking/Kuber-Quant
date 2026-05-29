import { generateAgreementPDF } from "./pdfGenerator";
import { buildUserCollectedPlaceholders } from "./userDataPlaceholders";
import type { AgreementTemplateContent } from "./agreementTemplates";
import type { usersTable, stakingPlansTable, userStakesTable } from "@workspace/db";

const STAKING_RISK = `Crypto staking involves locking digital assets for a defined period. Rewards are variable and depend on plan APR/APY, network conditions, and platform operations. Early withdrawal from locked plans may incur penalties. Staked assets are subject to market volatility, smart-contract/platform risk, and operational risk. Kuber Quant does not guarantee fixed returns.`;

export async function generateStakingAgreementPdf(opts: {
  user: typeof usersTable.$inferSelect;
  plan: typeof stakingPlansTable.$inferSelect;
  stake: typeof userStakesTable.$inferSelect;
  amount: number;
  ipAddress?: string;
}) {
  const { user, plan, stake, amount, ipAddress } = opts;
  const placeholders = buildUserCollectedPlaceholders({ user });
  const agreementUid = `KQ-STK-${stake.id}-${new Date().getFullYear()}`;
  const agreementDate = new Date().toLocaleDateString("en-GB");

  const filledData: Record<string, string> = {
    ...placeholders,
    AGREEMENT_UID: agreementUid,
    AGREEMENT_DATE: agreementDate,
    PLAN_NAME: plan.name,
    INVESTMENT_AMOUNT: amount.toLocaleString("en-IN", { maximumFractionDigits: 8 }),
    CURRENCY: plan.currency,
    ROI_RATE: String(plan.aprPercent),
    APR_RATE: String(plan.aprPercent),
    APY_RATE: String(plan.apyPercent),
    LOCK_DURATION: plan.isFlexible ? "Flexible (no fixed lock)" : `${plan.lockDurationDays} days`,
    REWARD_FREQUENCY: plan.rewardFrequency,
    COMPOUND_ENABLED: plan.compoundEnabled ? "Yes" : "No",
    EARLY_WITHDRAWAL_PENALTY: `${plan.earlyWithdrawalPenalty}%`,
    STAKE_ID: String(stake.id),
    IP_ADDRESS: ipAddress ?? stake.agreementIp ?? "—",
    PDF_HASH: "Generated upon acceptance",
  };

  const template: AgreementTemplateContent = {
    type: "investment",
    title: "KUBER QUANT CRYPTO STAKING AGREEMENT",
    sections: [
      {
        heading: "PARTIES & STAKING DETAILS",
        body: `This Crypto Staking Agreement is entered into on ${agreementDate} between Kuber Quant and ${filledData.FULL_NAME || user.fullName} (${filledData.EMAIL || user.email}).\n\nPlan: ${plan.name}\nPrincipal: ${amount} ${plan.currency}\nAPR: ${plan.aprPercent}% · APY: ${plan.apyPercent}%\nLock: ${filledData.LOCK_DURATION}\nStake Reference: ${agreementUid}`,
      },
      {
        heading: "STAKING TERMS",
        body: `(a) The Investor authorizes Kuber Quant to allocate the stated principal to the selected staking plan.\n(b) Rewards accrue per the plan schedule (${plan.rewardFrequency}) and may be claimed per platform rules.\n(c) Auto-reinvest and compound settings apply as selected at stake creation.\n(d) Maturity date (if applicable): ${stake.maturesAt ? new Date(stake.maturesAt).toLocaleDateString("en-GB") : "Flexible — no fixed maturity"}.\n(e) Early withdrawal from locked plans is subject to a penalty of ${plan.earlyWithdrawalPenalty}% unless otherwise stated.`,
      },
      {
        heading: "RISK DISCLOSURE",
        body: STAKING_RISK,
      },
      {
        heading: "AML/KYC & ACCEPTANCE",
        body: `The Investor confirms KYC status: ${filledData.KYC_STATUS || user.kycStatus}. Funds are from lawful sources. Acceptance recorded at ${stake.agreementAcceptedAt ? new Date(stake.agreementAcceptedAt).toISOString() : agreementDate} from IP ${filledData.IP_ADDRESS}.`,
      },
      {
        heading: "VERIFICATION",
        body: `Agreement Reference: ${agreementUid}\nVerification Hash: {{PDF_HASH}}`,
      },
    ],
  };

  return generateAgreementPDF({
    template,
    filledData,
    agreementUid,
    userName: user.fullName || user.email,
  });
}
