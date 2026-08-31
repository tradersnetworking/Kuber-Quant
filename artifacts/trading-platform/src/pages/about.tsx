import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Award,
  Building2,
  FileCheck2,
  Handshake,
  Shield,
} from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCompanyAbout, type AboutCategory } from "@/hooks/use-company-about";
import { useSiteBranding } from "@/hooks/use-site-branding";
import { cn } from "@/lib/utils";

const THEMES: Record<
  AboutCategory,
  { icon: typeof Building2; color: string }
> = {
  registration: { icon: Building2, color: "from-amber-500 to-yellow-500" },
  affiliation: { icon: Handshake, color: "from-emerald-500 to-teal-500" },
  partner: { icon: Handshake, color: "from-blue-500 to-cyan-500" },
  recognition: { icon: Award, color: "from-purple-500 to-violet-500" },
  license: { icon: FileCheck2, color: "from-rose-500 to-orange-500" },
};

export default function AboutPage() {
  const { t } = useTranslation();
  const branding = useSiteBranding();
  const about = useCompanyAbout();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <nav className="sticky top-0 z-50 border-b border-border dark:border-white/10 bg-background/95 backdrop-blur-md pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 min-w-0">
          <BrandMark href="/" titleSize="md" className="shrink-0 min-w-0" branding={branding} />
          <div className="flex items-center gap-2 shrink-0">
            <LanguageSelector compact />
            <ThemeToggle />
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span>{t("landing.backToHome", { defaultValue: "Back to Home" })}</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="border-b border-border dark:border-white/10 bg-gradient-to-b from-amber-500/5 to-transparent">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wider">
              {t("landing.about")}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 break-words">
            {about.sectionTitle}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-3xl">
            {about.intro}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 min-w-0 pb-[max(2rem,env(safe-area-inset-bottom))]">
        {about.items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {about.items.map((item) => {
              const theme = THEMES[item.category];
              const Icon = theme.icon;
              return (
                <Card
                  key={item.id}
                  className="bg-card border-border overflow-hidden h-full"
                >
                  <div className={cn("h-1 w-full bg-gradient-to-r", theme.color)} />
                  <CardContent className="p-5 space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <Badge variant="outline" className="mb-2 text-[10px]">
                          {about.categoryLabels[item.category]}
                        </Badge>
                        <h2 className="font-semibold text-sm sm:text-base">{item.title}</h2>
                        {(item.subtitle || item.description) && (
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                            {item.description || item.subtitle}
                          </p>
                        )}
                        {item.issuedBy && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {item.issuedBy}
                            {item.referenceNumber ? ` · ${item.referenceNumber}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="mb-10 border-border">
            <CardContent className="p-6 sm:p-8 space-y-4">
              <h2 className="text-lg font-semibold">
                {t("landing.aboutMission", { defaultValue: "Our Mission" })}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{about.intro}</p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t("landing.aboutBody", {
                  defaultValue:
                    "We deliver algorithmic trading, copy trading, EA strategies, staking, and investment plans through a secure onboarding and wallet experience built for serious investors.",
                })}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-3">
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold text-sm px-5 py-2.5"
          >
            {t("landing.getStarted")}
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted/60"
          >
            {t("landing.backToHome", { defaultValue: "Back to Home" })}
          </Link>
        </div>

        <p className="mt-10 text-xs text-muted-foreground">{about.footerDescription}</p>
      </div>
    </div>
  );
}
