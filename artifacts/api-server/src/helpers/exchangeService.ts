import {
  db, exchangeRatesTable, exchangeOrdersTable, transactionsTable, usersTable,
  paymentGatewaysTable, userPaymentAccountsTable, siteSettingsTable,
} from "@workspace/db";
import { eq, and, desc } from "@workspace/db/orm";
import { creditWallet, WalletError } from "./walletService";
import { convertToUsd, convertFromUsd, getExchangeRates, usdToInr, usdToEur, type FxRates } from "./exchangeRateService";
import {
  DEFAULT_EXCHANGE_RATE_SEEDS, exchangeAssetKey, ledgerCurrencyForCrypto,
  getExchangeCatalog, type ExchangeAssetSource,
} from "./exchangeConstants";
import { logger } from "../lib/logger";
import { assertUpiDepositWithinLimit, assertDigitalRupeeDepositWithinLimit } from "./paymentLimits";

export function mapExchangeRate(r: typeof exchangeRatesTable.$inferSelect) {
  const buyPriceUsd = Number(r.buyPriceUsd);
  const sellPriceUsd = Number(r.sellPriceUsd);
  const buyPriceInr = r.buyPriceInr != null ? Number(r.buyPriceInr) : null;
  const sellPriceInr = r.sellPriceInr != null ? Number(r.sellPriceInr) : null;
  return {
    id: r.id,
    symbol: r.symbol,
    network: r.network,
    label: r.label,
    /** USD per 1 unit — rate user pays when buying crypto (platform sells). */
    buyPriceUsd,
    /** USD per 1 unit — rate user receives when selling crypto (platform buys). */
    sellPriceUsd,
    /** INR per 1 unit — rate user pays when buying crypto (platform sells). */
    buyPriceInr,
    /** INR per 1 unit — rate user receives when selling crypto (platform buys). */
    sellPriceInr,
    platformSellRateUsd: buyPriceUsd,
    platformBuyRateUsd: sellPriceUsd,
    minBuyUsd: Number(r.minBuyUsd),
    minSellUsd: Number(r.minSellUsd),
    isEnabled: r.isEnabled,
    buyEnabled: r.buyEnabled ?? true,
    sellEnabled: r.sellEnabled ?? true,
    sortOrder: r.sortOrder,
    updatedAt: r.updatedAt?.toISOString() || null,
  };
}

function inrToUsd(inr: number, fx: FxRates): number {
  if (!inr || !fx.USD_INR) return 0;
  return parseFloat((inr / fx.USD_INR).toFixed(8));
}

