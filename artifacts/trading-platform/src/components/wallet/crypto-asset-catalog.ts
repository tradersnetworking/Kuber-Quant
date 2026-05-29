/** Trust Wallet–style crypto asset catalog (coins + networks/chains). */

export type CryptoChainOption = {
  value: string;
  label: string;
  hint?: string;
  blockchainSlug?: string;
};

export type CryptoAssetDefinition = {
  symbol: string;
  name: string;
  /** Trust Wallet assets blockchain slug or token path */
  iconSlug?: string;
  tokenAddress?: string;
  chains: CryptoChainOption[];
};

const TW = "https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains";

export function trustWalletChainIcon(slug: string): string {
  return `${TW}/${slug}/info/logo.png`;
}

export function trustWalletTokenIcon(blockchainSlug: string, tokenAddress: string): string {
  return `${TW}/${blockchainSlug}/assets/${tokenAddress}/logo.png`;
}

/** Fallback icon when Trust Wallet asset is unavailable */
export function coinCapIcon(symbol: string): string {
  return `https://assets.coincap.io/assets/icons/${symbol.toLowerCase()}@2x.png`;
}

export const CRYPTO_ASSET_CATALOG: CryptoAssetDefinition[] = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    iconSlug: "bitcoin",
    chains: [{ value: "Bitcoin", label: "Bitcoin", hint: "Native BTC", blockchainSlug: "bitcoin" }],
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    iconSlug: "ethereum",
    chains: [{ value: "ERC20", label: "Ethereum", hint: "Native ETH", blockchainSlug: "ethereum" }],
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    tokenAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    iconSlug: "ethereum",
    chains: [
      { value: "TRC20", label: "TRC20", hint: "Tron — low fees", blockchainSlug: "tron" },
      { value: "ERC20", label: "ERC20", hint: "Ethereum", blockchainSlug: "ethereum" },
      { value: "BEP20", label: "BEP20", hint: "BNB Smart Chain", blockchainSlug: "smartchain" },
      { value: "Polygon", label: "Polygon", hint: "MATIC network", blockchainSlug: "polygon" },
      { value: "Arbitrum", label: "Arbitrum One", hint: "Layer 2", blockchainSlug: "arbitrum" },
      { value: "Optimism", label: "Optimism", hint: "Layer 2", blockchainSlug: "optimism" },
      { value: "Avalanche", label: "Avalanche C-Chain", hint: "C-Chain", blockchainSlug: "avalanchec" },
    ],
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    iconSlug: "ethereum",
    chains: [
      { value: "ERC20", label: "ERC20", hint: "Ethereum", blockchainSlug: "ethereum" },
      { value: "TRC20", label: "TRC20", hint: "Tron", blockchainSlug: "tron" },
      { value: "BEP20", label: "BEP20", hint: "BSC", blockchainSlug: "smartchain" },
      { value: "Polygon", label: "Polygon", blockchainSlug: "polygon" },
      { value: "Solana", label: "Solana", blockchainSlug: "solana" },
    ],
  },
  {
    symbol: "BNB",
    name: "BNB",
    iconSlug: "smartchain",
    chains: [{ value: "BEP20", label: "BNB Smart Chain", hint: "Native BNB", blockchainSlug: "smartchain" }],
  },
  {
    symbol: "TRX",
    name: "TRON",
    iconSlug: "tron",
    chains: [{ value: "TRON", label: "Tron Network", hint: "Native TRX", blockchainSlug: "tron" }],
  },
  {
    symbol: "SOL",
    name: "Solana",
    iconSlug: "solana",
    chains: [{ value: "Solana", label: "Solana", hint: "Native SOL", blockchainSlug: "solana" }],
  },
  {
    symbol: "XRP",
    name: "XRP",
    iconSlug: "ripple",
    chains: [{ value: "XRP Ledger", label: "XRP Ledger", hint: "Include tag if required", blockchainSlug: "ripple" }],
  },
  {
    symbol: "ADA",
    name: "Cardano",
    iconSlug: "cardano",
    chains: [{ value: "Cardano", label: "Cardano", blockchainSlug: "cardano" }],
  },
  {
    symbol: "DOGE",
    name: "Dogecoin",
    iconSlug: "doge",
    chains: [{ value: "Dogecoin", label: "Dogecoin", blockchainSlug: "doge" }],
  },
  {
    symbol: "LTC",
    name: "Litecoin",
    iconSlug: "litecoin",
    chains: [{ value: "Litecoin", label: "Litecoin", blockchainSlug: "litecoin" }],
  },
  {
    symbol: "MATIC",
    name: "Polygon",
    iconSlug: "polygon",
    chains: [{ value: "Polygon", label: "Polygon", hint: "Native MATIC", blockchainSlug: "polygon" }],
  },
  {
    symbol: "POL",
    name: "Polygon (POL)",
    iconSlug: "polygon",
    chains: [{ value: "Polygon", label: "Polygon", blockchainSlug: "polygon" }],
  },
  {
    symbol: "AVAX",
    name: "Avalanche",
    iconSlug: "avalanchec",
    chains: [{ value: "Avalanche", label: "Avalanche C-Chain", blockchainSlug: "avalanchec" }],
  },
  {
    symbol: "DOT",
    name: "Polkadot",
    iconSlug: "polkadot",
    chains: [{ value: "Polkadot", label: "Polkadot", blockchainSlug: "polkadot" }],
  },
  {
    symbol: "LINK",
    name: "Chainlink",
    iconSlug: "ethereum",
    tokenAddress: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    chains: [{ value: "ERC20", label: "Ethereum (ERC20)", blockchainSlug: "ethereum" }],
  },
  {
    symbol: "SHIB",
    name: "Shiba Inu",
    iconSlug: "ethereum",
    tokenAddress: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE",
    chains: [
      { value: "ERC20", label: "Ethereum", blockchainSlug: "ethereum" },
      { value: "BEP20", label: "BSC", blockchainSlug: "smartchain" },
    ],
  },
  {
    symbol: "TON",
    name: "Toncoin",
    iconSlug: "ton",
    chains: [{ value: "TON", label: "TON", blockchainSlug: "ton" }],
  },
  {
    symbol: "ATOM",
    name: "Cosmos",
    iconSlug: "cosmos",
    chains: [{ value: "Cosmos", label: "Cosmos Hub", blockchainSlug: "cosmos" }],
  },
  {
    symbol: "NEAR",
    name: "NEAR Protocol",
    iconSlug: "near",
    chains: [{ value: "NEAR", label: "NEAR", blockchainSlug: "near" }],
  },
  {
    symbol: "APT",
    name: "Aptos",
    iconSlug: "aptos",
    chains: [{ value: "Aptos", label: "Aptos", blockchainSlug: "aptos" }],
  },
  {
    symbol: "ARB",
    name: "Arbitrum",
    iconSlug: "arbitrum",
    chains: [{ value: "Arbitrum", label: "Arbitrum One", blockchainSlug: "arbitrum" }],
  },
  {
    symbol: "OP",
    name: "Optimism",
    iconSlug: "optimism",
    chains: [{ value: "Optimism", label: "Optimism", blockchainSlug: "optimism" }],
  },
  {
    symbol: "DAI",
    name: "Dai",
    iconSlug: "ethereum",
    tokenAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    chains: [
      { value: "ERC20", label: "Ethereum", blockchainSlug: "ethereum" },
      { value: "Polygon", label: "Polygon", blockchainSlug: "polygon" },
    ],
  },
  {
    symbol: "BUSD",
    name: "Binance USD",
    iconSlug: "smartchain",
    tokenAddress: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
    chains: [{ value: "BEP20", label: "BSC", blockchainSlug: "smartchain" }],
  },
];

