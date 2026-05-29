import { cn } from "@/lib/utils";
import { BarChart3, Handshake, ShieldCheck, Star, Target } from "lucide-react";
import { DEPOSIT_WITHDRAW_FEATURE_CHIPS } from "@/lib/payment-method-catalog";

const FEATURE_ICONS = [ShieldCheck, BarChart3, Handshake, Target] as const;

const FEATURE_ACCENTS = [
  { iconBg: "bg-emerald-500/15 dark:bg-emerald-500/10", iconBorder: "border-emerald-500/30 dark:border-emerald-500/20", iconColor: "text-emerald-600 dark:text-emerald-400" },
  { iconBg: "bg-blue-500/15 dark:bg-blue-500/10", iconBorder: "border-blue-500/30 dark:border-blue-500/20", iconColor: "text-blue-600 dark:text-blue-400" },
  { iconBg: "bg-amber-500/15 dark:bg-amber-500/10", iconBorder: "border-amber-500/30 dark:border-amber-500/20", iconColor: "text-amber-600 dark:text-amber-400" },
  { iconBg: "bg-purple-500/15 dark:bg-purple-500/10", iconBorder: "border-purple-500/30 dark:border-purple-500/20", iconColor: "text-purple-600 dark:text-purple-400" },
] as const;

/** Bottom-of-page trust strip + gold CTA banner (theme-aware for light & dark). */
export function LandingTrustCtaSection({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "w-full border-t py-10 sm:py-14 px-4 sm:px-6",
        "border-amber-500/25 dark:border-amber-500/20",
        "bg-gradient-to-b from-amber-50/90 via-white to-slate-50",
        "dark:from-[#050A14] dark:via-[#0a1220] dark:to-[#050A14]",
        className,
      )}
    >
      <div className="max-w-6xl mx-auto min-w-0">
        {/* Feature row with vertical dividers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 rounded-xl border overflow-hidden shadow-sm dark:shadow-none border-amber-500/20 dark:border-amber-500/15 bg-white/90 dark:bg-[#0a1628]/60 backdrop-blur-sm">
          {DEPOSIT_WITHDRAW_FEATURE_CHIPS.map((text, i) => {
            const Icon = FEATURE_ICONS[i] ?? ShieldCheck;
            const accent = FEATURE_ACCENTS[i] ?? FEATURE_ACCENTS[0];
            const isLast = i === DEPOSIT_WITHDRAW_FEATURE_CHIPS.length - 1;
            return (
              <div
                key={text}
                className={cn(
                  "flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 sm:py-5 min-w-0",
                  !isLast && "lg:border-r border-amber-500/15 dark:border-amber-500/15",
                  i % 2 === 0 && i < 3 && "sm:border-r sm:border-amber-500/15 lg:border-r-0",
                  i === 1 && "lg:border-r lg:border-amber-500/15",
                  i === 2 && "sm:border-r-0 lg:border-r lg:border-amber-500/15",
                  i < 2 && "border-b sm:border-b-0 border-amber-500/10",
                  i >= 2 && "border-b lg:border-b-0 border-amber-500/10",
                )}
              >
                <div className={cn(
                  "shrink-0 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg border",
                  accent.iconBg,
                  accent.iconBorder,
                )}>
                  <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", accent.iconColor)} strokeWidth={2.25} />
                </div>
                <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-amber-100/95 leading-snug">
                  {text}
                </p>
              </div>
            );
          })}
        </div>

        {/* Gold CTA pill with stars */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <div className="hidden sm:flex items-center gap-1 text-amber-500 dark:text-amber-400/90">
            {[1, 2, 3].map(n => (
              <Star key={`l-${n}`} className="h-4 w-4 fill-amber-500 dark:fill-amber-400 text-amber-500 dark:text-amber-400" />
            ))}
          </div>

          <div className="w-full sm:w-auto rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-5 sm:px-8 py-3 sm:py-3.5 shadow-lg shadow-amber-500/25 dark:shadow-amber-500/20 border border-amber-300/60 dark:border-amber-300/40 text-center">
            <p className="text-[11px] sm:text-sm md:text-base font-extrabold uppercase tracking-wide text-slate-900 leading-snug">
              Invest today · Earn monthly · Grow your future
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-amber-500 dark:text-amber-400/90">
            {[1, 2, 3].map(n => (
              <Star key={`r-${n}`} className="h-4 w-4 fill-amber-500 dark:fill-amber-400 text-amber-500 dark:text-amber-400" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
