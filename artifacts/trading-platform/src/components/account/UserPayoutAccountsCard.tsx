import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { staffFetch } from "@/lib/staff-api";
import { CreditCard } from "lucide-react";

type PayoutAccount = {
  id: number;
  label: string;
  accountType: string;
  accountHolderName?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  upiId?: string | null;
  cryptoSymbol?: string | null;
  cryptoNetwork?: string | null;
  walletAddress?: string | null;
  isDefault: boolean;
};

export function UserPayoutAccountsCard({ userId }: { userId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/users", userId, "payment-accounts"],
    queryFn: () => staffFetch<PayoutAccount[]>(`/admin/users/${userId}/payment-accounts`),
    enabled: userId > 0,
  });

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-amber-400" /> Payout Accounts
        </CardTitle>
        <CardDescription>Personal bank, UPI, and crypto accounts registered for withdrawals</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No payout accounts on file.</p>
        ) : (
          <div className="space-y-3">
            {data.map(a => (
              <div key={a.id} className="p-3 rounded-lg border border-white/10 bg-white/5">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-medium text-sm">{a.label}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">{a.accountType}</Badge>
                  {a.isDefault && <Badge className="text-[10px] bg-amber-500/20 text-amber-400">Default</Badge>}
                </div>
                {a.accountType === "bank" && (
                  <p className="text-xs text-muted-foreground">
                    {a.bankName} · {a.accountHolderName} · {a.accountNumber} · IFSC {a.ifscCode || "—"}
                  </p>
                )}
                {a.accountType === "upi" && <p className="text-xs text-muted-foreground">UPI: {a.upiId}</p>}
                {a.accountType === "crypto" && (
                  <p className="text-xs text-muted-foreground break-all">
                    {a.cryptoSymbol} ({a.cryptoNetwork}): {a.walletAddress}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
