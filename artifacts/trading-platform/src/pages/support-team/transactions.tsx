import { ArrowRightLeft } from "lucide-react";
import { FinanceLedgerPanel } from "@/components/super-admin/FinanceLedgerPanel";
import { SupportReadOnlyBanner } from "@/components/support/SupportReadOnlyBanner";
import { STAFF_PAGE_STACK } from "@/lib/staff-dashboard-ui";

export default function SupportTransactionsPage() {
  return (
    <div className={STAFF_PAGE_STACK}>
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
          <ArrowRightLeft className="h-6 w-6 sm:h-7 sm:w-7 text-orange-600 dark:text-orange-400 shrink-0" />
          Finance Ledger
        </h1>
        <p className="page-subtitle">
          Read-only deposit, withdrawal, and immutable ledger history with calendar filters.
        </p>
      </div>
      <SupportReadOnlyBanner>
        View-only finance data for support investigations. No edits or approvals can be triggered from this portal.
      </SupportReadOnlyBanner>
      <FinanceLedgerPanel apiBase="/support-team" readOnly />
    </div>
  );
}
