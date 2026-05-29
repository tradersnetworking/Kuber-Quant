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
import { TradingServiceDepositBanner } from "@/components/wallet/TradingServiceDepositBanner";
import { useAuth } from "@/hooks/use-auth";
import { ProfitShareButton } from "@/components/profit/ProfitShareButton";

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
    if (!form.mtAccountNumber.trim() || !form.mtBroker.trim() || !form.mtServer.trim() || !form.mtPassword || form.mtPassword.length < 4) {
      toast({
        title: "Please complete the form",
        description: "Account number, broker, server, and trading password are required.",
        variant: "destructive",
      });
      return;
    }
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
    <form onSubmit={handleCreate} className="dialog-form-inner space-y-4 pt-2">
      <MtAccountCredentialsForm values={form} onChange={onChange} showDeferOption={false} required hideHeader />
      <Button type="submit" size="wrap" className="w-full bg-amber-500 text-black font-bold min-h-11" disabled={createMutation.isPending}>
        {createMutation.isPending ? "Submitting…" : "Confirm & Link Account"}
      </Button>
    </form>
  );
}

function LinkAccountDialogBody({
  onSuccess,
  onClose,
}: {
  onSuccess: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <DialogHeader className="shrink-0 px-4 pt-4 sm:px-6 sm:pt-6">
        <DialogTitle>Link MT4/MT5 Account</DialogTitle>
        <DialogDescription>Enter your MT4/MT5 account details and trading password. Stored encrypted.</DialogDescription>
      </DialogHeader>
      <LinkAccountForm
        onSuccess={() => {
          onSuccess();
          onClose();
        }}
      />
    </>
  );
}

export default function Mt5Page() {
  const useListMt5Accounts = (ApiHooks as any).useListMt5Accounts;
  const { data: accounts, isLoading, refetch } = useListMt5Accounts ? useListMt5Accounts() : { data: [], isLoading: true, refetch: () => {} };
  const { user } = useAuth();
  const referralCode = (user as any)?.referralCode as string | undefined;
  const userName = user?.fullName || "Investor";
  const [linkOpen, setLinkOpen] = useState(false);

  return (
    <div className="page-stack">
        <TradingServiceDepositBanner compact />
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 min-w-0">
          <div className="min-w-0">
            <h1 className="page-title bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">Link MT4/MT5 Account</h1>
            <p className="page-subtitle">Connect MetaTrader accounts for algo trading, copy trading, and account handling.</p>
          </div>
          <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold w-full sm:w-auto shrink-0">
                <Plus className="mr-2 h-4 w-4" /> Link Account
              </Button>
            </DialogTrigger>
            <DialogContent className="dialog-scroll-content max-w-lg overflow-x-hidden p-0 gap-0">
              <LinkAccountDialogBody onSuccess={() => refetch()} onClose={() => setLinkOpen(false)} />
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
              <Card key={acc.id} className="bg-muted/60 dark:bg-white/5 backdrop-blur-sm border-border dark:border-white/10 hover:border-amber-500/30 transition-all relative overflow-hidden group min-w-0">
                <div className="absolute top-0 right-0 p-3 sm:p-4 max-w-[45%]">
                  <Badge variant="outline" className={`text-[10px] sm:text-xs truncate max-w-full capitalize ${
                    acc.status === "active" ? "border-green-500/30 text-green-500 bg-green-500/10" : "border-amber-500/30 text-amber-500 bg-amber-500/10"
                  }`}>
                    {acc.status}
                  </Badge>
                </div>
                <CardHeader className="pr-16 sm:pr-20 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center mb-2">
                    <LineChart className="h-5 w-5 text-amber-500" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl truncate">#{acc.accountNumber}</CardTitle>
                  <CardDescription className="flex items-center gap-1 min-w-0">
                    <Globe className="h-3 w-3 shrink-0" />
                    <span className="truncate">{acc.broker} · {(acc.platform || "mt5").toUpperCase()}</span>
                  </CardDescription>
                  {acc.serverName && <p className="text-xs text-muted-foreground truncate">Server: {acc.serverName}</p>}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/80 dark:bg-black/20 rounded-lg border border-border/80 dark:border-white/5">
                      <p className="text-[10px] text-muted-foreground uppercase mb-1">Balance</p>
                      <p className="text-sm sm:text-lg font-bold text-amber-600 dark:text-amber-400 break-all">${acc.balance?.toLocaleString() || "0.00"}</p>
                    </div>
                    <div className="p-3 bg-muted/80 dark:bg-black/20 rounded-lg border border-border/80 dark:border-white/5">
                      <p className="text-[10px] text-muted-foreground uppercase mb-1">Equity</p>
                      <p className="text-sm sm:text-lg font-bold break-all">${acc.equity?.toLocaleString() || "0.00"}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm px-1">
                    <span className="text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" /> Profit</span>
                    <span className="text-green-500 font-medium">+${acc.profit?.toLocaleString() || "0.00"}</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t border-border/80 dark:border-white/5 flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="text-xs capitalize">{acc.platform || "mt5"}</Badge>
                  {Number(acc.profit) > 0 && (
                    <ProfitShareButton
                      userName={userName}
                      referralCode={referralCode}
                      payload={{
                        service: "mt5_handling",
                        profitAmount: Number(acc.profit),
                        currency: "USD",
                        detailLabel: `#${acc.accountNumber} · ${acc.broker}`,
                      }}
                    />
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-24 flex flex-col items-center justify-center text-center bg-muted/60 dark:bg-white/5 border border-dashed border-border dark:border-white/10 rounded-3xl">
            <div className="h-20 w-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
              <LineChart className="h-10 w-10 text-amber-500/40" />
            </div>
            <h3 className="text-xl font-bold">No MT4/MT5 Accounts Connected</h3>
            <p className="text-muted-foreground max-w-sm mt-2 mx-auto">Link your trading account to enable algo trading and account handling services.</p>
            <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
              <DialogTrigger asChild>
                <Button className="mt-8 bg-amber-500 text-black font-bold">Link Your First Account</Button>
              </DialogTrigger>
              <DialogContent className="dialog-scroll-content max-w-lg overflow-x-hidden p-0 gap-0">
                <LinkAccountDialogBody onSuccess={() => refetch()} onClose={() => setLinkOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
);
}
