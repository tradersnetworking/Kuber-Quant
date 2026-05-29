export type ExchangeRateRow = {
  symbol: string;
  network: string;
  label: string;
  platformSellRateUsd: number;
  platformBuyRateUsd: number;
  platformSellRateFiat: number;
  platformBuyRateFiat: number;
  fiatCurrency: string;
};

export function cryptoDisplayName(rate: { symbol: string; label: string }): string {
  const sym = rate.symbol.toUpperCase();
  if (rate.label && !rate.label.toLowerCase().includes(sym.toLowerCase())) return rate.label;
  if (sym === "USDT") return "Tether (USDT)";
  if (sym === "BTC") return "Bitcoin (BTC)";
  if (sym === "ETH") return "Ethereum (ETH)";
  if (sym === "TRX") return "Tron (TRX)";
  if (sym === "BNB") return "BNB";
  return rate.label || sym;
}

export function exchangeCryptoSymbol(rate: { symbol: string }): string {
  return rate.symbol.toUpperCase();
}

/** Table chain column: "Native" for native coins, network name for tokens (e.g. USDT TRC20). */
export function exchangeChainDisplay(symbol: string, network: string): string {
  const sym = symbol.toUpperCase();
  const net = network.trim();
  const native: Record<string, string[]> = {
    BTC: ["Bitcoin"],
    ETH: ["ERC20"],
    TRX: ["TRON"],
    BNB: ["BEP20"],
    DOGE: ["Dogecoin"],
    LTC: ["Litecoin"],
    XRP: ["XRP Ledger"],
  };
  if (native[sym]?.includes(net)) return "Native";
  if (sym === "USDT") return net;
  return chainLabel(net);
}

export function formatInrRate(amount: number): string {
  if (!amount || amount <= 0) return "—";
  return `₹${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Compact rate for table cells, e.g. "₹95" per 1 unit */
export function formatExchangeRateCell(
  rate: { symbol: string; network: string },
  inrAmount: number,
): string {
  if (!inrAmount || inrAmount <= 0) return "—";
  const sym = rate.symbol.toUpperCase();
  const net = rate.network.trim();
  const unit = sym === "USDT" ? `${sym} ${net}` : sym;
  return `1 ${unit} = ${formatInrRate(inrAmount)}`;
}

export function chainLabel(network: string): string {
  const map: Record<string, string> = {
    Bitcoin: "Bitcoin",
    ERC20: "Ethereum (ERC20)",
    TRC20: "Tron (TRC20)",
    BEP20: "BNB Smart Chain (BEP20)",
    TRON: "Tron Network",
    Dogecoin: "Dogecoin",
    Litecoin: "Litecoin",
    "XRP Ledger": "XRP Ledger",
  };
  return map[network] || network;
}

/** e.g. "1 USDT TRC20 = 100 INR" */
export function formatUnitRate(
  rate: { symbol: string; network: string },
  fiatAmount: number,
  fiatCurrency: string,
): string {
  const sym = rate.symbol.toUpperCase();
  const net = rate.network.trim();
  const unit = sym === "USDT" ? `${sym} ${net}` : sym;
  const formatted = fiatAmount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: sym === "BTC" || sym === "ETH" ? 2 : 4,
  });
  return `1 ${unit} = ${formatted} ${fiatCurrency}`;
}
