import { useState } from "react";
import * as ApiHooks from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Wallet, ArrowUpRight, ArrowDownLeft, Send, Copy, Landmark } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function WalletPage() {
  const useGetWallet = (ApiHooks as any).useGetWallet;
  const useWalletTransfer = (ApiHooks as any).useWalletTransfer;
  const useCreateTransaction = (ApiHooks as any).useCreateTransaction;

  const { data: wallet, isLoading, refetch } = useGetWallet ? useGetWallet() : { data: null, isLoading: true, refetch: () => {} };
  const transferMutation = useWalletTransfer ? useWalletTransfer() : { mutate: () => {}, isPending: false };
  const createTxMutation = useCreateTransaction ? useCreateTransaction() : { mutate: () => {}, isPending: false };
  const { toast } = useToast();

  const [transferData, setTransferData] = useState({
    fromWallet: "fiat" as "fiat" | "crypto",
    toWallet: "crypto" as "fiat" | "crypto",
    amount: "",
  });

  const [depositData, setDepositData] = useState({
    amount: "",
    currency: "USD",
    method: "Razorpay",
  });

  const [withdrawData, setWithdrawData] = useState({
    amount: "",
    currency: "USD",
    method: "Bank Transfer",
    address: "",
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

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    createTxMutation.mutate({
      data: {
        type: "deposit",
        amount: Number(depositData.amount),
        currency: depositData.currency as any,
        paymentMethod: depositData.method,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Deposit Requested", description: "Your request is pending approval." });
        setDepositData({ ...depositData, amount: "" });
        refetch();
      }
    });
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    createTxMutation.mutate({
      data: {
        type: "withdrawal",
        amount: Number(withdrawData.amount),
        currency: withdrawData.currency as any,
        paymentMethod: `${withdrawData.method}: ${withdrawData.address}`,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Withdrawal Requested", description: "Your request is pending approval." });
        setWithdrawData({ ...withdrawData, amount: "", address: "" });
        refetch();
      }
    });
  };

  const balances = [
    { label: "Fiat Balance", value: wallet?.fiatBalance || 0, currency: "USD", icon: Landmark, color: "text-amber-500" },
    { label: "Crypto Balance", value: wallet?.cryptoBalance || 0, currency: "USDT", icon: Wallet, color: "text-amber-400" },
    { label: "BTC Equivalent", value: 0.045, currency: "BTC", icon: Wallet, color: "text-orange-500" },
    { label: "ETH Equivalent", value: 0.82, currency: "ETH", icon: Wallet, color: "text-blue-400" },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">Wallet</h1>
          <p className="text-muted-foreground text-platinum-white/60">Manage your funds and internal transfers.</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Deposit or withdraw funds to your wallet</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                      <ArrowDownLeft className="mr-2 h-4 w-4" /> Deposit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#050A14] border-white/10">
                    <DialogHeader>
                      <DialogTitle>Deposit Funds</DialogTitle>
                      <DialogDescription>Add money to your account</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleDeposit} className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input type="number" placeholder="0.00" value={depositData.amount} onChange={e => setDepositData({...depositData, amount: e.target.value})} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Payment Method</Label>
                        <Select value={depositData.method} onValueChange={v => setDepositData({...depositData, method: v})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Razorpay">Razorpay</SelectItem>
                            <SelectItem value="PhonePe">PhonePe</SelectItem>
                            <SelectItem value="PayPal">PayPal</SelectItem>
                            <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                            <SelectItem value="USDT">USDT (TRC20)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="w-full bg-amber-500 text-black font-semibold" disabled={createTxMutation.isPending}>
                        {createTxMutation.isPending ? "Processing..." : "Continue to Payment"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10">
                      <ArrowUpRight className="mr-2 h-4 w-4" /> Withdraw
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#050A14] border-white/10">
                    <DialogHeader>
                      <DialogTitle>Withdraw Funds</DialogTitle>
                      <DialogDescription>Transfer money out of your account</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleWithdraw} className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input type="number" placeholder="0.00" value={withdrawData.amount} onChange={e => setWithdrawData({...withdrawData, amount: e.target.value})} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Method</Label>
                        <Select value={withdrawData.method} onValueChange={v => setWithdrawData({...withdrawData, method: v})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                            <SelectItem value="USDT">USDT (TRC20)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Account Details / Address</Label>
                        <Input placeholder="Enter bank info or crypto address" value={withdrawData.address} onChange={e => setWithdrawData({...withdrawData, address: e.target.value})} required />
                      </div>
                      <Button type="submit" className="w-full bg-amber-500 text-black font-semibold" disabled={createTxMutation.isPending}>
                        {createTxMutation.isPending ? "Processing..." : "Submit Withdrawal"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="mt-8 space-y-4">
                <h4 className="text-sm font-medium">Crypto Deposit Addresses</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['BTC', 'USDT (TRC20)'].map((coin) => (
                    <div key={coin} className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
                      <div className="truncate mr-4">
                        <p className="text-[10px] uppercase text-muted-foreground mb-1">{coin}</p>
                        <p className="text-xs font-mono truncate">0x71C7656EC7ab88b098defB751B7401B5f6d8976F</p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => {
                        navigator.clipboard.writeText("0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
                        toast({ title: "Address Copied" });
                      }}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle>Internal Transfer</CardTitle>
              <CardDescription>Move funds between Fiat and Crypto wallets</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTransfer} className="space-y-4">
                <div className="space-y-2">
                  <Label>From</Label>
                  <Select 
                    value={transferData.fromWallet} 
                    onValueChange={v => setTransferData({...transferData, fromWallet: v as any, toWallet: v === 'fiat' ? 'crypto' : 'fiat'})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fiat">Fiat Wallet</SelectItem>
                      <SelectItem value="crypto">Crypto Wallet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-center">
                  <Send className="h-4 w-4 rotate-90 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input value={transferData.toWallet === 'fiat' ? 'Fiat Wallet' : 'Crypto Wallet'} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" placeholder="0.00" value={transferData.amount} onChange={e => setTransferData({...transferData, amount: e.target.value})} required />
                </div>
                <Button type="submit" className="w-full bg-amber-500 text-black font-semibold" disabled={transferMutation.isPending}>
                  {transferMutation.isPending ? "Processing..." : "Transfer Now"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
