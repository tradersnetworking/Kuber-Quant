import { ReactNode } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronRight, Moon, Sun } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
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
  title, subtitle, steps, currentStep, totalSteps, children, footer,
  loginHref = "/login", alternateHref, lastSaved, saving,
}: Props) {
  const { theme, toggle } = useTheme();
  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <aside className="hidden md:flex md:w-[36%] flex-col border-r border-border bg-card/50 p-10 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="relative z-10 w-full max-w-xs mx-auto">
          <div className="flex items-center justify-between mb-6">
            <BrandLogo className="h-16 w-16" />
            <Button type="button" variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
          <h1 className="text-2xl font-black mb-1">Kuber <span className="text-primary">Quant</span></h1>
          <p className="text-muted-foreground text-xs uppercase tracking-widest mb-8">{title}</p>
          <div className="space-y-2">
            {steps.map(s => {
              const done = currentStep > s.num;
              const active = currentStep === s.num;
              return (
                <div key={s.num} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${active ? "bg-primary/10 border-primary/30" : done ? "bg-green-500/5 border-green-500/20" : "border-border/60 bg-muted/20"}`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${active ? "bg-primary text-primary-foreground" : done ? "bg-green-500/20 text-green-600 border border-green-500/30" : "bg-muted text-muted-foreground"}`}>
                    {done ? <CheckCircle2 className="h-4 w-4" /> : s.num}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold ${active ? "text-primary" : done ? "text-green-600" : "text-muted-foreground"}`}>Step {s.num}</p>
                    <p className={`text-sm font-bold truncate ${active ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</p>
                  </div>
                  {active && <ChevronRight className="h-4 w-4 text-primary ml-auto shrink-0" />}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-8">
            Already registered? <Link href={loginHref} className="text-primary hover:underline">Sign In</Link>
          </p>
          {alternateHref && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              <Link href={alternateHref.href} className="text-primary hover:underline">{alternateHref.label}</Link>
            </p>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen">
        <div className="h-1 bg-muted sticky top-0 z-10">
          <motion.div className="h-full bg-primary" animate={{ width: `${progress}%` }} transition={{ duration: 0.35 }} />
        </div>
        <div className="flex items-center justify-between px-4 py-3 md:hidden border-b border-border">
          <BrandLogo className="h-8 w-8" />
          <div className="flex gap-1">
            {steps.map(s => (
              <div key={s.num} className={`h-1.5 rounded-full transition-all ${s.num <= currentStep ? "bg-primary w-6" : "bg-muted w-3"}`} />
            ))}
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={toggle}><Sun className="h-4 w-4" /></Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-2xl mx-auto">
            <Badge variant="outline" className="mb-3 text-xs">Step {currentStep} of {totalSteps}</Badge>
            <h2 className="text-2xl font-bold">{subtitle}</h2>
            {(saving || lastSaved) && (
              <p className="text-xs text-muted-foreground mt-1">
                {saving ? "Saving draft…" : `Draft saved ${lastSaved?.toLocaleTimeString()}`}
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
