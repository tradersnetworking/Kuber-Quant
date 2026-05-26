import { useState } from "react";
import { useSearch } from "wouter";
import { useGetWallet, useWalletTransfer } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Send, Landmark } from "lucide-react";
import { DepositDialog } from "@/components/wallet/DepositDialog";
import { PersonalPaymentAccounts } from "@/components/wallet/PersonalPaymentAccounts";
import { WithdrawToPersonalAccountForm } from "@/components/wallet/WithdrawToPersonalAccount";
import { WalletQuickActions } from "@/components/wallet/WalletQuickActions";
import { WalletHistoryPanel } from "@/components/wallet/WalletHistoryPanel";

const VALID_TABS = new Set(["deposit", "withdraw", "accounts", "transfer", "history"]);

export default function WalletPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const tabParam = params.get("tab") || "deposit";
  const defaultTab = VALID_TABS.has(tabParam) ? tabParam : "deposit";

  const { data: wallet, refetch } = useGetWallet();
  const transferMutation = useWalletTransfer();
  const { toast } = useToast();

  const [transferData, setTransferData] = useState({
    fromWallet: "fiat" as "fiat" | "crypto",
    toWallet: "crypto" as "fiat" | "crypto",
    amount: "",
  });

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    transferMutation.mutate({
      data: {
        fromWallet: transferData.fromWallet as any,
        toWallet: transferData.toWallet as any,
        amount: Number(transferData.amount),
      }
    }, {
      onSuccess: () => {
        toast({ title: "Transfer Successful", description: "Funds moved between wallets." });
        setTransferData({ ...transferData, amount: "" });
        refetch();
      },
      onError: (err: any) => {
        toast({ title: "Transfer Failed", description: err.message, variant: "destructive" });
      }
    });
  };

  const balances = [
    { label: "Fiat Balance", value: wallet?.fiatBalance || 0, currency: "USD", icon: Landmark, color: "text-amber-500" },
    { label: "Crypto Balance", value: wallet?.cryptoBalance || 0, currency: "USDT", icon: Wallet, color: "text-amber-400" },
    { label: "BTC Equivalent", value: wallet?.btcBalance || 0, currency: "BTC", icon: Wallet, color: "text-orange-500" },
    { label: "ETH Equivalent", value: wallet?.ethBalance || 0, currency: "ETH", icon: Wallet, color: "text-blue-400" },
  ];

  return (
    <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">Wallet</h1>
            <p className="text-muted-foreground text-platinum-white/60">
              Portal wallet shows your balance. Deposit to wallet, then withdraw to your personal bank, UPI, or crypto account.
            </p>
          </div>
          <div className="w-full md:w-64">
            <WalletQuickActions onSuccess={() => refetch()} layout="row" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {balances.map((item, i) => (
            <Card key={i} className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <div className="text-2xl font-bold">
                  {item.currency !== "BTC" && item.currency !== "ETH" && "$"}
                  {item.value.toLocaleString()} {item.currency}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto">
            <TabsTrigger value="deposit">Deposit to Wallet</TabsTrigger>
            <TabsTrigger value="withdraw">Withdraw to Personal Account</TabsTrigger>
            <TabsTrigger value="accounts">My Personal Accounts</TabsTrigger>
            <TabsTrigger value="transfer">Internal Transfer</TabsTrigger>
            <TabsTrigger value="history">History & Ledger</TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="space-y-4">
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Deposit to Portal Wallet</CardTitle>
                  <CardDescription>Use the Deposit button to choose UPI, bank, payment gateway, or crypto</CardDescription>
                </div>
                <DepositDialog onSuccess={() => refetch()} />
              </CardHeader>
            </Card>
          </TabsContent>

          <TabsContent value="withdraw" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle>Wallet → Personal Account</CardTitle>
                  <CardDescription>
                    Move funds from your portal wallet to your saved bank, UPI, or crypto wallet
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WithdrawToPersonalAccountForm onSuccess={() => refetch()} />
                </CardContent>
              </Card>
              <PersonalPaymentAccounts />
            </div>
          </TabsContent>

          <TabsContent value="accounts">
            <PersonalPaymentAccounts />
          </TabsContent>

          <TabsContent value="transfer">
            <Card className="max-w-md bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle>Internal Transfer</CardTitle>
                <CardDescription>Move funds between Fiat and Crypto wallets inside the portal</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTransfer} className="space-y-4">
                  <div className="space-y-2">
                    <Label>From</Label>
                    <Select value={transferData.fromWallet} onValueChange={v => setTransferData({ ...transferData, fromWallet: v as any, toWallet: v === "fiat" ? "crypto" : "fiat" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fiat">Fiat Wallet</SelectItem>
                        <SelectItem value="crypto">Crypto Wallet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-center"><Send className="h-4 w-4 rotate-90 text-muted-foreground" /></div>
                  <div className="space-y-2">
                    <Label>To</Label>
                    <Input value={transferData.toWallet === "fiat" ? "Fiat Wallet" : "Crypto Wallet"} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" placeholder="0.00" value={transferData.amount} onChange={e => setTransferData({ ...transferData, amount: e.target.value })} required />
                  </div>
                  <Button type="submit" className="w-full bg-amber-500 text-black font-semibold" disabled={transferMutation.isPending}>
                    {transferMutation.isPending ? "Processing..." : "Transfer Now"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <WalletHistoryPanel />
          </TabsContent>
        </Tabs>
      </div>
);
}
