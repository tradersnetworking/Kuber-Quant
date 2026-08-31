import { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { BrandLogo } from "@/components/brand/BrandLogo";

type Step = { num: number; label: string };

type Props = {
  title: string;
  subtitle: string;
  steps: Step[];
  currentStep: number;
  totalSteps: number;
  children: ReactNode;
  footer?: ReactNode;
  loginHref?: string;
  alternateHref?: { href: string; label: string };
  lastSaved?: Date | null;
  saving?: boolean;
};

export function WizardShell({
  title,
  subtitle,
  steps,
  currentStep,
  totalSteps,
  children,
  footer,
  loginHref = "/login",
  alternateHref,
  lastSaved,
  saving,
}: Props) {
  const { t } = useTranslation();
  const progress = ((currentStep - 1) / Math.max(totalSteps - 1, 1)) * 100;

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background text-foreground flex flex-col md:flex-row overflow-x-hidden max-w-full">
      <aside className="hidden md:flex md:w-[36%] flex-col border-r border-border bg-card/50 p-10 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="relative z-10 w-full max-w-xs mx-auto">
          <div className="flex items-center justify-between mb-4">
            <BrandLogo className="h-20 w-auto max-w-[220px]" />
            <div className="flex items-center gap-2">
              <LanguageSelector compact />
              <ThemeToggle className="bg-card/60 border border-border/60" />
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("landing.backToHome", { defaultValue: "Back to Home" })}
          </Link>
          <h1 className="text-2xl font-black mb-1 sr-only">Kuber Quant</h1>
          <p className="text-muted-foreground text-xs uppercase tracking-widest mb-8">{title}</p>
          <div className="space-y-2">
            {steps.map((s) => {
              const done = currentStep > s.num;
              const active = currentStep === s.num;
              return (
                <div
                  key={s.num}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    active
                      ? "bg-primary/10 border-primary/30"
                      : done
                        ? "bg-green-500/5 border-green-500/20"
                        : "border-border/60 bg-muted/20"
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : done
                          ? "bg-green-500/20 text-green-600 border border-green-500/30"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : s.num}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-semibold ${
                        active ? "text-primary" : done ? "text-green-600" : "text-muted-foreground"
                      }`}
                    >
                      Step {s.num}
                    </p>
                    <p
                      className={`text-sm font-bold truncate ${
                        active ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {s.label}
                    </p>
                  </div>
                  {active && <ChevronRight className="h-4 w-4 text-primary ml-auto shrink-0" />}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-8">
            Already registered?{" "}
            <Link href={loginHref} className="text-primary hover:underline">
              Sign In
            </Link>
          </p>
          {alternateHref && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              <Link href={alternateHref.href} className="text-primary hover:underline">
                {alternateHref.label}
              </Link>
            </p>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen min-h-[100dvh] min-w-0 max-w-full overflow-x-hidden">
        <div className="h-1 bg-muted sticky top-0 z-10 shrink-0">
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.35 }}
          />
        </div>
        <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-3 md:hidden border-b border-border shrink-0 min-w-0">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary shrink-0"
            aria-label={t("landing.backToHome", { defaultValue: "Back to Home" })}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden xs:inline">
              {t("landing.backToHome", { defaultValue: "Home" })}
            </span>
          </Link>
          <div className="flex-1 min-w-0 px-2 text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </p>
            <p className="text-xs font-semibold truncate">
              {steps[currentStep - 1]?.label ?? subtitle}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <LanguageSelector brandBar />
            <ThemeToggle className="bg-card/60 border border-border/60" />
          </div>
        </div>

        <div className="md:hidden px-3 sm:px-4 pb-2 shrink-0 min-w-0 overflow-x-auto touch-pan-x">
          <div className="flex gap-1.5 min-w-max">
            {steps.map((s) => {
              const done = currentStep > s.num;
              const active = currentStep === s.num;
              return (
                <div
                  key={s.num}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold whitespace-nowrap ${
                    active
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : done
                        ? "bg-green-500/10 border-green-500/20 text-green-600"
                        : "border-border/60 text-muted-foreground"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                  ) : (
                    <span className="tabular-nums">{s.num}</span>
                  )}
                  <span className="max-w-[8rem] truncate">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-10 min-w-0 overscroll-contain">
          <div className="max-w-2xl mx-auto min-w-0 w-full">
            <Badge variant="outline" className="mb-3 text-xs hidden md:inline-flex">
              Step {currentStep} of {totalSteps}
            </Badge>
            <h2 className="text-xl sm:text-2xl font-bold break-words">{subtitle}</h2>
            {lastSaved && !saving && (
              <p className="text-xs text-muted-foreground mt-1" aria-live="polite">
                Draft saved {lastSaved.toLocaleTimeString()}
              </p>
            )}
            <div className="mt-6">{children}</div>
            {footer}
          </div>
        </div>
      </main>
    </div>
  );
}
