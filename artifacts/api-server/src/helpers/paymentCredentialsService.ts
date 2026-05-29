import type { paymentGatewaysTable, userPaymentAccountsTable } from "@workspace/db";
import { resolvePublicAssetUrl } from "./publicAssetUrl";

export function trimCred(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

export function normalizeUpiId(v: unknown): string | null {
  const s = trimCred(v);
  return s ? s.toLowerCase() : null;
}

export function normalizeIfsc(v: unknown): string | null {
  const s = trimCred(v);
  return s ? s.toUpperCase() : null;
}

export function normalizeCryptoSymbol(v: unknown): string | null {
  const s = trimCred(v);
  return s ? s.toUpperCase() : null;
}

const BANK_EXTRA_KEYS = [
  "accountHolderName",
  "bankName",
  "accountNumber",
  "ifscCode",
  "branchName",
  "accountType",
  "swiftCode",
  "micrCode",
  "micr",
] as const;

export function sanitizeExtraConfig(ec: Record<string, unknown> | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(ec || {})) {
    let t = trimCred(v);
    if (!t) continue;
    if (k === "ifscCode") t = t.toUpperCase();
    if (k === "micr") {
      out.micrCode = t;
      continue;
    }
    out[k] = t;
  }
  return out;
}

/** Merge incoming extraConfig — bank keys replace prior values when provided. */
export function mergeGatewayExtraConfig(
  type: string,
  incoming: Record<string, unknown> | null | undefined,
  existing?: Record<string, string> | null,
): Record<string, string> {
  const base = sanitizeExtraConfig(existing || undefined);
  const input = sanitizeExtraConfig(incoming || undefined);

  if (type === "bank" || type === "fiat") {
    const preserved = Object.fromEntries(
      Object.entries(base).filter(([k]) => !BANK_EXTRA_KEYS.includes(k as typeof BANK_EXTRA_KEYS[number]) && k !== "micrCode"),
    );
    const bankOnly: Record<string, string> = {};
    for (const k of BANK_EXTRA_KEYS) {
      const targetKey = k === "micr" ? "micrCode" : k;
      const val = input[k] ?? input[targetKey];
      if (val) bankOnly[targetKey] = val;
    }
    const shared = Object.fromEntries(
      Object.entries(input).filter(([k]) => !BANK_EXTRA_KEYS.includes(k as typeof BANK_EXTRA_KEYS[number]) && k !== "micr"),
    );
    return { ...preserved, ...bankOnly, ...shared };
  }

  return { ...base, ...input };
}

export function typeFieldCleanup(type: string): Record<string, null> {
  if (type === "upi") {
    return { symbol: null, network: null, walletAddress: null };
  }
  if (type === "bank" || type === "fiat") {
    return { symbol: null, network: null, walletAddress: null, upiId: null };
  }
  if (type === "crypto") {
    return { upiId: null };
  }
  return {};
}

