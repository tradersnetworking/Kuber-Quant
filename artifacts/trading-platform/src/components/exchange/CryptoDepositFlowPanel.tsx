import { CredentialRow } from "@/components/wallet/CredentialRow";
import {
  enrichDepositAccount,
  resolveDepositQrSrc,
  type DepositAccount,
} from "@/components/wallet/deposit-account-utils";
import { QrImage } from "@/components/wallet/QrImage";
import { findCryptoDepositAccount } from "@/components/wallet/crypto-networks";
import { exchangeChainDisplay, chainLabel } from "@/lib/exchange-display";
import { CryptoIcon } from "@/components/exchange/CryptoIcon";
import { AlertTriangle, Wallet } from "lucide-react";

type Props = {
  symbol: string;
  network: string;
  label: string;
  cryptoAccounts?: DepositAccount[];
  /** Exchange-synced platform wallet (preferred over deposit account list). */
  exchangeWallet?: {
    walletAddress?: string | null;
    qrCodeUrl?: string | null;
    gatewayId?: number;
  };
};

export function CryptoDepositFlowPanel({ symbol, network, label, cryptoAccounts = [], exchangeWallet }: Props) {
  const enriched = cryptoAccounts.map(enrichDepositAccount);
  const account = findCryptoDepositAccount(enriched, {
    key: `${symbol}-${network}`,
    label,
    symbol,
    network,
    gatewayId: exchangeWallet?.gatewayId,
  });

  const walletAddress = exchangeWallet?.walletAddress?.trim()
    || account?.walletAddress?.trim()
    || null;
  const qrCodeUrl = exchangeWallet?.qrCodeUrl
    || account?.qrCodeUrl
    || null;

  return (
    <div className="space-y-4 min-w-0 overflow-x-clip">
      <div className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent p-4">
        <div className="flex items-center gap-3">
          <CryptoIcon symbol={symbol} size="lg" />
          <div>
            <p className="text-sm font-medium text-amber-200/90">Deposit crypto to sell</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Send {symbol.toUpperCase()} on {exchangeChainDisplay(symbol, network)} to our wallet below.
            </p>
          </div>
        </div>
      </div>

      {walletAddress ? (
        <div className="rounded-xl border border-amber-500/20 bg-muted dark:bg-black/25 p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Wallet className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            {label}
          </div>
          <div className="flex justify-center">
            <QrImage
              src={resolveDepositQrSrc({ qrCodeUrl, walletAddress })}
              fallbackSrc={walletAddress ? resolveDepositQrSrc({ walletAddress }) : undefined}
              alt="Wallet QR code"
              className="max-h-48 rounded-xl border border-border dark:border-white/10 shadow-lg bg-white p-2"
            />
          </div>
          <CredentialRow label="Coin" value={`${symbol.toUpperCase()} (${network})`} copyable={false} />
          <CredentialRow label="Network" value={chainLabel(network)} copyable={false} />
          <CredentialRow label="Wallet address" value={walletAddress} mono />
          {account?.note && (
            <p className="text-xs text-muted-foreground italic border-t border-border dark:border-white/10 pt-3">{account.note}</p>
          )}
          <p className="text-[11px] text-amber-400/80 bg-amber-500/5 rounded-lg px-3 py-2">
            Only send {symbol.toUpperCase()} on the {exchangeChainDisplay(symbol, network)} network. Wrong network may result in lost funds.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-700 dark:text-amber-300">Wallet not configured</p>
            <p className="text-muted-foreground text-xs mt-1">
              Deposit wallet for {label} is not set up yet. Please contact support.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
