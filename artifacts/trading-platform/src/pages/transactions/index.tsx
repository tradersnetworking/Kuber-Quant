import { WalletHistoryPanel } from "@/components/wallet/WalletHistoryPanel";
import { WalletQuickActions } from "@/components/wallet/WalletQuickActions";
import { InvestorUpcomingTransactionsSection } from "@/components/transactions/UpcomingTransactionsPanel";
import { AppPage } from "@/components/layout/AppPage";
import { useTranslation } from "react-i18next";
import { APP_HEADER_ROW, APP_PAGE_STACK } from "@/lib/ui-system";
import { cn } from "@/lib/utils";

export default function TransactionsPage() {
  const { t } = useTranslation();

  return (
    <AppPage
      stackClassName={APP_PAGE_STACK}
      title={
        <h1 className="page-title bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
          {t("transactions.title")}
        </h1>
      }
      subtitle={t("transactions.subtitle")}
      actions={
        <div className={cn(APP_HEADER_ROW, "w-full md:w-auto")}>
          <WalletQuickActions layout="row" />
        </div>
      }
    >
      <InvestorUpcomingTransactionsSection />
      <WalletHistoryPanel />
    </AppPage>
  );
}
