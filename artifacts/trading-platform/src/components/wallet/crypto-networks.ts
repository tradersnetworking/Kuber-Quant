/** Supported crypto assets and chain/network options */

export const CRYPTO_SYMBOLS = ["USDT", "BTC", "ETH", "TRX", "BNB", "DOGE", "LTC", "XRP"] as const;
export type CryptoSymbol = (typeof CRYPTO_SYMBOLS)[number];

export type ChainOption = { value: string; label: string; hint?: string };

export type CryptoDepositTab = {
  key: string;
  label: string;
  symbol: string;
  network?: string;
};

/** Fixed crypto deposit tabs for investor wallet UI */
export const CRYPTO_DEPOSIT_TABS: CryptoDepositTab[] = [
  { key: "btc", label: "BTC", symbol: "BTC", network: "Bitcoin" },
  { key: "eth", label: "ETH", symbol: "ETH", network: "ERC20" },
  { key: "usdt-trc20", label: "USDT TRC20", symbol: "USDT", network: "TRC20" },
  { key: "usdt-erc20", label: "USDT ERC20", symbol: "USDT", network: "ERC20" },
  { key: "usdt-bep20", label: "USDT BEP20", symbol: "USDT", network: "BEP20" },
  { key: "trx", label: "Tron (TRX)", symbol: "TRX", network: "TRON" },
  { key: "bnb", label: "BNB", symbol: "BNB", network: "BEP20" },
  { key: "doge", label: "Doge Coin", symbol: "DOGE", network: "Dogecoin" },
  { key: "ltc", label: "LiteCoin", symbol: "LTC", network: "Litecoin" },
  { key: "xrp", label: "XRP", symbol: "XRP", network: "XRP Ledger" },
];

export const USDT_CHAINS: ChainOption[] = [
  { value: "TRC20", label: "TRC20", hint: "Tron — low fees" },
  { value: "ERC20", label: "ERC20", hint: "Ethereum" },
  { value: "BEP20", label: "BEP20", hint: "BNB Smart Chain" },
];

export const NETWORKS_BY_SYMBOL: Record<CryptoSymbol, ChainOption[]> = {
  USDT: USDT_CHAINS,
  BTC: [{ value: "Bitcoin", label: "Bitcoin Mainnet", hint: "Native BTC" }],
  ETH: [{ value: "ERC20", label: "Ethereum Mainnet", hint: "Native ETH" }],
  TRX: [{ value: "TRON", label: "Tron Network", hint: "Native TRX" }],
  BNB: [{ value: "BEP20", label: "BNB Smart Chain", hint: "Native BNB" }],
  DOGE: [{ value: "Dogecoin", label: "Dogecoin Network", hint: "Native DOGE" }],
  LTC: [{ value: "Litecoin", label: "Litecoin Network", hint: "Native LTC" }],
  XRP: [{ value: "XRP Ledger", label: "XRP Ledger", hint: "Native XRP — include destination tag if required" }],
};

export function networksForSymbol(symbol: string): ChainOption[] {
  const key = symbol.toUpperCase() as CryptoSymbol;
  return NETWORKS_BY_SYMBOL[key] ?? USDT_CHAINS;
}

export function defaultNetworkForSymbol(symbol: string): string {
  return networksForSymbol(symbol)[0]?.value ?? "TRC20";
}

export function networksMatch(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a.trim().toUpperCase() === b.trim().toUpperCase();
}

export function formatCryptoLabel(symbol?: string | null, network?: string | null): string {
  const sym = (symbol || "USDT").toUpperCase();
  const net = network?.toUpperCase();
  return net ? `${sym} (${net})` : sym;
}

function nativeNetworkMatch(symbol: string, accountNetwork: string, aliases: string[]): boolean {
  const net = accountNetwork.toUpperCase();
  return aliases.some(a => net === a || net.includes(a));
}

export function findCryptoDepositAccount<T extends { symbol?: string | null; network?: string | null }>(
  accounts: T[],
  tab: CryptoDepositTab,
): T | undefined {
  const sym = tab.symbol.toUpperCase();
  return accounts.find(a => {
    const aSym = (a.symbol || "").toUpperCase();
    if (aSym !== sym) return false;
    if (!tab.network) return true;
    const net = a.network || "";
    if (sym === "BTC") return nativeNetworkMatch(sym, net, ["BITCOIN", "BTC"]) || !net;
    if (sym === "TRX") return nativeNetworkMatch(sym, net, ["TRON", "TRX"]) || !net;
    if (sym === "DOGE") return nativeNetworkMatch(sym, net, ["DOGECOIN", "DOGE"]) || !net;
    if (sym === "LTC") return nativeNetworkMatch(sym, net, ["LITECOIN", "LTC"]) || !net;
    if (sym === "XRP") return nativeNetworkMatch(sym, net, ["XRP", "RIPPLE", "XRP LEDGER"]) || !net;
    return networksMatch(a.network, tab.network);
  });
}
