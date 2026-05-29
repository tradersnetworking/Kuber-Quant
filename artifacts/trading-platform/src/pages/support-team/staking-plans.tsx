import { Coins } from "lucide-react";
import { StakingPlansPanel } from "@/components/super-admin/StakingPlansPanel";
import { SupportReadOnlyBanner } from "@/components/support/SupportReadOnlyBanner";
import { STAFF_PAGE_STACK } from "@/lib/staff-dashboard-ui";

export default function SupportStakingPlansPage() {
  return (
    <div className={STAFF_PAGE_STACK}>
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Coins className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-600 dark:text-emerald-400 shrink-0" />
          Staking Plans
        </h1>
        <p className="page-subtitle">
          Platform staking catalog — APR/APY, lock periods, and deposit limits.
        </p>
      </div>
      <SupportReadOnlyBanner>
        Catalog view only. Support cannot create or modify staking plans.
      </SupportReadOnlyBanner>
      <StakingPlansPanel apiBase="/support-team" readOnly />
    </div>
  );
}
