import { useQuery } from "@tanstack/react-query";
import { financeQueryOptions } from "@/lib/invalidate-finance-queries";

export type InvestmentFundingSnapshot = {
  currency: string;
  walletType: "fiat" | "crypto";
  availableBalance: number;
  availableBalanceInr: number | null;
  activeInvested: number;
  activeInvestedInr: number | null;
  activeInvestmentCount: number;
  totalPortfolio: number;
  totalPortfolioInr: number | null;
};

export type InsufficientInvestmentBalancePayload = InvestmentFundingSnapshot & {
  code: "INSUFFICIENT_BALANCE";
  requestedAmount: number;
  shortfall: number;
  message: string;
};

import { authFetchJson } from "@/lib/api-fetch";

async function fetchInvestmentFunding(currency: string): Promise<InvestmentFundingSnapshot> {
  return authFetchJson<InvestmentFundingSnapshot>(
    `/investments/funding-status?currency=${encodeURIComponent(currency)}`,
  );
}

export function useInvestmentFunding(currency: string, enabled = true) {
  return useQuery({
    queryKey: ["/api/investments/funding-status", currency],
    queryFn: () => fetchInvestmentFunding(currency),
    enabled: enabled && !!currency,
    ...(financeQueryOptions as object),
  });
}

export function parseInsufficientInvestmentError(err: unknown): InsufficientInvestmentBalancePayload | null {
  const data = (err as { data?: InsufficientInvestmentBalancePayload })?.data;
  if (data?.code === "INSUFFICIENT_BALANCE") return data;
  return null;
}

export function currencySymbol(currency: string): string {
  const cur = currency.toUpperCase();
  if (cur === "INR") return "₹";
  if (cur === "EUR") return "€";
  if (["BTC", "ETH", "USDT", "TRX", "BNB"].includes(cur)) return "";
  return "$";
}

export function formatFundingAmount(amount: number, currency: string): string {
  const sym = currencySymbol(currency);
  const isCrypto = ["BTC", "ETH"].includes(currency.toUpperCase());
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: isCrypto ? 4 : 2,
    maximumFractionDigits: isCrypto ? 8 : 2,
  });
  if (sym === "₹") return `${sym}${formatted}`;
  if (sym === "€") return `${sym}${formatted}`;
  if (sym === "$") return `${sym}${formatted}`;
  return `${formatted} ${currency.toUpperCase()}`;
}
