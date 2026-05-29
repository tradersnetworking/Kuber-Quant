import { CredentialRow } from "@/components/wallet/CredentialRow";
import {
  resolveDepositQrSrc,
  resolvePayoutQrSrc,
} from "@/components/wallet/deposit-account-utils";
import { QrImage } from "@/components/wallet/QrImage";import { formatCryptoLabel } from "@/components/wallet/crypto-networks";
import { CryptoAssetIcon } from "@/components/wallet/CryptoAssetIcon";
import type { PaymentAccount } from "@/components/wallet/payout-account-types";
import { Building2, Smartphone, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  account: PaymentAccount;
  compact?: boolean;
  className?: string;
};

export function PayoutAccountDetailsCard({ account, compact, className }: Props) {
  if (account.accountType === "upi") {
    const qrSrc = resolvePayoutQrSrc({
      accountType: "upi",
      label: account.label,
      upiId: account.upiId,
      upiQrUrl: account.upiQrUrl,
    });
    const fallbackSrc = account.upiId
      ? resolvePayoutQrSrc({ accountType: "upi", label: account.label, upiId: account.upiId })
      : undefined;
    return (
      <div className={cn("rounded-xl border border-border dark:border-white/10 bg-muted dark:bg-black/25 p-4 space-y-3", className)}>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Smartphone className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          {account.label}
        </div>
        {qrSrc && !compact && (
          <QrImage src={qrSrc} fallbackSrc={fallbackSrc} alt="UPI QR" className="mx-auto max-h-40 rounded-lg border border-border dark:border-white/10 bg-white p-1" />
        )}
        {account.upiId && <CredentialRow label="UPI ID" value={account.upiId} mono />}
      </div>
    );
  }

  if (account.accountType === "bank") {
    return (
      <div className={cn("rounded-xl border border-border dark:border-white/10 bg-muted dark:bg-black/25 p-4 space-y-0", className)}>
        <div className="flex items-center gap-2 text-sm font-medium mb-2">
          <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          {account.label}
        </div>
        {!compact && (
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">IMPS · NEFT · RTGS</p>
        )}
        <CredentialRow label="Account holder" value={account.accountHolderName} />
        <CredentialRow label="Bank" value={account.bankName} copyable={false} />
        <CredentialRow label="Account no." value={account.accountNumber} mono />
        <CredentialRow label="IFSC" value={account.ifscCode} mono />
        {account.branchName && <CredentialRow label="Branch" value={account.branchName} copyable={false} />}
      </div>
    );
  }

  const qrSrc = resolvePayoutQrSrc({
    accountType: "crypto",
    label: account.label,
    walletAddress: account.walletAddress,
    walletQrUrl: account.walletQrUrl,
  });
  const fallbackSrc = account.walletAddress
    ? resolvePayoutQrSrc({ accountType: "crypto", walletAddress: account.walletAddress })
    : undefined;

  return (
    <div className={cn("rounded-xl border border-border dark:border-white/10 bg-muted dark:bg-black/25 p-4 space-y-3", className)}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <CryptoAssetIcon symbol={account.cryptoSymbol} network={account.cryptoNetwork} size="sm" />
        <Wallet className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        {account.label}
      </div>
      <p className="text-xs text-muted-foreground">
        {formatCryptoLabel(account.cryptoSymbol, account.cryptoNetwork)}
      </p>
      {qrSrc && !compact && (
        <QrImage src={qrSrc} fallbackSrc={fallbackSrc} alt="Wallet QR" className="mx-auto max-h-40 rounded-lg border border-border dark:border-white/10 bg-white p-1" />
      )}
      {account.walletAddress && <CredentialRow label="Wallet address" value={account.walletAddress} mono />}
    </div>
  );
}