export const CATALOG_SYMBOLS = CRYPTO_ASSET_CATALOG.map(a => a.symbol);

export function findCatalogAsset(symbol?: string | null): CryptoAssetDefinition | undefined {
  const sym = (symbol || "").trim().toUpperCase();
  return CRYPTO_ASSET_CATALOG.find(a => a.symbol === sym);
}

export function chainsForCatalogSymbol(symbol: string): CryptoChainOption[] {
  const asset = findCatalogAsset(symbol);
  if (asset?.chains.length) return asset.chains;
  return [
    { value: "ERC20", label: "ERC20", hint: "Ethereum" },
    { value: "TRC20", label: "TRC20", hint: "Tron" },
    { value: "BEP20", label: "BEP20", hint: "BSC" },
    { value: "Mainnet", label: "Mainnet", hint: "Native chain" },
  ];
}

export function defaultChainForSymbol(symbol: string): string {
  return chainsForCatalogSymbol(symbol)[0]?.value ?? "Mainnet";
}

export function getCryptoAssetIconUrl(symbol?: string | null, network?: string | null): string {
  const sym = (symbol || "").trim().toUpperCase();
  const asset = findCatalogAsset(sym);
  if (asset?.tokenAddress && asset.iconSlug) {
    return trustWalletTokenIcon(asset.iconSlug, asset.tokenAddress);
  }
  if (asset?.iconSlug) {
    return trustWalletChainIcon(asset.iconSlug);
  }
  const chain = asset?.chains.find(c =>
    c.value.toUpperCase() === (network || "").trim().toUpperCase()
    || c.label.toUpperCase() === (network || "").trim().toUpperCase(),
  );
  if (chain?.blockchainSlug) return trustWalletChainIcon(chain.blockchainSlug);
  return coinCapIcon(sym || "generic");
}

export function getCryptoDisplayName(symbol?: string | null, coinName?: string | null): string {
  if (coinName?.trim()) return coinName.trim();
  const asset = findCatalogAsset(symbol);
  if (asset) return asset.name;
  return (symbol || "Crypto").toUpperCase();
}

export function formatCryptoAssetLabel(
  symbol?: string | null,
  network?: string | null,
  coinName?: string | null,
): string {
  const sym = (symbol || "").toUpperCase();
  const name = getCryptoDisplayName(sym, coinName);
  const net = network?.trim();
  if (!net) return `${name} (${sym})`;
  return `${name} · ${sym} on ${net}`;
}
