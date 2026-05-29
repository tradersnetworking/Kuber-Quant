/** Supported crypto assets on the exchange (symbol + network key). */
export const EXCHANGE_ASSETS = [
  { symbol: "BTC", network: "Bitcoin", label: "Bitcoin (BTC)", sortOrder: 10 },
  { symbol: "ETH", network: "ERC20", label: "Ethereum (ETH)", sortOrder: 11 },
  { symbol: "USDT", network: "TRC20", label: "USDT (TRC20)", sortOrder: 12 },
  { symbol: "USDT", network: "ERC20", label: "USDT (ERC20)", sortOrder: 13 },
  { symbol: "USDT", network: "BEP20", label: "USDT (BEP20)", sortOrder: 14 },
  { symbol: "TRX", network: "TRON", label: "Tron (TRX)", sortOrder: 15 },
  { symbol: "BNB", network: "BEP20", label: "BNB (BEP20)", sortOrder: 16 },
] as const;

export type ExchangeAssetSource = {
  symbol: string;
  network: string;
  label: string;
  sortOrder: number;
  gatewayId?: number;
  gatewayName?: string;
  gatewayEnabled?: boolean;
  hasWallet?: boolean;
  walletAddress?: string;
  coinName?: string;
};

/** Master list for exchange UI — all supported payment-gateway cryptos. */
export function getExchangeCatalog(): ExchangeAssetSource[] {
  return DEFAULT_EXCHANGE_RATE_SEEDS.map(seed => ({
    symbol: seed.symbol.toUpperCase(),
    network: seed.network.trim(),
    label: seed.label,
    sortOrder: seed.sortOrder,
    gatewayEnabled: true,
  }));
}

export type ExchangeAsset = (typeof EXCHANGE_ASSETS)[number];

export function exchangeAssetKey(symbol: string, network: string): string {
  return `${symbol.toUpperCase()}|${network.trim().toUpperCase()}`;
}

export function ledgerCurrencyForCrypto(symbol: string): string {
  const s = symbol.toUpperCase();
  if (["BTC", "ETH", "USDT", "TRX", "BNB", "DOGE", "LTC", "XRP"].includes(s)) return s;
  return "USDT";
}

export const DEFAULT_EXCHANGE_RATE_SEEDS: {
  symbol: string;
  network: string;
  label: string;
  buyPriceUsd: string;
  sellPriceUsd: string;
  buyPriceInr?: string;
  sellPriceInr?: string;
  minBuyUsd: string;
  minSellUsd: string;
  sortOrder: number;
}[] = [
  { symbol: "BTC", network: "Bitcoin", label: "Bitcoin (BTC)", buyPriceUsd: "68000", sellPriceUsd: "67000", minBuyUsd: "50", minSellUsd: "50", sortOrder: 10 },
  { symbol: "ETH", network: "ERC20", label: "Ethereum (ETH)", buyPriceUsd: "3500", sellPriceUsd: "3450", minBuyUsd: "30", minSellUsd: "30", sortOrder: 11 },
  { symbol: "USDT", network: "TRC20", label: "USDT (TRC20)", buyPriceUsd: "1.02", sellPriceUsd: "0.98", buyPriceInr: "100", sellPriceInr: "95", minBuyUsd: "10", minSellUsd: "10", sortOrder: 12 },
  { symbol: "USDT", network: "ERC20", label: "USDT (ERC20)", buyPriceUsd: "1.02", sellPriceUsd: "0.98", buyPriceInr: "100", sellPriceInr: "95", minBuyUsd: "10", minSellUsd: "10", sortOrder: 13 },
  { symbol: "USDT", network: "BEP20", label: "USDT (BEP20)", buyPriceUsd: "1.02", sellPriceUsd: "0.98", buyPriceInr: "100", sellPriceInr: "95", minBuyUsd: "10", minSellUsd: "10", sortOrder: 14 },
  { symbol: "TRX", network: "TRON", label: "Tron (TRX)", buyPriceUsd: "0.12", sellPriceUsd: "0.115", minBuyUsd: "10", minSellUsd: "10", sortOrder: 15 },
  { symbol: "BNB", network: "BEP20", label: "BNB (BEP20)", buyPriceUsd: "620", sellPriceUsd: "610", minBuyUsd: "20", minSellUsd: "20", sortOrder: 16 },
  { symbol: "DOGE", network: "Dogecoin", label: "Dogecoin (DOGE)", buyPriceUsd: "0.15", sellPriceUsd: "0.14", minBuyUsd: "10", minSellUsd: "10", sortOrder: 17 },
  { symbol: "LTC", network: "Litecoin", label: "Litecoin (LTC)", buyPriceUsd: "95", sellPriceUsd: "92", minBuyUsd: "10", minSellUsd: "10", sortOrder: 18 },
  { symbol: "XRP", network: "XRP Ledger", label: "Ripple (XRP)", buyPriceUsd: "0.55", sellPriceUsd: "0.52", minBuyUsd: "10", minSellUsd: "10", sortOrder: 19 },
];
