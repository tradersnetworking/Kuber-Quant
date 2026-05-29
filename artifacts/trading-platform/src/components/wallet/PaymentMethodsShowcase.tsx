import { cn } from "@/lib/utils";
import {
  BANK_RAIL_BRANDS,
  CARD_BRANDS,
  CRYPTO_BRANDS,
  DEPOSIT_METHOD_BANNER_ROW_1,
  DEPOSIT_METHOD_BANNER_ROW_2,
  DEPOSIT_WITHDRAW_FEATURE_CHIPS,
  DIGITAL_RUPEE_BRANDS,
  GATEWAY_BRANDS,
  UPI_APP_BRANDS,
  type PaymentBrandCategory,
} from "@/lib/payment-method-catalog";
import { PaymentMethodBrandTile } from "@/components/wallet/PaymentMethodBrandIcon";
import { BarChart3, Handshake, ShieldCheck, Target } from "lucide-react";

const FEATURE_ICONS = [ShieldCheck, BarChart3, Handshake, Target] as const;

const CATEGORY_ITEMS: Record<PaymentBrandCategory, typeof UPI_APP_BRANDS> = {
  upi: UPI_APP_BRANDS,
  digital_rupee: DIGITAL_RUPEE_BRANDS,
  bank: BANK_RAIL_BRANDS,
  gateway: [...GATEWAY_BRANDS, ...CARD_BRANDS],
  card: CARD_BRANDS,
  crypto: CRYPTO_BRANDS,
};

export function PaymentMethodCategoryStrip({
  category,
  label,
  className,
}: {
  category: PaymentBrandCategory;
  label?: string;
  className?: string;
}) {
  const items = CATEGORY_ITEMS[category];
  return (
    <div className={cn("min-w-0", className)}>
      {label && (
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          {label}
        </p>
      )}
      <div className="-mx-0.5 overflow-x-auto overscroll-x-contain">
        <div className="flex gap-1.5 min-w-max px-0.5 pb-0.5 sm:grid sm:min-w-0 sm:grid-cols-4 lg:grid-cols-6 sm:gap-2">
          {items.map((item, i) => (
            <PaymentMethodBrandTile
              key={`${category}-${item.id}-${i}`}
              item={item}
              compact
              iconOnly
              className="w-[4.5rem] shrink-0 sm:w-auto sm:shrink"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type Props = {
  mode?: "deposit" | "withdraw" | "both";
  compact?: boolean;
  highlightCategory?: PaymentBrandCategory | "gateway" | "card";
  className?: string;
};

function BannerRows({ compact }: { compact?: boolean }) {
  return (
    <div className={cn("space-y-2 min-w-0", compact ? "space-y-1.5" : "space-y-2.5")}>
      <div className={cn("grid gap-1.5 sm:gap-2 min-w-0", compact ? "grid-cols-4 sm:grid-cols-4" : "grid-cols-4 sm:grid-cols-4 md:grid-cols-8")}>
        {DEPOSIT_METHOD_BANNER_ROW_1.map((item, i) => (
          <PaymentMethodBrandTile key={`r1-${item.id}-${i}`} item={item} compact={compact} iconOnly />
        ))}
      </div>
      <div className={cn("grid gap-1.5 sm:gap-2 min-w-0", compact ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-3 sm:grid-cols-5 md:grid-cols-9")}>
        {DEPOSIT_METHOD_BANNER_ROW_2.map((item, i) => (
          <PaymentMethodBrandTile key={`r2-${item.id}-${i}`} item={item} compact={compact} iconOnly />
        ))}
      </div>
    </div>
  );
}

function MethodSection({
  title,
  items,
  compact,
  columns = "grid-cols-2 sm:grid-cols-4",
}: {
  title: string;
  items: typeof UPI_APP_BRANDS;
  compact?: boolean;
  columns?: string;
}) {
  if (!items.length) return null;
  return (
    <div className="min-w-0">
      <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {title}
      </p>
      <div className={cn("grid gap-2 min-w-0", columns)}>
        {items.map((item, i) => (
          <PaymentMethodBrandTile key={`${title}-${item.id}-${i}`} item={item} compact={compact} iconOnly />
        ))}
      </div>
    </div>
  );
}

export function PaymentMethodsShowcase({
  mode = "both",
  compact = false,
  className,
}: Props) {
  const title =
    mode === "deposit"
      ? "Available deposit methods"
      : mode === "withdraw"
        ? "Available withdrawal methods"
        : "Deposit & withdrawal methods";

  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 dark:border-white/10 bg-gradient-to-br from-muted/50 via-background to-muted/30 dark:from-white/[0.04] dark:to-transparent overflow-hidden min-w-0",
        compact ? "p-3" : "p-3 sm:p-4",
        className,
      )}
    >
      <div className="min-w-0 mb-3">
        <h3 className={cn("font-bold leading-snug break-words", compact ? "text-sm" : "text-base sm:text-lg")}>
          <span className="text-foreground">{mode === "withdraw" ? "Withdraw via " : "Pay with "}</span>
          <span className="text-emerald-600 dark:text-emerald-400">UPI · Digital Rupee · Bank · Gateway · Crypto</span>
        </h3>
        {!compact && (
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-relaxed">
            {title} — Visa, GPay, PhonePe, Paytm, BHIM, IMPS, NEFT, RTGS, cards, gateways, and crypto.
          </p>
        )}
      </div>

      <div className={cn("space-y-3 sm:space-y-4 min-w-0", compact && "space-y-2.5")}>
        <BannerRows compact={compact} />
        <MethodSection title="Cryptocurrency" items={CRYPTO_BRANDS} compact={compact} columns="grid-cols-3 sm:grid-cols-5" />
        {!compact && (
          <MethodSection title="Payment gateways" items={GATEWAY_BRANDS} compact={compact} columns="grid-cols-2 sm:grid-cols-4" />
        )}
      </div>

      {!compact && (
        <div className="mt-4 pt-3 border-t border-border/60 dark:border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 min-w-0">
          {DEPOSIT_WITHDRAW_FEATURE_CHIPS.map((text, i) => {
            const Icon = FEATURE_ICONS[i] ?? ShieldCheck;
            return (
              <div key={text} className="flex items-start gap-1.5 min-w-0 p-2 rounded-lg bg-muted/40 dark:bg-white/[0.03]">
                <Icon className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-snug break-words">{text}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
