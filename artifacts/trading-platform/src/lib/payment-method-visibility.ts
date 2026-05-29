import { authFetchJson } from "@/lib/token-store";

export type PaymentMethodKey = "upi" | "digital_rupee" | "bank" | "gateway" | "crypto";

export type PaymentMethodVisibility = {
  deposit: Record<PaymentMethodKey, boolean>;
  withdrawal: Record<PaymentMethodKey, boolean>;
};

export const ALL_ENABLED: Record<PaymentMethodKey, boolean> = {
  upi: true,
  digital_rupee: true,
  bank: true,
  gateway: true,
  crypto: true,
};

export function fetchPaymentMethodVisibility() {
  return authFetchJson<PaymentMethodVisibility>("/payments/method-visibility");
}