export function normalizeGatewayWrite(
  body: Record<string, unknown>,
  existing?: typeof paymentGatewaysTable.$inferSelect,
): {
  values: Record<string, unknown>;
  identifierChanged: boolean;
} {
  const type = String(body.type ?? existing?.type ?? "upi");
  const name = trimCred(body.name) ?? existing?.name ?? "Account";

  const extraConfig = body.extraConfig !== undefined
    ? mergeGatewayExtraConfig(type, body.extraConfig as Record<string, unknown>, existing?.extraConfig)
    : sanitizeExtraConfig(existing?.extraConfig || undefined);

  const upiId = body.upiId !== undefined ? normalizeUpiId(body.upiId) : normalizeUpiId(existing?.upiId);
  const walletAddress = body.walletAddress !== undefined ? trimCred(body.walletAddress) : trimCred(existing?.walletAddress);
  const symbol = body.symbol !== undefined ? normalizeCryptoSymbol(body.symbol) : normalizeCryptoSymbol(existing?.symbol);
  const network = body.network !== undefined ? trimCred(body.network) : trimCred(existing?.network);
  const description = body.description !== undefined ? trimCred(body.description) : trimCred(existing?.description);

  const identifierChanged = (body.upiId !== undefined && upiId !== normalizeUpiId(existing?.upiId))
    || (body.walletAddress !== undefined && walletAddress !== trimCred(existing?.walletAddress));

  const values: Record<string, unknown> = {
    name,
    type,
    description,
    upiId,
    walletAddress,
    symbol,
    network,
    extraConfig,
    ...typeFieldCleanup(type),
    updatedAt: new Date(),
  };

  if (body.qrCodeUrl !== undefined) values.qrCodeUrl = trimCred(body.qrCodeUrl);
  if (body.isEnabled !== undefined) values.isEnabled = body.isEnabled !== false;
  else if (!existing) values.isEnabled = true;
  if (body.sortOrder !== undefined) values.sortOrder = body.sortOrder;
  else if (!existing) values.sortOrder = 0;
  if (body.minAmount !== undefined) values.minAmount = body.minAmount;
  if (body.maxAmount !== undefined) values.maxAmount = body.maxAmount;

  return { values, identifierChanged };
}

export function mapEnrichedDepositGateway(g: typeof paymentGatewaysTable.$inferSelect) {
  const ec = sanitizeExtraConfig(g.extraConfig as Record<string, unknown>);
  const logoUrl = resolvePublicAssetUrl(ec.logoUrl || null);
  const qrCodeUrl = resolvePublicAssetUrl(g.qrCodeUrl);

  return {
    id: g.id,
    name: g.name,
    type: g.type,
    symbol: normalizeCryptoSymbol(g.symbol),
    network: trimCred(g.network),
    description: trimCred(g.description),
    walletAddress: trimCred(g.walletAddress),
    upiId: normalizeUpiId(g.upiId),
    qrCodeUrl,
    minAmount: Number(g.minAmount || 0),
    maxAmount: g.maxAmount ? Number(g.maxAmount) : null,
    isEnabled: g.isEnabled,
    sortOrder: g.sortOrder,
    extraConfig: {
      ...ec,
      ...(logoUrl ? { logoUrl } : {}),
    },
    accountHolderName: ec.accountHolderName || null,
    bankName: ec.bankName || ((g.type === "bank" || g.type === "fiat") ? g.name : null),
    accountNumber: ec.accountNumber || null,
    ifscCode: ec.ifscCode || null,
    branchName: ec.branchName || null,
    accountType: ec.accountType || null,
    swiftCode: ec.swiftCode || null,
    micrCode: ec.micrCode || null,
    badge: ec.badge || null,
    note: ec.note || null,
    logoUrl: logoUrl || null,
  };
}

export function mapAdminPaymentGateway(g: typeof paymentGatewaysTable.$inferSelect) {
  const enriched = mapEnrichedDepositGateway(g);
  return {
    ...enriched,
    extraConfig: enriched.extraConfig,
    createdAt: g.createdAt.toISOString(),
  };
}

