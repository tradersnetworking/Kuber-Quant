import { ArrowDownUp } from "lucide-react";

import { ExchangeControlPanel } from "@/components/super-admin/ExchangeControlPanel";

import { SupportReadOnlyBanner } from "@/components/support/SupportReadOnlyBanner";

import { STAFF_PAGE_STACK } from "@/lib/staff-dashboard-ui";



export default function SupportExchangePage() {

  return (

    <div className={STAFF_PAGE_STACK}>

      <div>

        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">

          <ArrowDownUp className="h-6 w-6 sm:h-7 sm:w-7 text-amber-600 dark:text-amber-400 shrink-0" />

          Crypto Exchange

        </h1>

        <p className="page-subtitle">

          Crypto buy and sell orders — amounts, payment proofs, and order status for investors.

        </p>

      </div>

      <SupportReadOnlyBanner>

        View crypto exchange orders only. Support cannot complete, reject, or change exchange rates.

      </SupportReadOnlyBanner>

      <ExchangeControlPanel apiBase="/support-team" readOnly />

    </div>

  );

}


