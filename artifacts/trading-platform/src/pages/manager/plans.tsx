import { TrendingUp } from "lucide-react";
import { InvestmentPlansPanel } from "@/components/super-admin/InvestmentPlansPanel";
import { STAFF_PAGE_STACK } from "@/lib/staff-dashboard-ui";

export default function ManagerPlansPage() {
  return (
    <div className={STAFF_PAGE_STACK}>
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 text-yellow-600 dark:text-yellow-400 shrink-0" />
          Investment Plans
        </h1>
        <p className="page-subtitle">
          Platform investment plan catalog for client guidance (read-only).
        </p>
      </div>
      <InvestmentPlansPanel apiBase="/manager" readOnly />
    </div>
  );
}
