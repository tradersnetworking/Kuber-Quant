import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";
import { getSiteSetting, invalidateSiteSettingsCache } from "./siteSettings";

const KEY = "payment_method_visibility";

export type PaymentMethodKey = "upi" | "digital_rupee" | "bank" | "gateway" | "crypto";

export type PaymentMethodVisibility = {
  deposit: Record<PaymentMethodKey, boolean>;
  withdrawal: Record<PaymentMethodKey, boolean>;
};

const ALL_METHODS: PaymentMethodKey[] = ["upi", "digital_rupee", "bank", "gateway", "crypto"];

function defaults(): PaymentMethodVisibility {
  const all = () => ALL_METHODS.reduce((acc, m) => { acc[m] = true; return acc; }, {} as Record<PaymentMethodKey, boolean>);
  const withdrawal = all();
  // Online gateways are deposit-only; payouts never route through a gateway.
  withdrawal.gateway = false;
  return { deposit: all(), withdrawal };
}

function merge(base: PaymentMethodVisibility, raw: any): PaymentMethodVisibility {
  const out = defaults();
  if (raw && typeof raw === "object") {
    for (const scope of ["deposit", "withdrawal"] as const) {
      if (raw[scope] && typeof raw[scope] === "object") {
        for (const m of ALL_METHODS) {
          if (typeof raw[scope][m] === "boolean") out[scope][m] = raw[scope][m];
        }
      }
    }
  }
  // Gateway is never a valid withdrawal method.
  out.withdrawal.gateway = false;
  return out;
}

export async function getPaymentMethodVisibility(): Promise<PaymentMethodVisibility> {
  const raw = await getSiteSetting(KEY, "");
  let parsed: any = {};
  if (raw) { try { parsed = JSON.parse(raw); } catch { parsed = {}; } }
  return merge(defaults(), parsed);
}

export async function updatePaymentMethodVisibility(
  patch: Partial<PaymentMethodVisibility>,
): Promise<PaymentMethodVisibility> {
  const current = await getPaymentMethodVisibility();
  const next = merge(current, { ...current, ...patch, deposit: { ...current.deposit, ...(patch.deposit || {}) }, withdrawal: { ...current.withdrawal, ...(patch.withdrawal || {}) } });
  const value = JSON.stringify(next);

  const [existing] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, KEY)).limit(1);
  if (existing) {
    await db.update(siteSettingsTable).set({ value }).where(eq(siteSettingsTable.key, KEY));
  } else {
    await db.insert(siteSettingsTable).values({
      key: KEY,
      value,
      label: "Payment Method Visibility",
      category: "payments",
      description: "Controls which deposit/withdrawal methods are shown to users",
    });
  }
  invalidateSiteSettingsCache();
  return next;
}