export function normalizeUserAccountWrite(
  body: Record<string, unknown>,
  existing?: typeof userPaymentAccountsTable.$inferSelect,
): {
  updates: Record<string, unknown>;
  accountType: string;
  identifierChanged: boolean;
} {
  const accountType = String(body.accountType ?? existing?.accountType ?? "bank");
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  const setIfDefined = (key: string, value: unknown) => {
    if (body[key] !== undefined) updates[key] = value;
  };

  setIfDefined("label", trimCred(body.label));
  setIfDefined("accountHolderName", trimCred(body.accountHolderName));
  setIfDefined("bankName", trimCred(body.bankName));
  setIfDefined("accountNumber", trimCred(body.accountNumber));
  setIfDefined("ifscCode", body.ifscCode !== undefined ? normalizeIfsc(body.ifscCode) : undefined);
  setIfDefined("branchName", trimCred(body.branchName));
  setIfDefined("upiId", body.upiId !== undefined ? normalizeUpiId(body.upiId) : undefined);
  setIfDefined("walletAddress", trimCred(body.walletAddress));
  setIfDefined("cryptoSymbol", body.cryptoSymbol !== undefined ? normalizeCryptoSymbol(body.cryptoSymbol) : undefined);
  setIfDefined("cryptoNetwork", trimCred(body.cryptoNetwork));
  setIfDefined("upiQrUrl", trimCred(body.upiQrUrl));
  setIfDefined("walletQrUrl", trimCred(body.walletQrUrl));
  setIfDefined("isDefault", body.isDefault);
  setIfDefined("isActive", body.isActive);

  if (body.accountType !== undefined) updates.accountType = accountType;

  if (body.accountType !== undefined && body.accountType !== existing?.accountType) {
    if (accountType === "upi") {
      Object.assign(updates, {
        bankName: null,
        accountNumber: null,
        ifscCode: null,
        branchName: null,
        walletAddress: null,
        cryptoSymbol: null,
        cryptoNetwork: null,
        walletQrUrl: null,
      });
    } else if (accountType === "bank") {
      Object.assign(updates, {
        upiId: null,
        upiQrUrl: null,
        walletAddress: null,
        cryptoSymbol: null,
        cryptoNetwork: null,
        walletQrUrl: null,
      });
    } else if (accountType === "crypto") {
      Object.assign(updates, {
        upiId: null,
        upiQrUrl: null,
        bankName: null,
        accountNumber: null,
        ifscCode: null,
        branchName: null,
      });
    }
  }

  const mergedUpi = updates.upiId !== undefined ? updates.upiId : existing?.upiId;
  const mergedWallet = updates.walletAddress !== undefined ? updates.walletAddress : existing?.walletAddress;
  const identifierChanged = (updates.upiId !== undefined && mergedUpi !== existing?.upiId)
    || (updates.walletAddress !== undefined && mergedWallet !== existing?.walletAddress);

  return { updates, accountType, identifierChanged };
}

export function mapUserPaymentAccountResponse(a: typeof userPaymentAccountsTable.$inferSelect) {
  return {
    id: a.id,
    userId: a.userId,
    label: trimCred(a.label) || a.label,
    accountType: a.accountType,
    accountHolderName: trimCred(a.accountHolderName),
    bankName: trimCred(a.bankName),
    accountNumber: trimCred(a.accountNumber),
    ifscCode: normalizeIfsc(a.ifscCode),
    branchName: trimCred(a.branchName),
    upiId: normalizeUpiId(a.upiId),
    upiQrUrl: resolvePublicAssetUrl(a.upiQrUrl),
    cryptoSymbol: normalizeCryptoSymbol(a.cryptoSymbol),
    cryptoNetwork: trimCred(a.cryptoNetwork),
    walletAddress: trimCred(a.walletAddress),
    walletQrUrl: resolvePublicAssetUrl(a.walletQrUrl),
    isDefault: a.isDefault,
    isActive: a.isActive,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt?.toISOString() || null,
  };
}

export function buildUserAccountInsertValues(
  userId: number,
  body: Record<string, unknown>,
): typeof userPaymentAccountsTable.$inferInsert {
  const accountType = String(body.accountType);
  return {
    userId,
    label: trimCred(body.label) || "Account",
    accountType,
    accountHolderName: trimCred(body.accountHolderName),
    bankName: trimCred(body.bankName),
    accountNumber: trimCred(body.accountNumber),
    ifscCode: normalizeIfsc(body.ifscCode),
    branchName: trimCred(body.branchName),
    upiId: normalizeUpiId(body.upiId),
    upiQrUrl: trimCred(body.upiQrUrl),
    cryptoSymbol: normalizeCryptoSymbol(body.cryptoSymbol),
    cryptoNetwork: trimCred(body.cryptoNetwork),
    walletAddress: trimCred(body.walletAddress),
    walletQrUrl: trimCred(body.walletQrUrl),
    isDefault: !!body.isDefault,
  };
}
