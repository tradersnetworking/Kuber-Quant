import { db, paymentGatewaysTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { isMissingRelationError } from "./pgErrors";

type CryptoGatewaySeed = {
  name: string;
  symbol: string;
  network: string;
  walletAddress: string;
  minAmount: string;
  sortOrder: number;
  description?: string;
};

/** Default crypto deposit wallets — includes all USDT chains (TRC20, ERC20, BEP20). */
export const DEFAULT_CRYPTO_GATEWAYS: CryptoGatewaySeed[] = [
  {
    name: "Bitcoin (BTC)",
    symbol: "BTC",
    network: "Bitcoin",
    walletAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    minAmount: "50",
    sortOrder: 10,
  },
  {
    name: "Ethereum (ETH)",
    symbol: "ETH",
    network: "ERC20",
    walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    minAmount: "50",
    sortOrder: 11,
  },
  {
    name: "USDT (TRC20)",
    symbol: "USDT",
    network: "TRC20",
    walletAddress: "TXYZabcdefghijklmnopqrstuvwxyz123456",
    minAmount: "20",
    sortOrder: 12,
    description: "USDT on Tron — low network fees",
  },
  {
    name: "USDT (ERC20)",
    symbol: "USDT",
    network: "ERC20",
    walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    minAmount: "20",
    sortOrder: 13,
    description: "USDT on Ethereum",
  },
  {
    name: "USDT (BEP20)",
    symbol: "USDT",
    network: "BEP20",
    walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    minAmount: "20",
    sortOrder: 14,
    description: "USDT on BNB Smart Chain (BEP20)",
  },
  {
    name: "Tron (TRX)",
    symbol: "TRX",
    network: "TRON",
    walletAddress: "TXYZabcdefghijklmnopqrstuvwxyz123456",
    minAmount: "20",
    sortOrder: 15,
  },
  {
    name: "BNB (BEP20)",
    symbol: "BNB",
    network: "BEP20",
    walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    minAmount: "20",
    sortOrder: 16,
  },
  {
    name: "Dogecoin (DOGE)",
    symbol: "DOGE",
    network: "Dogecoin",
    walletAddress: "DDogepartyxxxxxxxxxxxxxxxxxxw1dfn",
    minAmount: "20",
    sortOrder: 17,
  },
  {
    name: "Litecoin (LTC)",
    symbol: "LTC",
    network: "Litecoin",
    walletAddress: "ltc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    minAmount: "20",
    sortOrder: 18,
  },
  {
    name: "Ripple (XRP)",
    symbol: "XRP",
    network: "XRP Ledger",
    walletAddress: "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH",
    minAmount: "20",
    sortOrder: 19,
  },
];

function matchesCryptoGateway(
  existing: { symbol?: string | null; network?: string | null },
  seed: CryptoGatewaySeed,
): boolean {
  return (
    (existing.symbol || "").toUpperCase() === seed.symbol.toUpperCase()
    && (existing.network || "").toUpperCase() === seed.network.toUpperCase()
  );
}

/** Insert missing crypto gateways (e.g. USDT BEP20) without overwriting admin-configured wallets. */
export async function ensureDefaultCryptoGateways(force = false): Promise<void> {
  if (!force && process.env.BOOTSTRAP_PAYMENT_GATEWAYS === "false") return;

  try {
    const existing = await db.select().from(paymentGatewaysTable);
    const crypto = existing.filter(g => g.type === "crypto");
    const missing = DEFAULT_CRYPTO_GATEWAYS.filter(
      seed => !crypto.some(g => matchesCryptoGateway(g, seed)),
    );

    if (missing.length === 0) return;

    await db.insert(paymentGatewaysTable).values(
      missing.map(m => ({
        name: m.name,
        type: "crypto",
        symbol: m.symbol,
        network: m.network,
        description: m.description || null,
        walletAddress: m.walletAddress,
        minAmount: m.minAmount,
        isEnabled: true,
        sortOrder: m.sortOrder,
      })),
    );

    logger.info({ count: missing.length, networks: missing.map(m => `${m.symbol}/${m.network}`) }, "Crypto payment gateways backfilled");
  } catch (err) {
    if (isMissingRelationError(err)) {
      logger.warn("payment_gateways table missing — run pnpm db:push");
      return;
    }
    logger.warn({ err }, "Crypto payment gateway bootstrap failed");
  }
}
