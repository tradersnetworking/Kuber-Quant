import { useState } from "react";
import * as ApiHooks from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Plus, Activity, Globe } from "lucide-react";
import { MtAccountCredentialsForm, type MtAccountFormValues } from "@/components/forms/MtAccountCredentialsForm";

const EMPTY_MT: MtAccountFormValues = {
  mtPlatform: "mt5",
  mtAccountNumber: "",
  mtBroker: "",
  mtServer: "",
  mtPassword: "",
  linkMtLater: false,
};

function LinkAccountForm({ onSuccess }: { onSuccess: () => void }) {
  const useCreateMt5Account = (ApiHooks as any).useCreateMt5Account;
  const createMutation = useCreateMt5Account ? useCreateMt5Account() : { mutate: () => {}, isPending: false };
  const { toast } = useToast();
  const [form, setForm] = useState<MtAccountFormValues>(EMPTY_MT);

  const onChange = <K extends keyof MtAccountFormValues>(key: K, value: MtAccountFormValues[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      data: {
        accountNumber: form.mtAccountNumber,
        broker: form.mtBroker,
        serverName: form.mtServer,
        platform: form.mtPlatform,
        password: form.mtPassword,
      },
    }, {
      onSuccess: () => {
        toast({ title: "Account submitted", description: "Your MT4/MT5 account is pending review." });
        setForm(EMPTY_MT);
        onSuccess();
      },
      onError: (err: any) => {
        toast({ title: "Submission failed", description: err.message, variant: "destructive" });
      },
    });
  };

  return (
    <form onSubmit={handleCreate} className="space-y-4 pt-2">
      <MtAccountCredentialsForm values={form} onChange={onChange} showDeferOption={false} />
      <Button type="submit" className="w-full bg-amber-500 text-black font-bold" disabled={createMutation.isPending}>
        {createMutation.isPending ? "Submitting…" : "Confirm & Link Account"}
      </Button>
    </form>
  );
}

export default function Mt5Page() {
  const useListMt5Accounts = (ApiHooks as any).useListMt5Accounts;
  const { data: accounts, isLoading, refetch } = useListMt5Accounts ? useListMt5Accounts() : { data: [], isLoading: true, refetch: () => {} };

  return (
    <div className="space-y-8">
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">Link MT4/MT5 Account</h1>
            <p className="text-muted-foreground">Connect MetaTrader accounts for algo trading, copy trading, and account handling.</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
                <Plus className="mr-2 h-4 w-4" /> Link Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Link MT4/MT5 Account</DialogTitle>
                <DialogDescription>Enter your MT4/MT5 account details and trading password. Stored encrypted.</DialogDescription>
              </DialogHeader>
              <LinkAccountForm onSuccess={() => refetch()} />
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
                    acc.status === "active" ? "border-green-500/30 text-green-500 bg-green-500/10" : "border-amber-500/30 text-amber-500 bg-amber-500/10"
                  }>
                    {acc.status}
                  </Badge>
                </div>
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center mb-2">
                    <LineChart className="h-5 w-5 text-amber-500" />
                  </div>
                  <CardTitle className="text-xl">#{acc.accountNumber}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Globe className="h-3 w-3" /> {acc.broker} · {(acc.platform || "mt5").toUpperCase()}
                  </CardDescription>
                  {acc.serverName && <p className="text-xs text-muted-foreground">Server: {acc.serverName}</p>}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                      <p className="text-[10px] text-muted-foreground uppercase mb-1">Balance</p>
                      <p className="text-lg font-bold text-amber-400">${acc.balance?.toLocaleString() || "0.00"}</p>
                    </div>
                    <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                      <p className="text-[10px] text-muted-foreground uppercase mb-1">Equity</p>
                      <p className="text-lg font-bold">${acc.equity?.toLocaleString() || "0.00"}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm px-1">
                    <span className="text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" /> Profit</span>
                    <span className="text-green-500 font-medium">+${acc.profit?.toLocaleString() || "0.00"}</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t border-white/5">
                  <Badge variant="secondary" className="text-xs capitalize">{acc.platform || "mt5"}</Badge>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-24 flex flex-col items-center justify-center text-center bg-white/5 border border-dashed border-white/10 rounded-3xl">
            <div className="h-20 w-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
              <LineChart className="h-10 w-10 text-amber-500/40" />
            </div>
            <h3 className="text-xl font-bold">No MT4/MT5 Accounts Connected</h3>
            <p className="text-muted-foreground max-w-sm mt-2 mx-auto">Link your trading account to enable algo trading and account handling services.</p>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="mt-8 bg-amber-500 text-black font-bold">Link Your First Account</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Link MT4/MT5 Account</DialogTitle></DialogHeader>
                <LinkAccountForm onSuccess={() => refetch()} />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
);
}
