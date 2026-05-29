import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { ProfitShareDialog } from "@/components/profit/ProfitShareDialog";
import type { ProfitSharePayload } from "@/lib/profit-share";
import { cn } from "@/lib/utils";

type Props = {
  payload: Omit<ProfitSharePayload, "userName" | "referralCode"> & {
    userName?: string;
    referralCode?: string;
    profitPercent?: number;
    avatarUrl?: string | null;
  };
  userName: string;
  referralCode?: string;
  avatarUrl?: string | null;
  className?: string;
  size?: "sm" | "default";
  label?: string;
};

export function ProfitShareButton({
  payload,
  userName,
  referralCode,
  avatarUrl,
  className,
  size = "sm",
  label = "Share",
}: Props) {
  const [open, setOpen] = useState(false);
  const disabled = !payload.profitAmount || payload.profitAmount <= 0;
  const isWithdrawal = payload.service === "withdrawal";

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={disabled}
        className={cn(
          "shrink-0",
          isWithdrawal
            ? "border-red-500/30 text-red-500 hover:bg-red-500/10"
            : "border-green-500/30 text-green-700 dark:text-green-400 hover:bg-green-500/10",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        <Share2 className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </Button>
      <ProfitShareDialog
        open={open}
        onOpenChange={setOpen}
        payload={{
          ...payload,
          userName,
          referralCode,
          avatarUrl: avatarUrl ?? payload.avatarUrl,
        }}
      />
    </>
  );
}
