import { Users } from "lucide-react";
import { CopyTradersPanel } from "@/components/super-admin/CopyTradersPanel";
import { STAFF_PAGE_STACK } from "@/lib/staff-dashboard-ui";

export default function ManagerCopyTradingPage() {
  return (
    <div className={STAFF_PAGE_STACK}>
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 sm:h-7 sm:w-7 text-cyan-600 dark:text-cyan-400 shrink-0" />
          Copy Trading
        </h1>
        <p className="page-subtitle">
          Master trader catalog for client guidance (read-only).
        </p>
      </div>
      <CopyTradersPanel apiBase="/manager" readOnly />
    </div>
  );
}
