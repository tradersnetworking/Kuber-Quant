/** Supported crypto assets and chain/network options (shared with deposit & payout flows). */

import type { DepositAccount } from "@/components/wallet/deposit-account-utils";
import {
  CATALOG_SYMBOLS,
  CRYPTO_ASSET_CATALOG,
  chainsForCatalogSymbol,
  defaultChainForSymbol,
  findCatalogAsset,
  formatCryptoAssetLabel,
  getCryptoDisplayName,
} from "@/components/wallet/crypto-asset-catalog";

export {
  CRYPTO_ASSET_CATALOG,
  findCatalogAsset,
  getCryptoDisplayName,
  formatCryptoAssetLabel,
} from "@/components/wallet/crypto-asset-catalog";

export const CRYPTO_SYMBOLS = CATALOG_SYMBOLS;
export type CryptoSymbol = string;

export type ChainOption = { value: string; label: string; hint?: string };

export type CryptoDepositTab = {
  key: string;
  label: string;
  symbol: string;
  network?: string;
  gatewayId?: number;
  coinName?: string;
};

/** Legacy fixed tabs — prefer `cryptoDepositTabsFromAccounts` when gateways are loaded. */
export const CRYPTO_DEPOSIT_TABS: CryptoDepositTab[] = [
  { key: "btc", label: "Bitcoin", symbol: "BTC", network: "Bitcoin", coinName: "Bitcoin" },
  { key: "eth", label: "Ethereum", symbol: "ETH", network: "ERC20", coinName: "Ethereum" },
  { key: "usdt-trc20", label: "USDT · TRC20", symbol: "USDT", network: "TRC20", coinName: "Tether USD" },
  { key: "usdt-erc20", label: "USDT · ERC20", symbol: "USDT", network: "ERC20", coinName: "Tether USD" },
  { key: "usdt-bep20", label: "USDT · BEP20", symbol: "USDT", network: "BEP20", coinName: "Tether USD" },
  { key: "usdc-erc20", label: "USDC · ERC20", symbol: "USDC", network: "ERC20", coinName: "USD Coin" },
  { key: "trx", label: "TRON", symbol: "TRX", network: "TRON", coinName: "TRON" },
  { key: "bnb", label: "BNB", symbol: "BNB", network: "BEP20", coinName: "BNB" },
  { key: "sol", label: "Solana", symbol: "SOL", network: "Solana", coinName: "Solana" },
  { key: "doge", label: "Dogecoin", symbol: "DOGE", network: "Dogecoin", coinName: "Dogecoin" },
  { key: "ltc", label: "Litecoin", symbol: "LTC", network: "Litecoin", coinName: "Litecoin" },
  { key: "xrp", label: "XRP", symbol: "XRP", network: "XRP Ledger", coinName: "XRP" },
];

export const USDT_CHAINS: ChainOption[] = chainsForCatalogSymbol("USDT");

export const NETWORKS_BY_SYMBOL: Record<string, ChainOption[]> = Object.fromEntries(
  CRYPTO_ASSET_CATALOG.map(a => [a.symbol, a.chains]),
);

export function networksForSymbol(symbol: string): ChainOption[] {
  return chainsForCatalogSymbol(symbol);
}

export function defaultNetworkForSymbol(symbol: string): string {
  return defaultChainForSymbol(symbol);
}

export function networksMatch(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a.trim().toUpperCase() === b.trim().toUpperCase();
}

export function formatCryptoLabel(symbol?: string | null, network?: string | null): string {
  return formatCryptoAssetLabel(symbol, network);
}

/** Build investor deposit tabs from admin-configured crypto gateways. */
export function cryptoDepositTabsFromAccounts(accounts: DepositAccount[]): CryptoDepositTab[] {
  const tabs: CryptoDepositTab[] = [];
  const seen = new Set<string>();

  for (const a of accounts) {
    const sym = (a.symbol || "").trim().toUpperCase();
    if (!sym) continue;
    const net = (a.network || "").trim();
    const dedupe = `${sym}::${net}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    const coinName = a.extraConfig?.coinName || findCatalogAsset(sym)?.name;
    tabs.push({
      key: String(a.id),
      label: a.name?.trim() || formatCryptoAssetLabel(sym, net, coinName),
      symbol: sym,
      network: net || undefined,
      gatewayId: a.id,
      coinName: coinName || undefined,
    });
  }

  return tabs.sort((x, y) => x.label.localeCompare(y.label));
}

export function resolveCryptoDepositTabs(cryptoAccounts: DepositAccount[]): CryptoDepositTab[] {
  const fromAdmin = cryptoDepositTabsFromAccounts(cryptoAccounts);
  return fromAdmin.length > 0 ? fromAdmin : CRYPTO_DEPOSIT_TABS;
}

function nativeNetworkMatch(symbol: string, accountNetwork: string, aliases: string[]): boolean {
  const net = accountNetwork.toUpperCase();
  return aliases.some(a => net === a || net.includes(a));
}

export function findCryptoDepositAccount<T extends { id?: number; symbol?: string | null; network?: string | null }>(
  accounts: T[],
  tab: CryptoDepositTab,
): T | undefined {
  if (tab.gatewayId != null) {
    return accounts.find(a => a.id === tab.gatewayId);
  }

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
    if (sym === "SOL") return nativeNetworkMatch(sym, net, ["SOLANA", "SOL"]) || !net;
    return networksMatch(a.network, tab.network);
  });
}
