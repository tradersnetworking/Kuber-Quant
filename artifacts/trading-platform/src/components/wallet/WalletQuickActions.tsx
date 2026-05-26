import { DepositDialog } from "./DepositDialog";
import { WithdrawToPersonalAccountDialog } from "./WithdrawToPersonalAccount";
import { Button } from "@/components/ui/button";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

type Props = {
  onSuccess?: () => void;
  depositClassName?: string;
  withdrawClassName?: string;
  layout?: "grid" | "row";
};

/** Deposit + withdraw-to-personal-account actions for dashboards and wallet pages */
export function WalletQuickActions({
  onSuccess,
  depositClassName = "bg-amber-500 hover:bg-amber-600 text-black",
  withdrawClassName = "bg-white/10 hover:bg-white/15 text-white",
  layout = "grid",
}: Props) {
  const containerClass = layout === "grid" ? "grid grid-cols-2 gap-2" : "flex gap-2";

  return (
    <div className={containerClass}>
      <DepositDialog
        onSuccess={onSuccess}
        trigger={
          <Button className={`w-full h-10 text-xs font-semibold ${depositClassName}`}>
            <ArrowDownLeft className="h-3.5 w-3.5 mr-1.5" /> Deposit
          </Button>
        }
      />
      <WithdrawToPersonalAccountDialog
        onSuccess={onSuccess}
        trigger={
          <Button className={`w-full h-10 text-xs font-semibold ${withdrawClassName}`}>
            <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" /> Withdraw
          </Button>
        }
      />
    </div>
  );
}
