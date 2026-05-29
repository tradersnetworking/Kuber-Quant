import type { AlgoStrategy } from "@workspace/api-client-react";

export type AlgoPlanKey = "monthly" | "quarterly" | "biannual" | "annual";

/** Resolve tier prices; derive discounted tiers from monthly when DB values are missing or equal. */
export function resolveAlgoPlanPrices(strategy: Pick<AlgoStrategy, "priceMonthly" | "priceQuarterly" | "priceBiannual" | "priceAnnual">) {
  const monthly = Number(strategy.priceMonthly ?? 99) || 99;
  const quarterlyRaw = Number(strategy.priceQuarterly);
  const biannualRaw = Number(strategy.priceBiannual);
  const annualRaw = Number(strategy.priceAnnual);

  const quarterly = quarterlyRaw > monthly ? quarterlyRaw : Math.round(monthly * 2.5);
  const biannual = biannualRaw > quarterly ? biannualRaw : Math.round(monthly * 4.5);
  const annual = annualRaw > biannual ? annualRaw : Math.round(monthly * 8);

  return { monthly, quarterly, biannual, annual } satisfies Record<AlgoPlanKey, number>;
}

export function getAlgoPlanPrice(
  strategy: Pick<AlgoStrategy, "priceMonthly" | "priceQuarterly" | "priceBiannual" | "priceAnnual">,
  plan: string,
): number {
  const prices = resolveAlgoPlanPrices(strategy);
  return prices[plan as AlgoPlanKey] ?? prices.monthly;
}
