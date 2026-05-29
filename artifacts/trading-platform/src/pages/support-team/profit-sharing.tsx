import { LineChart } from "lucide-react";

import { MtLinkedAccountsWorkspacePanel } from "@/components/super-admin/MtLinkedAccountsWorkspacePanel";

import { SupportReadOnlyBanner } from "@/components/support/SupportReadOnlyBanner";

import { STAFF_PAGE_STACK } from "@/lib/staff-dashboard-ui";



export default function SupportProfitSharingPage() {

  return (

    <div className={STAFF_PAGE_STACK}>

      <div>

        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">

          <LineChart className="h-6 w-6 sm:h-7 sm:w-7 text-violet-600 dark:text-violet-400 shrink-0" />

          Profit Sharing &amp; MT Accounts

        </h1>

        <p className="page-subtitle">

          Linked MT4/MT5 accounts, profit-sharing requests, and copy-trading setup for users and managers.

        </p>

      </div>

      <SupportReadOnlyBanner>

        Read-only view of MT credentials and profit-sharing requests. Support cannot approve, forward, or modify accounts.

      </SupportReadOnlyBanner>

      <MtLinkedAccountsWorkspacePanel

        apiBase="/support-team"

        defaultTab="requests"

        showFormConfig={false}

        readOnly

      />

    </div>

  );

}


