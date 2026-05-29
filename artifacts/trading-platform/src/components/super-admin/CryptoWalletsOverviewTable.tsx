import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import { CryptoAssetIcon } from "@/components/wallet/CryptoAssetIcon";
import { formatCryptoAssetLabel } from "@/components/wallet/crypto-asset-catalog";
import { enrichDepositAccount, type DepositAccount } from "@/components/wallet/deposit-account-utils";
import { Edit2, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

function truncateAddress(addr?: string | null, head = 10, tail = 8) {
  if (!addr) return "—";
  if (addr.length <= head + tail + 3) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function CryptoWalletsOverviewTable({
  gateways,
  onEdit,
  onDelete,
  onToggle,
}: {
  gateways: DepositAccount[];
  onEdit: (gw: DepositAccount) => void;
  onDelete: (id: number) => void;
  onToggle: (gw: DepositAccount, enabled: boolean) => void;
}) {
  const crypto = gateways.filter(g => g.type === "crypto").map(enrichDepositAccount);

  if (crypto.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.02] p-8 text-center text-sm text-muted-foreground">
        No cryptocurrency wallets configured yet. Add wallets below — they appear in Exchange rates and user Buy/Sell.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border dark:border-white/10 overflow-hidden bg-muted/80 dark:bg-black/20">
      <ResponsiveDataView
        data={crypto}
        rowKey={gw => gw.id}
        rowClassName="border-border dark:border-white/10"
        mobileFooter={gw => {
          const a = enrichDepositAccount(gw);
          return (
            <div className="mt-3 pt-3 border-t border-border/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <Switch checked={a.isEnabled} onCheckedChange={v => onToggle(a, v)} />
                <span className="text-[11px] text-muted-foreground">{a.isEnabled ? "Listed" : "Hidden"}</span>
              </div>
              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => onEdit(a)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="outline" className="h-8 w-8 text-red-400" onClick={() => onDelete(a.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        }}
        columns={[
          {
            key: "coin",
            header: "Coin",
            headerClassName: "text-muted-foreground",
            mobileTitle: true,
            cell: gw => {
              const a = enrichDepositAccount(gw);
              const coinName = a.extraConfig?.coinName;
              return (
                <div className="flex items-center gap-2.5 min-w-0">
                  <CryptoAssetIcon symbol={a.symbol} network={a.network} coinName={coinName} size="sm" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{formatCryptoAssetLabel(a.symbol, a.network, coinName)}</p>
                    <p className="text-[11px] text-muted-foreground truncate max-w-[160px] font-normal">{a.name}</p>
                  </div>
                </div>
              );
            },
          },
          {
            key: "network",
            header: "Network / chain",
            headerClassName: "text-muted-foreground",
            cell: gw => {
              const a = enrichDepositAccount(gw);
              return (
                <Badge variant="outline" className="border-border dark:border-white/15 font-normal">
                  {a.network || "—"}
                </Badge>
              );
            },
          },
          {
            key: "address",
            header: "Wallet address",
            headerClassName: "text-muted-foreground",
            cellClassName: "font-mono text-xs max-w-[220px]",
            cell: gw => {
              const a = enrichDepositAccount(gw);
              return a.walletAddress ? (
                <span title={a.walletAddress}>{truncateAddress(a.walletAddress)}</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">No address</span>
              );
            },
          },
          {
            key: "exchange",
            header: "Exchange",
            headerClassName: "text-muted-foreground",
            hideOnMobile: true,
            cell: gw => {
              const a = enrichDepositAccount(gw);
              return (
                <div className="flex items-center gap-2">
                  <Switch checked={a.isEnabled} onCheckedChange={v => onToggle(a, v)} />
                  <span className="text-[11px] text-muted-foreground">{a.isEnabled ? "Listed" : "Hidden"}</span>
                </div>
              );
            },
          },
          {
            key: "actions",
            header: "Actions",
            headerClassName: "text-right text-muted-foreground",
            cellClassName: "text-right",
            hideOnMobile: true,
            cell: gw => {
              const a = enrichDepositAccount(gw);
              return (
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => onEdit(a)}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="outline" className="h-8 w-8 text-red-400" onClick={() => onDelete(a.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            },
          },
        ]}
      />
      <div className="px-4 py-2 border-t border-border dark:border-white/10 text-[11px] text-muted-foreground">
        {crypto.length} wallet{crypto.length !== 1 ? "s" : ""} · synced to Super Admin → Exchange rates and user Exchange Buy/Sell
      </div>
    </div>
  );
}
