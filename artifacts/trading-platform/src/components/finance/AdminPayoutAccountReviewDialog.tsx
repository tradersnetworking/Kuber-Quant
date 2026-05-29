import { useEffect, useState } from "react";
import { Loader2, CreditCard } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { staffFetch } from "@/lib/staff-api";
import { PayoutAccountDetailsCard } from "@/components/wallet/PayoutAccountDetailsCard";
import type { PaymentAccount } from "@/components/wallet/payout-account-types";

type PayoutReview = {
  transaction: {
    id: number;
    amount: number;
    currency: string;
    paymentMethod?: string | null;
    notes?: string | null;
    gatewayProvider?: string | null;
  };
  account: PaymentAccount;
  isMaturityPayout: boolean;
};

export function AdminPayoutAccountReviewDialog({
  transactionId,
  open,
  onOpenChange,
}: {
  transactionId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [data, setData] = useState<PayoutReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !transactionId) {
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    staffFetch<PayoutReview>(`/admin/transactions/${transactionId}/payout-account`)
      .then(setData)
      .catch(err => setError(err.message || "Failed to load payout account"))
      .finally(() => setLoading(false));
  }, [open, transactionId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-amber-600" />
            Withdrawal account details
          </DialogTitle>
          <DialogDescription>
            Account the investor selected for this payout. Verify before approving.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        {data && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {data.isMaturityPayout && (
                <Badge className="bg-violet-500/20 text-violet-700 dark:text-violet-300">Maturity payout</Badge>
              )}
              <Badge variant="outline" className="capitalize">{data.transaction.paymentMethod || data.account.accountType}</Badge>
            </div>
            <p className="text-sm">
              Amount: <strong>{data.transaction.amount.toLocaleString()} {data.transaction.currency}</strong>
            </p>
            {data.transaction.notes && (
              <p className="text-xs text-muted-foreground">{data.transaction.notes}</p>
            )}
            <PayoutAccountDetailsCard account={data.account} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
