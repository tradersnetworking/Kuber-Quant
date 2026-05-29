import { Link } from "wouter";
import { AppPage } from "@/components/layout/AppPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, TrendingUp, Shield, Sparkles } from "lucide-react";

export default function EarnHubPage() {
  return (
    <AppPage title="Earn" subtitle="Grow your portfolio with staking and fixed-yield products.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="earn-card-emerald border-emerald-500/25 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950/40 dark:via-card dark:to-teal-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <Coins className="h-5 w-5" /> Crypto Staking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Flexible and fixed lock staking with daily rewards, compound options, and VIP tiers.
            </p>
            <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              <Link href="/earn/staking">Open Staking</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="earn-card-amber border-amber-500/25 bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-amber-950/30 dark:via-card dark:to-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <TrendingUp className="h-5 w-5" /> Investment Plans
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Traditional ROI investment plans with maturity payout options.</p>
            <Button asChild variant="outline" className="w-full border-amber-500/40 text-amber-800 dark:text-amber-300">
              <Link href="/plans">View Plans</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="earn-card-violet border-violet-500/25 bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-violet-950/30 dark:via-card dark:to-indigo-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-violet-800 dark:text-violet-300">
              <Sparkles className="h-5 w-5" /> Referral Earn
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Invite investors and earn commission on deposits and ROI.</p>
            <Button asChild variant="outline" className="w-full border-violet-500/40 text-violet-800 dark:text-violet-300">
              <Link href="/referral">Referral Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-sky-500/20 bg-gradient-to-r from-sky-50/80 via-background to-cyan-50/80 dark:from-sky-950/20 dark:via-card dark:to-cyan-950/20">
        <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 text-sky-600 dark:text-sky-400" />
            <div>
              <p className="font-semibold text-foreground">Risk disclosure</p>
              <p className="text-sm text-muted-foreground">
                Returns are estimated and may vary. Staking involves market and platform risk. KYC is mandatory.
              </p>
            </div>
          </div>
          <Button asChild variant="link" className="text-sky-700 dark:text-sky-400">
            <Link href="/agreements">Read agreements</Link>
          </Button>
        </CardContent>
      </Card>
    </AppPage>
  );
}
