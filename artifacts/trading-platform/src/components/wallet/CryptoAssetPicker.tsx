import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Search, PenLine, LayoutGrid } from "lucide-react";
import {
  CRYPTO_ASSET_CATALOG,
  chainsForCatalogSymbol,
  defaultChainForSymbol,
  findCatalogAsset,
  formatCryptoAssetLabel,
  type CryptoAssetDefinition,
} from "@/components/wallet/crypto-asset-catalog";
import { CryptoAssetIcon } from "@/components/wallet/CryptoAssetIcon";
import { PaymentMethodFieldLabel, PaymentMethodTabsList, PaymentMethodTabsTrigger, FinanceFieldLabel, financeInputClass } from "@/components/wallet/PaymentMethodField";

export type CryptoAssetSelection = {
  symbol: string;
  network: string;
  coinName: string;
};

type Props = {
  value: CryptoAssetSelection;
  onChange: (next: CryptoAssetSelection) => void;
  onAutoName?: (displayName: string) => void;
  className?: string;
};

export function CryptoAssetPicker({ value, onChange, onAutoName, className }: Props) {
  const [mode, setMode] = useState<"catalog" | "custom">(
    findCatalogAsset(value.symbol) ? "catalog" : "custom",
  );
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CRYPTO_ASSET_CATALOG;
    return CRYPTO_ASSET_CATALOG.filter(a =>
      a.symbol.toLowerCase().includes(q)
      || a.name.toLowerCase().includes(q)
      || a.chains.some(c => c.label.toLowerCase().includes(q) || c.value.toLowerCase().includes(q)),
    );
  }, [query]);

  const chains = chainsForCatalogSymbol(value.symbol);
  const selectedAsset = findCatalogAsset(value.symbol);

  function pickAsset(asset: CryptoAssetDefinition, network?: string) {
    const net = network || asset.chains[0]?.value || defaultChainForSymbol(asset.symbol);
    const next = {
      symbol: asset.symbol,
      network: net,
      coinName: asset.name,
    };
    onChange(next);
    onAutoName?.(formatCryptoAssetLabel(asset.symbol, net, asset.name));
  }

  function pickPreset(asset: CryptoAssetDefinition, network: string) {
    pickAsset(asset, network);
  }

  return (
    <div className={cn("space-y-3", className)}>
      <Tabs value={mode} onValueChange={v => setMode(v as "catalog" | "custom")}>
        <PaymentMethodTabsList className="w-full">
          <PaymentMethodTabsTrigger value="catalog" tone="crypto" className="flex-1 gap-1.5 text-xs">
            <LayoutGrid className="h-3.5 w-3.5" /> Select coin & chain
          </PaymentMethodTabsTrigger>
          <PaymentMethodTabsTrigger value="custom" tone="gateway" className="flex-1 gap-1.5 text-xs">
            <PenLine className="h-3.5 w-3.5" /> Add custom
          </PaymentMethodTabsTrigger>
        </PaymentMethodTabsList>

        <TabsContent value="catalog" className="space-y-3 mt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search coin or chain (e.g. USDT, Solana, Arbitrum…)"
              className="pl-9 bg-input/40 border-border dark:bg-white/5 dark:border-white/10"
            />
          </div>

          <div className="max-h-52 overflow-y-auto rounded-lg border border-border dark:border-white/10 bg-muted/80 dark:bg-black/20 p-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filtered.map(asset => {
              const active = value.symbol === asset.symbol;
              return (
                <button
                  key={asset.symbol}
                  type="button"
                  onClick={() => pickAsset(asset)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border text-left transition-colors",
                    active
                      ? "border-amber-500/50 bg-amber-500/10"
                      : "border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.02] hover:bg-muted/80 dark:hover:bg-muted/60 dark:bg-white/5",
                  )}
                >
                  <CryptoAssetIcon symbol={asset.symbol} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{asset.symbol}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{asset.name}</p>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="col-span-full text-center text-xs text-muted-foreground py-6">
                No match — use <strong>Add custom</strong> for other coins.
              </p>
            )}
          </div>

          {selectedAsset && selectedAsset.chains.length > 1 && (
            <div className="space-y-1.5">
              <PaymentMethodFieldLabel tone="crypto">Popular {selectedAsset.symbol} networks</PaymentMethodFieldLabel>
              <div className="flex flex-wrap gap-2">
                {selectedAsset.chains.map(chain => (
                  <Button
                    key={chain.value}
                    type="button"
                    size="sm"
                    variant={value.network === chain.value ? "default" : "outline"}
                    className={value.network === chain.value ? "bg-amber-500 text-black" : "border-border dark:border-white/10 text-xs h-8"}
                    onClick={() => pickPreset(selectedAsset, chain.value)}
                  >
                    {chain.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <PaymentMethodFieldLabel tone="crypto">Network / Chain *</PaymentMethodFieldLabel>
            <Select
              value={value.network || chains[0]?.value}
              onValueChange={net => {
                const asset = findCatalogAsset(value.symbol);
                onChange({
                  symbol: value.symbol,
                  network: net,
                  coinName: asset?.name || value.coinName,
                });
                onAutoName?.(formatCryptoAssetLabel(value.symbol, net, asset?.name || value.coinName));
              }}
            >
              <SelectTrigger className={financeInputClass()}>
                <SelectValue placeholder="Select network" />
              </SelectTrigger>
              <SelectContent className="border-border bg-popover">
                {chains.map(c => (
                  <SelectItem key={c.value} value={c.value} className="focus:bg-orange-500/15 focus:text-orange-200">
                    {c.label}{c.hint ? ` — ${c.hint}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.02] p-2">
            <CryptoAssetIcon symbol={value.symbol} network={value.network} coinName={value.coinName} size="md" />
            <div>
              <p className="text-sm font-medium">{formatCryptoAssetLabel(value.symbol, value.network, value.coinName)}</p>
              <p className="text-[11px] text-muted-foreground">Trust Wallet–style coin & chain selection</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-3 mt-3">
          <p className="text-xs text-muted-foreground">
            Add any coin and network manually (e.g. custom tokens or new chains).
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <FinanceFieldLabel tone="crypto">Coin symbol *</FinanceFieldLabel>
              <Input
                value={value.symbol}
                onChange={e => onChange({ ...value, symbol: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) })}
                placeholder="e.g. PEPE"
                className={financeInputClass("font-mono uppercase")}
              />
            </div>
            <div className="space-y-1">
              <FinanceFieldLabel tone="crypto">Network / chain *</FinanceFieldLabel>
              <Input
                value={value.network}
                onChange={e => onChange({ ...value, network: e.target.value })}
                placeholder="e.g. ERC20, Solana"
                className={financeInputClass()}
              />
            </div>
          </div>
          <div className="space-y-1">
            <FinanceFieldLabel tone="crypto">Display name (optional)</FinanceFieldLabel>
            <Input
              value={value.coinName}
              onChange={e => onChange({ ...value, coinName: e.target.value })}
              placeholder="e.g. Pepe Coin"
              className={financeInputClass()}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