function parseInr(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

function resolveInrRate(
  inrValue: number | null | undefined,
  usdValue: number,
  fx: FxRates,
): number {
  if (inrValue != null && inrValue > 0) return inrValue;
  return usdToInr(usdValue, fx);
}

function usdToFiat(usd: number, fiatCurrency: string, fx: FxRates): number {
  const cur = fiatCurrency.toUpperCase();
  if (cur === "USD") return parseFloat(usd.toFixed(8));
  if (cur === "INR") return usdToInr(usd, fx);
  if (cur === "EUR") return usdToEur(usd, fx);
  return usd;
}

export function enrichExchangeRateWithFiat(
  r: typeof exchangeRatesTable.$inferSelect,
  fiatCurrency: string,
  fx: FxRates,
) {
  const base = mapExchangeRate(r);
  const cur = fiatCurrency.toUpperCase();
  const platformSellRateFiat = cur === "INR"
    ? (base.buyPriceInr != null && base.buyPriceInr > 0 ? base.buyPriceInr : 0)
    : usdToFiat(base.platformSellRateUsd, fiatCurrency, fx);
  const platformBuyRateFiat = cur === "INR"
    ? (base.sellPriceInr != null && base.sellPriceInr > 0 ? base.sellPriceInr : 0)
    : usdToFiat(base.platformBuyRateUsd, fiatCurrency, fx);
  return {
    ...base,
    platformSellRateInr: base.buyPriceInr != null && base.buyPriceInr > 0 ? base.buyPriceInr : 0,
    platformBuyRateInr: base.sellPriceInr != null && base.sellPriceInr > 0 ? base.sellPriceInr : 0,
    fiatCurrency: cur,
    platformSellRateFiat,
    platformBuyRateFiat,
    fxUsdInr: fx.USD_INR,
    fxUsdEur: fx.USD_EUR,
  };
}

function gatewayMatchesAsset(
  gw: typeof paymentGatewaysTable.$inferSelect,
  symbol: string,
  network: string,
): boolean {
  if ((gw.symbol || "").toUpperCase() !== symbol.toUpperCase()) return false;
  return (gw.network || "").trim().toUpperCase() === network.trim().toUpperCase();
}

function findRateForAsset(
  rateByKey: Map<string, typeof exchangeRatesTable.$inferSelect>,
  symbol: string,
  network: string,
) {
  const direct = rateByKey.get(exchangeAssetKey(symbol, network));
  if (direct) return direct;
  const sym = symbol.toUpperCase();
  const net = network.trim().toUpperCase();
  for (const row of rateByKey.values()) {
    if (row.symbol.toUpperCase() === sym && row.network.trim().toUpperCase() === net) {
      return row;
    }
  }
  return undefined;
}

function isPublicExchangeListing(r: {
  isEnabled?: boolean;
  buyEnabled?: boolean;
  sellEnabled?: boolean;
}) {
  if (r.isEnabled === false) return false;
  return r.buyEnabled !== false || r.sellEnabled !== false;
}

async function getAllCryptoGateways() {
  const gateways = await db.select().from(paymentGatewaysTable)
    .where(eq(paymentGatewaysTable.type, "crypto"));
  return gateways
    .filter(g => g.symbol?.trim())
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

async function findCryptoGatewayForAsset(symbol: string, network: string) {
  const gateways = await db.select().from(paymentGatewaysTable)
    .where(eq(paymentGatewaysTable.type, "crypto"));
  return gateways.find(g => gatewayMatchesAsset(g, symbol, network)) ?? null;
}

async function getMergedExchangeAssets(): Promise<ExchangeAssetSource[]> {
  const gateways = await getAllCryptoGateways();
  if (gateways.length > 0) {
    return gateways.map(gw => {
      const ec = (gw.extraConfig || {}) as Record<string, string>;
      return {
        symbol: gw.symbol!.toUpperCase(),
        network: (gw.network || "").trim(),
        label: gw.name || `${gw.symbol} (${gw.network || ""})`,
        sortOrder: gw.sortOrder ?? 0,
        gatewayId: gw.id,
        gatewayName: gw.name ?? undefined,
        gatewayEnabled: gw.isEnabled,
        hasWallet: Boolean(gw.walletAddress?.trim()),
        walletAddress: gw.walletAddress?.trim() || undefined,
        coinName: ec.coinName || undefined,
      };
    });
  }

  const byKey = new Map<string, ExchangeAssetSource>();
  for (const asset of getExchangeCatalog()) {
    byKey.set(exchangeAssetKey(asset.symbol, asset.network), { ...asset });
  }
  return Array.from(byKey.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Ensure exchange rate rows exist for every crypto payment gateway. */
export async function syncExchangeRatesFromCryptoGateways() {
  const { ensureDefaultCryptoGateways } = await import("./defaultPaymentGateways");
  await ensureDefaultCryptoGateways(true);

  const assets = await getMergedExchangeAssets();
  const fx = await getExchangeRates();
  for (const asset of assets) {
    const symbol = asset.symbol.toUpperCase();
    const network = asset.network.trim();
    const seed = DEFAULT_EXCHANGE_RATE_SEEDS.find(s =>
      s.symbol === symbol && s.network.trim().toUpperCase() === network.trim().toUpperCase(),
    );
    const [existing] = await db.select().from(exchangeRatesTable)
      .where(and(
        eq(exchangeRatesTable.symbol, symbol),
        eq(exchangeRatesTable.network, network),
      )).limit(1);

    const seedBuyInr = seed?.buyPriceInr ?? (seed?.buyPriceUsd ? String(usdToInr(Number(seed.buyPriceUsd), fx)) : null);
    const seedSellInr = seed?.sellPriceInr ?? (seed?.sellPriceUsd ? String(usdToInr(Number(seed.sellPriceUsd), fx)) : null);

    if (!existing) {
      await db.insert(exchangeRatesTable).values({
        symbol,
        network,
        label: asset.label || seed?.label || `${symbol} (${network})`,
        buyPriceUsd: seed?.buyPriceUsd || "0",
        sellPriceUsd: seed?.sellPriceUsd || "0",
        buyPriceInr: seedBuyInr,
        sellPriceInr: seedSellInr,
        minBuyUsd: seed?.minBuyUsd || "10",
        minSellUsd: seed?.minSellUsd || "10",
        isEnabled: true,
        buyEnabled: true,
        sellEnabled: true,
        sortOrder: asset.sortOrder,
      });
      logger.info({ symbol, network }, "Synced exchange rate from catalog/gateway");
    } else {
      await db.update(exchangeRatesTable).set({
        label: asset.label || existing.label,
        sortOrder: asset.sortOrder,
      }).where(eq(exchangeRatesTable.id, existing.id));
    }
  }
}

function buildGatewayExchangeRateList(
  assets: ExchangeAssetSource[],
  rateByKey: Map<string, typeof exchangeRatesTable.$inferSelect>,
  fiatCurrency: string,
  fx: FxRates,
  opts: { includeDisabledGateways?: boolean },
) {
  return assets
    .filter(asset => opts.includeDisabledGateways || asset.gatewayEnabled !== false)
    .map(asset => {
      const rate = findRateForAsset(rateByKey, asset.symbol, asset.network);

      const enriched = rate
        ? enrichExchangeRateWithFiat(rate, fiatCurrency, fx)
        : {
            id: 0,
            symbol: asset.symbol.toUpperCase(),
            network: asset.network.trim(),
            label: asset.label,
            buyPriceUsd: 0,
            sellPriceUsd: 0,
            buyPriceInr: null,
            sellPriceInr: null,
            platformSellRateUsd: 0,
            platformBuyRateUsd: 0,
            platformSellRateInr: 0,
            platformBuyRateInr: 0,
            minBuyUsd: 10,
            minSellUsd: 10,
            isEnabled: true,
            buyEnabled: true,
            sellEnabled: true,
            sortOrder: asset.sortOrder,
            updatedAt: null,
            fiatCurrency: fiatCurrency.toUpperCase(),
            platformSellRateFiat: 0,
            platformBuyRateFiat: 0,
            fxUsdInr: fx.USD_INR,
            fxUsdEur: fx.USD_EUR,
          };

      return {
        ...enriched,
        gatewayId: asset.gatewayId,
        gatewayName: asset.gatewayName,
        gatewayEnabled: asset.gatewayEnabled,
        hasWallet: asset.hasWallet,
        walletAddress: asset.walletAddress ?? null,
        coinName: asset.coinName ?? null,
      };
    });
}

export async function listPublicExchangeRates(fiatCurrency = "INR") {
  await syncExchangeRatesFromCryptoGateways();
  const fx = await getExchangeRates();
  const assets = await getMergedExchangeAssets();
  const rows = await db.select().from(exchangeRatesTable).orderBy(exchangeRatesTable.sortOrder);
  const rateByKey = new Map(rows.map(r => [exchangeAssetKey(r.symbol, r.network), r]));
  return buildGatewayExchangeRateList(assets, rateByKey, fiatCurrency, fx, {
    includeDisabledGateways: true,
  }).filter(isPublicExchangeListing);
}

export async function listAllExchangeRates(
  fiatCurrency = "INR",
  opts?: { skipSync?: boolean },
) {
  if (!opts?.skipSync) {
    await syncExchangeRatesFromCryptoGateways();
  }
  const fx = await getExchangeRates();
  const assets = await getMergedExchangeAssets();
  const rows = await db.select().from(exchangeRatesTable).orderBy(exchangeRatesTable.sortOrder);
  const rateByKey = new Map(rows.map(r => [exchangeAssetKey(r.symbol, r.network), r]));
  return buildGatewayExchangeRateList(assets, rateByKey, fiatCurrency, fx, {
    includeDisabledGateways: true,
  });
}

export function mapExchangeOrder(o: typeof exchangeOrdersTable.$inferSelect, user?: { email?: string; fullName?: string }) {
  return {
    id: o.id,
    userId: o.userId,
    userEmail: user?.email || null,
    userName: user?.fullName || null,
    side: o.side,
    cryptoSymbol: o.cryptoSymbol,
    cryptoNetwork: o.cryptoNetwork,
    cryptoAmount: Number(o.cryptoAmount),
    fiatAmount: Number(o.fiatAmount),
    fiatCurrency: o.fiatCurrency,
    rateUsd: Number(o.rateUsd),
    status: o.status,
    depositTransactionId: o.depositTransactionId,
    payoutTransactionId: o.payoutTransactionId,
    paymentGatewayId: o.paymentGatewayId,
    paymentAccountId: o.paymentAccountId,
    receiveWalletAddress: o.receiveWalletAddress || null,
    depositMethod: o.depositMethod || null,
    proofUrl: o.proofUrl || null,
    txHash: o.txHash || null,
    utrReference: o.utrReference || null,
    adminNotes: o.adminNotes || null,
    reviewedByUserId: o.reviewedByUserId,
    reviewedAt: o.reviewedAt?.toISOString() || null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt?.toISOString() || null,
  };
}

export async function ensureDefaultExchangeRates() {
  try {
    await ensureDefaultExchangeRatesInner();
  } catch (err) {
    const { isMissingRelationError } = await import("./pgErrors");
    if (isMissingRelationError(err)) {
      logger.warn("exchange_rates table missing — run pnpm db:push");
      return;
    }
    throw err;
  }
}

async function ensureDefaultExchangeRatesInner() {
  for (const seed of DEFAULT_EXCHANGE_RATE_SEEDS) {
    const [existing] = await db.select().from(exchangeRatesTable)
      .where(and(
        eq(exchangeRatesTable.symbol, seed.symbol),
        eq(exchangeRatesTable.network, seed.network),
      )).limit(1);
    if (!existing) {
      await db.insert(exchangeRatesTable).values(seed);
      logger.info({ symbol: seed.symbol, network: seed.network }, "Seeded exchange rate");
    }
  }
  await syncExchangeRatesFromCryptoGateways();
}

async function getSetting(key: string, fallback: string): Promise<string> {
  const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  return row?.value ?? fallback;
}

export async function assertKycForExchange(userId: number) {
  const kycRequired = await getSetting("kyc_required", "true");
  if (kycRequired !== "true") return;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (user && user.kycStatus !== "verified") {
    throw new WalletError("KYC verification required before using the exchange", "KYC_REQUIRED");
  }
}

export async function getRateForAsset(symbol: string, network: string, side?: "buy" | "sell") {
  const sym = symbol.toUpperCase();
  const net = network.trim();
  const rows = await db.select().from(exchangeRatesTable)
    .where(and(
      eq(exchangeRatesTable.symbol, sym),
      eq(exchangeRatesTable.isEnabled, true),
    ));
  const rate = rows.find(r =>
    r.symbol.toUpperCase() === sym && r.network.trim().toUpperCase() === net.toUpperCase(),
  );
  if (!rate) return null;
  if (side === "buy" && rate.buyEnabled === false) return null;
  if (side === "sell" && rate.sellEnabled === false) return null;
  return rate;
}

export async function saveExchangeRates(
  rates: {
    id?: number;
    symbol: string;
    network: string;
    label: string;
    buyPriceUsd?: number;
    sellPriceUsd?: number;
    buyPriceInr?: number;
    sellPriceInr?: number;
    platformSellRateInr?: number;
    platformBuyRateInr?: number;
    minBuyUsd?: number;
    minSellUsd?: number;
    isEnabled?: boolean;
    buyEnabled?: boolean;
    sellEnabled?: boolean;
    sortOrder?: number;
  }[],
) {
  const fx = await getExchangeRates();
  for (const r of rates) {
    if (!r.symbol?.trim()) continue;

    const symbol = r.symbol.toUpperCase();
    const network = (r.network || "").trim();
    const label = r.label || `${symbol} (${network})`;
    const buyPriceInr = parseInr(r.buyPriceInr ?? r.platformSellRateInr);
    const sellPriceInr = parseInr(r.sellPriceInr ?? r.platformBuyRateInr);
    const buyPriceUsd = buyPriceInr > 0
      ? inrToUsd(buyPriceInr, fx)
      : Number(r.buyPriceUsd ?? 0);
    const sellPriceUsd = sellPriceInr > 0
      ? inrToUsd(sellPriceInr, fx)
      : Number(r.sellPriceUsd ?? 0);

    const buyOn = r.buyEnabled !== false;
    const sellOn = r.sellEnabled !== false;
    const listingActive = buyOn || sellOn;

    const payload = {
      symbol,
      network,
      label,
      buyPriceUsd: String(buyPriceUsd || 0),
      sellPriceUsd: String(sellPriceUsd || 0),
      buyPriceInr: buyPriceInr > 0 ? String(buyPriceInr) : null,
      sellPriceInr: sellPriceInr > 0 ? String(sellPriceInr) : null,
      minBuyUsd: String(r.minBuyUsd ?? 10),
      minSellUsd: String(r.minSellUsd ?? 10),
      isEnabled: listingActive ? true : (r.isEnabled ?? false),
      buyEnabled: buyOn,
      sellEnabled: sellOn,
      sortOrder: r.sortOrder ?? 0,
    };

    const [existing] = await db.select().from(exchangeRatesTable)
      .where(and(
        eq(exchangeRatesTable.symbol, symbol),
        eq(exchangeRatesTable.network, network),
      )).limit(1);

    if (existing) {
      await db.update(exchangeRatesTable).set(payload).where(eq(exchangeRatesTable.id, existing.id));
    } else {
      await db.insert(exchangeRatesTable).values(payload);
    }

    if (listingActive) {
      const gateways = await db.select().from(paymentGatewaysTable)
        .where(eq(paymentGatewaysTable.type, "crypto"));
      const gw = gateways.find(g => gatewayMatchesAsset(g, symbol, network));
      if (gw && !gw.isEnabled) {
        await db.update(paymentGatewaysTable)
          .set({ isEnabled: true })
          .where(eq(paymentGatewaysTable.id, gw.id));
      }
    }
  }
  return listAllExchangeRates("INR", { skipSync: true });
}

export async function calculateExchangeQuote(opts: {
  side: "buy" | "sell";
  symbol: string;
  network: string;
  fiatCurrency: string;
  fiatAmount?: number;
  cryptoAmount?: number;
}) {
  const rate = await getRateForAsset(opts.symbol, opts.network, opts.side);
  if (!rate) {
    throw new WalletError(
      opts.side === "buy"
        ? "Buying is not available for this cryptocurrency"
        : "Selling is not available for this cryptocurrency",
      "ASSET_UNAVAILABLE",
    );
  }

  const fx = await getExchangeRates();
  const cur = opts.fiatCurrency.toUpperCase();
  const sellInr = resolveInrRate(
    rate.buyPriceInr != null ? Number(rate.buyPriceInr) : null,
    Number(rate.buyPriceUsd),
    fx,
  );
  const buyInr = resolveInrRate(
    rate.sellPriceInr != null ? Number(rate.sellPriceInr) : null,
    Number(rate.sellPriceUsd),
    fx,
  );
  const priceInr = opts.side === "buy" ? sellInr : buyInr;
  const minUsd = opts.side === "buy" ? Number(rate.minBuyUsd) : Number(rate.minSellUsd);
  const hasStoredInr = opts.side === "buy"
    ? rate.buyPriceInr != null && Number(rate.buyPriceInr) > 0
    : rate.sellPriceInr != null && Number(rate.sellPriceInr) > 0;
  const useInrPricing = cur === "INR" && hasStoredInr && priceInr > 0;
  const priceUsd = opts.side === "buy" ? Number(rate.buyPriceUsd) : Number(rate.sellPriceUsd);

  let cryptoAmount: number;
  let fiatAmount: number;

  if (useInrPricing) {
    if (opts.cryptoAmount && opts.cryptoAmount > 0) {
      cryptoAmount = opts.cryptoAmount;
      fiatAmount = cryptoAmount * priceInr;
    } else if (opts.fiatAmount && opts.fiatAmount > 0) {
      fiatAmount = opts.fiatAmount;
      cryptoAmount = fiatAmount / priceInr;
    } else {
      throw new WalletError("Provide fiatAmount or cryptoAmount", "INVALID_AMOUNT");
    }
  } else if (opts.cryptoAmount && opts.cryptoAmount > 0) {
    cryptoAmount = opts.cryptoAmount;
    const usdTotal = cryptoAmount * priceUsd;
    fiatAmount = await convertFromUsd(usdTotal, cur);
  } else if (opts.fiatAmount && opts.fiatAmount > 0) {
    fiatAmount = opts.fiatAmount;
    const usdTotal = await convertToUsd(fiatAmount, cur);
    cryptoAmount = usdTotal / priceUsd;
  } else {
    throw new WalletError("Provide fiatAmount or cryptoAmount", "INVALID_AMOUNT");
  }

  const usdNotional = useInrPricing
    ? cryptoAmount * inrToUsd(priceInr, fx)
    : cryptoAmount * priceUsd;
  if (usdNotional < minUsd) {
    throw new WalletError(`Minimum order is $${minUsd.toFixed(2)} USD equivalent`, "MIN_ORDER");
  }

  const effectiveRateUsd = useInrPricing ? inrToUsd(priceInr, fx) : priceUsd;

  return {
    side: opts.side,
    symbol: rate.symbol,
    network: rate.network,
    label: rate.label,
    cryptoAmount: Number(cryptoAmount.toFixed(8)),
    fiatAmount: Number(fiatAmount.toFixed(2)),
    fiatCurrency: cur,
    rateUsd: effectiveRateUsd,
    rateInr: useInrPricing ? priceInr : sellInr,
    usdNotional: Number(usdNotional.toFixed(2)),
  };
}

export async function createExchangeOrder(userId: number, opts: {
  side: "buy" | "sell";
  symbol: string;
  network: string;
  fiatCurrency: string;
  fiatAmount?: number;
  cryptoAmount?: number;
  paymentGatewayId?: number;
  paymentAccountId?: number;
  receiveWalletAddress?: string;
  depositMethod?: string;
}) {
  await assertKycForExchange(userId);
  const quote = await calculateExchangeQuote({
    side: opts.side,
    symbol: opts.symbol,
    network: opts.network,
    fiatCurrency: opts.fiatCurrency,
    fiatAmount: opts.fiatAmount,
    cryptoAmount: opts.cryptoAmount,
  });

  if (opts.side === "buy" && !opts.paymentGatewayId) {
    throw new WalletError("Select a deposit method (UPI, Digital Rupee, bank, or gateway)", "DEPOSIT_METHOD_REQUIRED");
  }
  if (opts.side === "sell" && !opts.paymentAccountId) {
    throw new WalletError("Select a UPI, Digital Rupee, or bank account for fiat payout", "PAYOUT_ACCOUNT_REQUIRED");
  }

  if (opts.side === "buy" && opts.paymentGatewayId) {
    const [gw] = await db.select().from(paymentGatewaysTable)
      .where(and(eq(paymentGatewaysTable.id, opts.paymentGatewayId), eq(paymentGatewaysTable.isEnabled, true)))
      .limit(1);
    if (!gw) throw new WalletError("Deposit method not found", "GATEWAY_NOT_FOUND");
    if (gw.type === "upi") {
      await assertUpiDepositWithinLimit(quote.fiatAmount, quote.fiatCurrency);
    }
    if (gw.type === "digital_rupee") {
      await assertDigitalRupeeDepositWithinLimit(quote.fiatAmount, quote.fiatCurrency);
    }
  }

  if (opts.side === "sell" && opts.paymentAccountId) {
    const [acct] = await db.select().from(userPaymentAccountsTable)
      .where(and(
        eq(userPaymentAccountsTable.id, opts.paymentAccountId),
        eq(userPaymentAccountsTable.userId, userId),
        eq(userPaymentAccountsTable.isActive, true),
      )).limit(1);
    if (!acct) throw new WalletError("Payout account not found", "ACCOUNT_NOT_FOUND");
    if (!["bank", "upi", "digital_rupee"].includes(acct.accountType)) {
      throw new WalletError("Sell orders require a UPI, Digital Rupee, or bank payout account", "INVALID_PAYOUT_ACCOUNT");
    }
  }

  if (opts.side === "sell") {
    const gw = await findCryptoGatewayForAsset(quote.symbol, quote.network);
    if (!gw?.walletAddress?.trim()) {
      throw new WalletError("Platform deposit wallet not configured for this asset", "GATEWAY_NOT_FOUND");
    }
    if (!gw.isEnabled) {
      await db.update(paymentGatewaysTable)
        .set({ isEnabled: true })
        .where(eq(paymentGatewaysTable.id, gw.id));
    }
  }

  const [order] = await db.insert(exchangeOrdersTable).values({
    userId,
    side: opts.side,
    cryptoSymbol: quote.symbol,
    cryptoNetwork: quote.network,
    cryptoAmount: String(quote.cryptoAmount),
    fiatAmount: String(quote.fiatAmount),
    fiatCurrency: quote.fiatCurrency,
    rateUsd: String(quote.rateUsd),
    status: "awaiting_deposit",
    paymentGatewayId: opts.paymentGatewayId || null,
    paymentAccountId: opts.paymentAccountId || null,
    receiveWalletAddress: opts.receiveWalletAddress?.trim() || null,
    depositMethod: opts.depositMethod || null,
  }).returning();

  return mapExchangeOrder(order);
}

export async function submitExchangeDeposit(userId: number, orderId: number, opts: {
  proofUrl?: string;
  txHash?: string;
  utrReference?: string;
}) {
  const [order] = await db.select().from(exchangeOrdersTable)
    .where(and(eq(exchangeOrdersTable.id, orderId), eq(exchangeOrdersTable.userId, userId)))
    .limit(1);
  if (!order) throw new WalletError("Order not found", "NOT_FOUND");
  if (!["awaiting_deposit", "deposit_submitted"].includes(order.status)) {
    throw new WalletError("Order is not awaiting deposit", "INVALID_STATUS");
  }

  if (order.side === "buy" && !opts.proofUrl && !opts.utrReference) {
    throw new WalletError("Upload payment proof or enter UTR/reference", "PROOF_REQUIRED");
  }
  if (order.side === "sell" && !opts.txHash) {
    throw new WalletError("Blockchain transaction hash is required for crypto deposit", "TX_HASH_REQUIRED");
  }

  let depositTransactionId = order.depositTransactionId;

  if (!depositTransactionId) {
    const isBuy = order.side === "buy";
    type TxnCur = "USD" | "INR" | "EUR" | "BTC" | "ETH" | "USDT" | "TRX" | "BNB";
    const txnCurrency: TxnCur = isBuy
      ? (order.fiatCurrency.toUpperCase() as TxnCur)
      : (ledgerCurrencyForCrypto(order.cryptoSymbol) as TxnCur);

    const [txn] = await db.insert(transactionsTable).values({
      userId,
      type: "deposit",
      amount: isBuy ? order.fiatAmount : order.cryptoAmount,
      currency: txnCurrency,
      status: "pending",
      paymentMethod: isBuy
        ? `Exchange BUY #${order.id} — ${order.depositMethod || "fiat"}`
        : `Exchange SELL #${order.id} — ${order.cryptoSymbol} ${order.cryptoNetwork}`,
      txHash: opts.txHash || null,
      proofUrl: opts.proofUrl || null,
      utrReference: opts.utrReference || null,
      gatewayProvider: isBuy ? "exchange_fiat" : "exchange_crypto",
      notes: `Exchange order #${order.id} (${order.side})`,
    }).returning();
    depositTransactionId = txn.id;
  } else {
    await db.update(transactionsTable).set({
      proofUrl: opts.proofUrl || undefined,
      txHash: opts.txHash || undefined,
      utrReference: opts.utrReference || undefined,
      updatedAt: new Date(),
    }).where(eq(transactionsTable.id, depositTransactionId));
  }

  const [updated] = await db.update(exchangeOrdersTable).set({
    status: "deposit_submitted",
    depositTransactionId,
    proofUrl: opts.proofUrl || order.proofUrl,
    txHash: opts.txHash || order.txHash,
    utrReference: opts.utrReference || order.utrReference,
  }).where(eq(exchangeOrdersTable.id, orderId)).returning();

  return mapExchangeOrder(updated);
}

export async function completeExchangeOrder(orderId: number, adminUserId: number, adminNotes?: string) {
  const [order] = await db.select().from(exchangeOrdersTable)
    .where(eq(exchangeOrdersTable.id, orderId)).limit(1);
  if (!order) throw new WalletError("Order not found", "NOT_FOUND");
  if (!["deposit_submitted", "processing"].includes(order.status)) {
    throw new WalletError("Order cannot be completed in current status", "INVALID_STATUS");
  }

  if (order.depositTransactionId) {
    await db.update(transactionsTable).set({
      status: "approved",
      reviewedByUserId: adminUserId,
      reviewedAt: new Date(),
      adminNotes: adminNotes || null,
    }).where(eq(transactionsTable.id, order.depositTransactionId));
  }

  const fx = await getExchangeRates();
  const fiatUsd = await convertToUsd(Number(order.fiatAmount), order.fiatCurrency);
  void fx;

  const ledgerCur = ledgerCurrencyForCrypto(order.cryptoSymbol);

  if (order.side === "buy") {
    if (!order.receiveWalletAddress) {
      await creditWallet({
        userId: order.userId,
        amount: Number(order.cryptoAmount),
        currency: ledgerCur,
        type: "deposit",
        referenceType: "exchange_order",
        referenceId: order.id,
        description: `Exchange BUY #${order.id} — ${order.cryptoSymbol} ${order.cryptoNetwork}`,
      });
    }
  } else {
    const [acct] = order.paymentAccountId
      ? await db.select().from(userPaymentAccountsTable).where(eq(userPaymentAccountsTable.id, order.paymentAccountId)).limit(1)
      : [null];

    const [payoutTxn] = await db.insert(transactionsTable).values({
      userId: order.userId,
      type: "withdrawal",
      amount: String(fiatUsd),
      currency: "USD",
      status: "approved",
      paymentMethod: acct
        ? (acct.accountType === "upi"
          ? `UPI: ${acct.upiId}`
          : acct.accountType === "digital_rupee"
            ? `Digital Rupee: ${acct.digitalRupeeId}`
            : `Bank: ${acct.bankName} ${acct.accountNumber}`)
        : "Exchange fiat payout",
      gatewayProvider: "exchange_payout",
      notes: `Exchange SELL #${order.id} — admin pays ${order.fiatAmount} ${order.fiatCurrency} off-platform`,
      reviewedByUserId: adminUserId,
      reviewedAt: new Date(),
    }).returning();

    await db.update(exchangeOrdersTable).set({ payoutTransactionId: payoutTxn.id })
      .where(eq(exchangeOrdersTable.id, orderId));
  }

  const [completed] = await db.update(exchangeOrdersTable).set({
    status: "completed",
    reviewedByUserId: adminUserId,
    reviewedAt: new Date(),
    adminNotes: adminNotes || null,
  }).where(eq(exchangeOrdersTable.id, orderId)).returning();

  return mapExchangeOrder(completed);
}

export async function rejectExchangeOrder(orderId: number, adminUserId: number, reason?: string) {
  const [order] = await db.select().from(exchangeOrdersTable)
    .where(eq(exchangeOrdersTable.id, orderId)).limit(1);
  if (!order) throw new WalletError("Order not found", "NOT_FOUND");
  if (["completed", "cancelled", "rejected"].includes(order.status)) {
    throw new WalletError("Order already finalized", "INVALID_STATUS");
  }

  if (order.depositTransactionId) {
    await db.update(transactionsTable).set({
      status: "rejected",
      reviewedByUserId: adminUserId,
      reviewedAt: new Date(),
      adminNotes: reason || "Exchange order rejected",
    }).where(eq(transactionsTable.id, order.depositTransactionId));
  }

  const [updated] = await db.update(exchangeOrdersTable).set({
    status: "rejected",
    reviewedByUserId: adminUserId,
    reviewedAt: new Date(),
    adminNotes: reason || null,
  }).where(eq(exchangeOrdersTable.id, orderId)).returning();

  return mapExchangeOrder(updated);
}

export async function getExchangeOrderWithContext(orderId: number, userId?: number) {
  const [order] = userId
    ? await db.select().from(exchangeOrdersTable)
      .where(and(eq(exchangeOrdersTable.id, orderId), eq(exchangeOrdersTable.userId, userId))).limit(1)
    : await db.select().from(exchangeOrdersTable).where(eq(exchangeOrdersTable.id, orderId)).limit(1);
  if (!order) return null;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, order.userId)).limit(1);
  let gateway = null;
  let payoutAccount = null;

  if (order.paymentGatewayId) {
    const [gw] = await db.select().from(paymentGatewaysTable).where(eq(paymentGatewaysTable.id, order.paymentGatewayId)).limit(1);
    if (gw) {
      const { ensurePaymentGatewayQrs } = await import("./qrCodeService");
      const { mapEnrichedDepositGateway } = await import("./paymentCredentialsService");
      const [ensured] = await ensurePaymentGatewayQrs([gw]);
      gateway = mapEnrichedDepositGateway(ensured);
    }
  }

  if (order.side === "sell") {
    const gw = await findCryptoGatewayForAsset(order.cryptoSymbol, order.cryptoNetwork);
    if (gw) {
      const { ensurePaymentGatewayQrs } = await import("./qrCodeService");
      const { mapEnrichedDepositGateway } = await import("./paymentCredentialsService");
      const [ensured] = await ensurePaymentGatewayQrs([gw]);
      gateway = mapEnrichedDepositGateway(ensured);
    }
  }

  if (order.paymentAccountId) {
    const [acct] = await db.select().from(userPaymentAccountsTable)
      .where(eq(userPaymentAccountsTable.id, order.paymentAccountId)).limit(1);
    if (acct) {
      const { ensureUserPaymentAccountQr } = await import("./qrCodeService");
      const { mapUserPaymentAccountResponse } = await import("./paymentCredentialsService");
      const ensured = await ensureUserPaymentAccountQr(acct);
      payoutAccount = mapUserPaymentAccountResponse(ensured);
    }
  }

  return {
    ...mapExchangeOrder(order, user),
    depositGateway: gateway,
    payoutAccount,
  };
}

export async function listUserExchangeOrders(userId: number) {
  const rows = await db.select().from(exchangeOrdersTable)
    .where(eq(exchangeOrdersTable.userId, userId))
    .orderBy(desc(exchangeOrdersTable.createdAt));
  return rows.map(r => mapExchangeOrder(r));
}

export async function listAllExchangeOrders(status?: string) {
  const rows = await db.select().from(exchangeOrdersTable).orderBy(desc(exchangeOrdersTable.createdAt));
  const filtered = status && status !== "all"
    ? rows.filter(r => r.status === status)
    : rows;

  const users = await db.select().from(usersTable);
  const userMap = new Map(users.map(u => [u.id, u]));

  return filtered.map(r => mapExchangeOrder(r, userMap.get(r.userId)));
}
