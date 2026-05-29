import { BrandLogo } from "@/components/brand/BrandLogo";
import { BrandTitle } from "@/components/brand/BrandTitle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Construction, Mail, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import type { MaintenanceConfig } from "@/hooks/use-maintenance-mode";

type MaintenancePageProps = {
  config: MaintenanceConfig;
  onRefresh?: () => void;
};

export function MaintenancePage({ config, onRefresh }: MaintenancePageProps) {
  const { branding, description, notice, supportEmail } = config;

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background text-foreground px-4 py-8 overflow-x-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08)_0,transparent_65%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg text-center space-y-6">
        <div className="flex flex-col items-center gap-4">
          <BrandLogo
            className="h-16 lg:h-24 xl:h-28 w-auto max-w-[120px] lg:max-w-[180px] xl:max-w-[220px] object-contain"
            logoUrl={branding.logoUrl}
            alt={branding.siteName}
          />
          <BrandTitle
            size="xl"
            branding={{
              titleGold: branding.titleGold,
              titleSilver: branding.titleSilver,
              titleGoldColor: branding.titleGoldColor,
              titleSilverColor: branding.titleSilverColor,
            }}
          />
        </div>

        <Card className="border-amber-500/30 bg-card/90 backdrop-blur-md shadow-xl">
          <CardContent className="pt-6 pb-6 space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15">
              <Construction className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-lg sm:text-xl font-bold text-foreground">Under Maintenance</h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                {description}
              </p>
            </div>
            {notice?.trim() && (
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300 mb-1">
                  Notice
                </p>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
                  {notice}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          {onRefresh && (
            <Button variant="outline" className="w-full sm:w-auto" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Check again
            </Button>
          )}
          {supportEmail && (
            <Button variant="ghost" className="w-full sm:w-auto text-muted-foreground" asChild>
              <a href={`mailto:${supportEmail}`}>
                <Mail className="h-4 w-4 mr-2" />
                Contact support
              </a>
            </Button>
          )}
          <Button variant="ghost" className="w-full sm:w-auto text-muted-foreground" asChild>
            <Link href="/staff-login">Staff login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
