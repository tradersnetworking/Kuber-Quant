import { Cpu } from "lucide-react";
import { EAStrategiesPanel } from "@/components/super-admin/EAStrategiesPanel";
import { SupportReadOnlyBanner } from "@/components/support/SupportReadOnlyBanner";
import { STAFF_PAGE_STACK } from "@/lib/staff-dashboard-ui";

export default function SupportEaStrategiesPage() {
  return (
    <div className={STAFF_PAGE_STACK}>
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Cpu className="h-6 w-6 sm:h-7 sm:w-7 text-purple-600 dark:text-purple-400 shrink-0" />
          EA Strategies
        </h1>
        <p className="page-subtitle">
          Expert Advisor strategy catalog — performance and pricing.
        </p>
      </div>
      <SupportReadOnlyBanner>
        Catalog view only. Support cannot create or modify EA strategies.
      </SupportReadOnlyBanner>
      <EAStrategiesPanel apiBase="/support-team" readOnly />
    </div>
  );
}
