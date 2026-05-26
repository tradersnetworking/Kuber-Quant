import { WalletHistoryPanel } from "@/components/wallet/WalletHistoryPanel";
import { WalletQuickActions } from "@/components/wallet/WalletQuickActions";

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
              Transactions
            </h1>
            <p className="text-muted-foreground">
              Deposit and withdrawal requests, plus the immutable wallet ledger showing every balance change.
            </p>
          </div>
          <div className="w-full md:w-64">
            <WalletQuickActions layout="row" />
          </div>
        </div>

        <WalletHistoryPanel />
      </div>
);
}
