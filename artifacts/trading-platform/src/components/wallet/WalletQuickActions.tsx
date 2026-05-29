import { useTranslation } from "react-i18next";

import { DepositDialog } from "./DepositDialog";
import { WithdrawToPersonalAccountDialog } from "./WithdrawToPersonalAccount";
import { SafeBoundary } from "@/components/SafeBoundary";
import { Button } from "@/components/ui/button";
import { DEPOSIT_BUTTON_CLASS, WITHDRAW_BUTTON_CLASS } from "@/lib/wallet-action-styles";
import {
  WALLET_ACTION_LABEL,
  WALLET_ACTIONS_GRID,
  WALLET_ACTIONS_ROW,
  WALLET_ACTION_BTN,
  WALLET_ACTION_BTN_COMPACT,
  WALLET_ACTIONS_INLINE,
} from "@/lib/quick-action-styles";
import { cn } from "@/lib/utils";

type Props = {
  onSuccess?: () => void;
  depositClassName?: string;
  withdrawClassName?: string;
  layout?: "grid" | "row" | "inline";
  compact?: boolean;
};

/** Deposit + withdraw-to-personal-account actions for dashboards and wallet pages */
export function WalletQuickActions({
  onSuccess,
  depositClassName = DEPOSIT_BUTTON_CLASS,
  withdrawClassName = WITHDRAW_BUTTON_CLASS,
  layout = "grid",
  compact = false,
}: Props) {
  const { t } = useTranslation();
  const containerClass = layout === "inline"
    ? WALLET_ACTIONS_INLINE
    : layout === "grid"
      ? WALLET_ACTIONS_GRID
      : WALLET_ACTIONS_ROW;
  const buttonClass = compact ? WALLET_ACTION_BTN_COMPACT : WALLET_ACTION_BTN;

  return (
    <div className={containerClass}>
      <SafeBoundary label={t("wallet.depositUnavailable")}>
        <DepositDialog
          onSuccess={onSuccess}
          trigger={
            <Button size={compact ? "sm" : "default"} className={cn(buttonClass, depositClassName)}>
              <span className={WALLET_ACTION_LABEL}>{t("wallet.deposit")}</span>
            </Button>
          }
        />
      </SafeBoundary>
      <SafeBoundary label={t("wallet.withdrawUnavailable")}>
        <WithdrawToPersonalAccountDialog
          onSuccess={onSuccess}
          trigger={
            <Button size={compact ? "sm" : "default"} className={cn(buttonClass, withdrawClassName)}>
              <span className={WALLET_ACTION_LABEL}>{t("wallet.withdraw")}</span>
            </Button>
          }
        />
      </SafeBoundary>
    </div>
  );
}
