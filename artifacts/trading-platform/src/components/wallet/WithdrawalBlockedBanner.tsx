import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useWithdrawalBlock } from "@/hooks/use-withdrawal-block";

export function WithdrawalBlockedBanner() {
  const { blocked, message } = useWithdrawalBlock();
  if (!blocked) return null;

  return (
    <Alert variant="destructive" className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100 min-w-0 max-w-full overflow-hidden">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <AlertTitle className="text-sm sm:text-base">Withdrawals disabled</AlertTitle>
      <AlertDescription className="text-wrap-safe text-xs sm:text-sm">{message}</AlertDescription>
    </Alert>
  );
}
