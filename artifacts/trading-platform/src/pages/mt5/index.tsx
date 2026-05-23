import { useState } from "react";
import * as ApiHooks from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Plus, Wallet, ShieldCheck, Activity, Globe, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Mt5Page() {
  const useListMt5Accounts = (ApiHooks as any).useListMt5Accounts;
  const useCreateMt5Account = (ApiHooks as any).useCreateMt5Account;

  const { data: accounts, isLoading, refetch } = useListMt5Accounts ? useListMt5Accounts() : { data: [], isLoading: true, refetch: () => {} };
  const createMutation = useCreateMt5Account ? useCreateMt5Account() : { mutate: () => {}, isPending: false };
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    accountNumber: "",
    broker: "MetaQuotes-Demo",
    server: "MetaTrader 5",
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      data: {
        accountNumber: formData.accountNumber,
        broker: formData.broker,
        server: formData.server,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Account Added", description: "Your MT5 account has been submitted for review." });
        setFormData({ accountNumber: "", broker: "MetaQuotes-Demo", server: "MetaTrader 5" });
        refetch();
      },
      onError: (err: any) => {
        toast({ title: "Submission Failed", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">MT5 Accounts</h1>
            <p className="text-muted-foreground">Connect and manage your MetaTrader 5 trading accounts.</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
                <Plus className="mr-2 h-4 w-4" /> Link Account
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#050A14] border-white/10">
              <DialogHeader>
                <DialogTitle>Link MT5 Account</DialogTitle>
                <DialogDescription>Enter your MetaTrader 5 credentials to link with Kuber Capital.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input 
                    placeholder="Enter MT5 ID" 
                    value={formData.accountNumber} 
                    onChange={e => setFormData({...formData, accountNumber: e.target.value})} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Broker</Label>
                  <Select value={formData.broker} onValueChange={v => setFormData({...formData, broker: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MetaQuotes-Demo">MetaQuotes-Demo</SelectItem>
                      <SelectItem value="Exness-MT5-Real">Exness-MT5-Real</SelectItem>
                      <SelectItem value="ICMarkets-MT5">ICMarkets-MT5</SelectItem>
                      <SelectItem value="OctaFX-MT5">OctaFX-MT5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Server</Label>
                  <Input 
                    placeholder="e.g. IC-MT5-Server" 
                    value={formData.server} 
                    onChange={e => setFormData({...formData, server: e.target.value})} 
                    required 
                  />
                </div>
                <div className="p-3 bg-white/5 border border-white/10 rounded-lg flex items-start gap-2">
                   <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                   <p className="text-[10px] text-muted-foreground leading-relaxed">
                     By linking your account, you authorize Kuber Capital to read your trading history and current equity for performance tracking. We will never execute trades without your explicit consent.
                   </p>
                </div>
                <Button type="submit" className="w-full bg-amber-500 text-black font-bold" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Connecting..." : "Confirm & Link"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2].map(i => <Skeleton key={i} className="h-[300px] w-full rounded-xl" />)}
          </div>
        ) : accounts?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((acc: any) => (
              <Card key={acc.id} className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-amber-500/30 transition-all relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4">
                   <Badge variant="outline" className={
                     acc.status === 'active' ? 'border-green-500/30 text-green-500 bg-green-500/10' : 'border-amber-500/30 text-amber-500 bg-amber-500/10'
                   }>
                     {acc.status}
                   </Badge>
                </div>
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center mb-2">
                    <LineChart className="h-5 w-5 text-amber-500" />
                  </div>
                  <CardTitle className="text-xl">#{acc.accountNumber}</CardTitle>
                  <CardDescription className="flex items-center gap-1"><Globe className="h-3 w-3" /> {acc.broker}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                      <p className="text-[10px] text-muted-foreground uppercase mb-1">Balance</p>
                      <p className="text-lg font-bold text-amber-400">${acc.balance?.toLocaleString() || '0.00'}</p>
                    </div>
                    <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                      <p className="text-[10px] text-muted-foreground uppercase mb-1">Equity</p>
                      <p className="text-lg font-bold text-platinum-white">${acc.equity?.toLocaleString() || '0.00'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm px-1">
                    <span className="text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" /> Today's Profit</span>
                    <span className="text-green-500 font-medium">+${acc.profit?.toLocaleString() || '0.00'}</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t border-white/5 flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1 text-xs hover:bg-amber-500/10 hover:text-amber-500">View Trades</Button>
                  <Button variant="ghost" size="sm" className="flex-1 text-xs hover:bg-amber-500/10 hover:text-amber-500">Settings</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-24 flex flex-col items-center justify-center text-center bg-white/5 border border-dashed border-white/10 rounded-3xl">
            <div className="h-20 w-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
               <LineChart className="h-10 w-10 text-amber-500/40" />
            </div>
            <h3 className="text-xl font-bold">No MT5 Accounts Connected</h3>
            <p className="text-muted-foreground max-w-sm mt-2 mx-auto">Link your professional trading account to track performance and use our algo strategies.</p>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="mt-8 bg-amber-500 text-black font-bold">Link Your First Account</Button>
              </DialogTrigger>
              <DialogContent className="bg-[#050A14] border-white/10">
                <DialogHeader>
                  <DialogTitle>Link MT5 Account</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input placeholder="Enter MT5 ID" value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Broker</Label>
                    <Input placeholder="e.g. IC Markets" value={formData.broker} onChange={e => setFormData({...formData, broker: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Server</Label>
                    <Input placeholder="e.g. IC-MT5-Server" value={formData.server} onChange={e => setFormData({...formData, server: e.target.value})} required />
                  </div>
                  <Button type="submit" className="w-full bg-amber-500 text-black font-bold" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Connecting..." : "Confirm & Link"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
