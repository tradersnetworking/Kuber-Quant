import { cn } from "@/lib/utils";

const BANNER_SRC = `${(import.meta.env.BASE_URL || "/").replace(/\/+$/, "")}/payment-brands/deposit-withdrawal-methods.png`;

type Props = {
  className?: string;
  /** Home landing uses full-bleed dark section; in-app uses compact card padding. */
  variant?: "landing" | "inline";
};

/** Branded deposit & withdrawal methods banner (single asset). */
export function DepositWithdrawalMethodsBanner({ className, variant = "inline" }: Props) {
  if (variant === "landing") {
    return (
      <section
        id="payments"
        className={cn(
          "w-full py-12 sm:py-16 md:py-20 px-4 sm:px-6",
          "bg-gradient-to-b from-[#050A14] via-[#0a1220] to-[#050A14]",
          "border-y border-amber-500/20",
          className,
        )}
      >
        <div className="max-w-5xl mx-auto min-w-0">
          <img
            src={BANNER_SRC}
            alt="Deposit and withdrawal methods — UPI, cards, net banking, IMPS, NEFT, RTGS, and cryptocurrency"
            className="w-full h-auto rounded-xl border border-amber-500/30 shadow-xl shadow-black/40"
            loading="lazy"
            decoding="async"
          />
        </div>
      </section>
    );
  }

  return (
    <div className={cn("min-w-0", className)}>
      <img
        src={BANNER_SRC}
        alt="Deposit and withdrawal methods — UPI, cards, net banking, IMPS, NEFT, RTGS, and cryptocurrency"
        className="w-full h-auto rounded-lg border border-amber-500/25 shadow-md"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
