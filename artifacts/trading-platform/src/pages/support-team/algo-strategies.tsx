import { Cpu } from "lucide-react";
import { AlgoStrategiesManagementPanel } from "@/components/super-admin/AlgoStrategiesManagementPanel";
import { SupportReadOnlyBanner } from "@/components/support/SupportReadOnlyBanner";
import { STAFF_PAGE_STACK } from "@/lib/staff-dashboard-ui";

export default function SupportAlgoStrategiesPage() {
  return (
    <div className={STAFF_PAGE_STACK}>
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Cpu className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-600 dark:text-indigo-400 shrink-0" />
          Algo Strategies
        </h1>
        <p className="page-subtitle">
          Algorithmic strategy catalog — ROI, risk, and pricing.
        </p>
      </div>
      <SupportReadOnlyBanner>
        Catalog view only. Support cannot create or modify algo strategies.
      </SupportReadOnlyBanner>
      <AlgoStrategiesManagementPanel apiBase="/support-team" readOnly />
    </div>
  );
}
