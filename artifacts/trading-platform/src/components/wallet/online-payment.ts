import { authFetchJson } from "@/lib/token-store";
import { getOnlineGatewayLabel } from "./deposit-account-utils";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

export function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(s);
  });
}

function postRedirectForm(action: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  for (const [k, v] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = k;
    input.value = v;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

export async function processOnlinePayment(
  gatewayType: string,
  amount: number,
  opts?: {
    onSuccess?: () => void;
    onlineConfigured?: Record<string, boolean>;
  },
): Promise<{ ok: true } | { ok: false; message: string; title?: string }> {
  if (!amount || amount <= 0) {
    return { ok: false, message: "Enter a valid amount", title: "Invalid amount" };
  }

  if (gatewayType === "razorpay") {
    await loadRazorpayScript();
    const order = await authFetchJson<{ orderId: string; amount: number; currency: string; keyId: string }>(
      "/payments/razorpay/create-order",
      { method: "POST", body: JSON.stringify({ amount, currency: "INR" }) },
    );
    await new Promise<void>((resolve, reject) => {
      const rzp = new window.Razorpay!({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "Kuber Quant",
        description: "Wallet Deposit",
        handler: async (response: Record<string, string>) => {
          try {
            await authFetchJson("/payments/razorpay/verify", {
              method: "POST",
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount,
                currency: order.currency,
              }),
            });
            opts?.onSuccess?.();
            resolve();
          } catch (err) {
            reject(err);
          }
        },
        modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
      });
      rzp.open();
    });
    return { ok: true };
  }

  if (gatewayType === "phonepe") {
    const pp = await authFetchJson<{ url: string; base64Payload: string; checksum: string }>(
      "/payments/phonepe/initiate",
      { method: "POST", body: JSON.stringify({ amount, currency: "INR" }) },
    );
    postRedirectForm(pp.url, { request: pp.base64Payload, checksum: pp.checksum });
    return { ok: true };
  }

  if (gatewayType === "payu") {
    const pu = await authFetchJson<{ action: string; params: Record<string, string> }>(
      "/payments/payu/initiate",
      { method: "POST", body: JSON.stringify({ amount, currency: "INR" }) },
    );
    postRedirectForm(pu.action, pu.params);
    return { ok: true };
  }

  const label = getOnlineGatewayLabel(gatewayType);
  return {
    ok: false,
    title: `${label} checkout`,
    message: opts?.onlineConfigured?.[gatewayType]
      ? "Integration coming soon — use manual UPI/bank deposit for now."
      : "Gateway not configured on server. Contact admin.",
  };
}
