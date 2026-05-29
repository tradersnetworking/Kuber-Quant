import { useEffect, useState } from "react";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import { Skeleton } from "@/components/ui/skeleton";

import { ScrollArea } from "@/components/ui/scroll-area";

import { RefreshCw } from "lucide-react";

import { staffFetch } from "@/lib/staff-api";

import { format } from "date-fns";

import { KycDocumentsList } from "@/components/kyc/KycDocumentsList";



export type UserFullDetail = {

  user: {

    id: number; email: string; fullName: string; phone: string | null; role: string;

    kycStatus: string; balanceFiat: number; balanceCrypto: number; totalProfit: number;

    referralCode: string | null; referralCount: number; referralEarnings: number;

    managerId: number | null; isActive: boolean; isPromoter?: boolean;

    twoFactorEnabled: boolean; createdAt: string;

    suspendReason?: string | null;

    withdrawalsEnabled?: boolean;

    withdrawalBlockMessage?: string | null;

    depositsEnabled?: boolean;

    investmentsEnabled?: boolean;

    algoTradingEnabled?: boolean;

    copyTradingEnabled?: boolean;

    eaTradingEnabled?: boolean;

    mt5Enabled?: boolean;

  };

  profile: Record<string, unknown> | null;

  manager: { id: number; fullName: string; email: string } | null;

  referrer: { id: number; fullName: string; referralCode: string | null } | null;

  kyc: Record<string, unknown> | null;

  kycRecords: Record<string, unknown>[];

  paymentAccounts: Array<Record<string, unknown>>;

  mt5Accounts: Array<Record<string, unknown>>;

  mt5Requests: Array<Record<string, unknown>>;

  summary: Record<string, number>;

  transactions?: Array<Record<string, unknown>>;

  deposits?: Array<Record<string, unknown>>;

  withdrawals?: Array<Record<string, unknown>>;

  investments?: Array<Record<string, unknown>>;

  recentTransactions: Array<Record<string, unknown>>;

  recentInvestments: Array<Record<string, unknown>>;

  algoSubscriptions?: Array<Record<string, unknown>>;

  eaSubscriptions?: Array<Record<string, unknown>>;

  copyFollows?: Array<Record<string, unknown>>;

  roiPayouts?: Array<Record<string, unknown>>;

  serviceAccess?: Record<string, boolean | string | null>;

};



interface UserFullDetailSheetProps {

  userId: number | null;

  open: boolean;

  onOpenChange: (open: boolean) => void;

  apiBase?: "/super-admin" | "/admin" | "/support-team" | "/manager";

  defaultTab?: "overview" | "profile" | "kyc" | "banking" | "trading" | "activity" | "subscriptions" | "transactions" | "investments";

  onEdit?: (userId: number) => void;

  readOnly?: boolean;

  fullData?: boolean;

}



export function UserFullDetailSheet({

  userId, open, onOpenChange, apiBase = "/super-admin", defaultTab = "overview", onEdit, readOnly,

  fullData = true,

}: UserFullDetailSheetProps) {

  const [detail, setDetail] = useState<UserFullDetail | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState(defaultTab);



  const load = async () => {

    if (!userId) return;

    setLoading(true);

    setError(null);

    try {

      const fullQuery = fullData && apiBase === "/super-admin" ? "?full=1" : "";

      const path = apiBase === "/manager"

        ? `${apiBase}/clients/${userId}/full`

        : `${apiBase}/users/${userId}/full${fullQuery}`;

      const data = await staffFetch<UserFullDetail>(path);

      setDetail(data);

    } catch (e: any) {

      setError(e.message || "Failed to load user details");

      setDetail(null);

    } finally {

      setLoading(false);

    }

  };



  useEffect(() => {

    if (open && userId) {

      setTab(defaultTab);

      load();

    }

  }, [open, userId, defaultTab, fullData, apiBase]);



  const u = detail?.user;

  const p = detail?.profile as Record<string, any> | null;

  const kyc = detail?.kyc as Record<string, any> | null;

  const txns = detail?.transactions ?? detail?.recentTransactions ?? [];

  const investments = detail?.investments ?? detail?.recentInvestments ?? [];



  return (

    <Sheet open={open} onOpenChange={onOpenChange}>

      <SheetContent className="w-full sm:max-w-2xl bg-background border-border dark:border-white/10 p-0 flex flex-col">

        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border dark:border-white/10 shrink-0">

          <div className="flex items-start justify-between gap-3">

            <div className="min-w-0">

              <SheetTitle className="flex items-center gap-2 flex-wrap text-left">

                {loading ? "Loading..." : u?.fullName || "User Details"}

                {u && <Badge variant="outline" className="capitalize">{u.role}</Badge>}

                {u && (

                  u.isActive

                    ? <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 text-xs">Active</Badge>

                    : <Badge className="bg-red-500/20 text-red-400 text-xs">Suspended</Badge>

                )}

              </SheetTitle>

              <SheetDescription className="text-left truncate">

                {u ? `${u.email} · ID #${u.id}` : error || " "}

                {readOnly && u && (

                  <span className="block text-xs text-amber-600 dark:text-amber-400 mt-0.5">Read-only view</span>

                )}

              </SheetDescription>

            </div>

            <div className="flex gap-1 shrink-0">

              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={load} disabled={loading}>

                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />

              </Button>

              {onEdit && u && (

                <Button size="sm" variant="outline" onClick={() => onEdit(u.id)}>Edit</Button>

              )}

            </div>

          </div>

        </SheetHeader>



        <ScrollArea className="flex-1 px-6 py-4">

          {loading ? (

            <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>

          ) : error ? (

            <p className="text-sm text-red-400 py-8 text-center">{error}</p>

          ) : detail && u ? (

            <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}>

              <TabsList className="bg-muted/60 dark:bg-white/5 border border-border dark:border-white/10 flex-wrap h-auto mb-4">

                <TabsTrigger value="overview">Overview</TabsTrigger>

                <TabsTrigger value="transactions">Transactions</TabsTrigger>

                <TabsTrigger value="investments">Investments</TabsTrigger>

                <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>

                <TabsTrigger value="banking">Payout Methods</TabsTrigger>

                <TabsTrigger value="kyc">KYC</TabsTrigger>

                <TabsTrigger value="trading">Trading</TabsTrigger>

                <TabsTrigger value="profile">Profile</TabsTrigger>

              </TabsList>



              <TabsContent value="overview" className="space-y-4 mt-0">

                <Section title="Account">

                  <Row label="Full Name" value={u.fullName} />

                  <Row label="Email" value={u.email} />

                  <Row label="Phone" value={u.phone} />

                  <Row label="KYC Status" value={u.kycStatus} capitalize />

                  <Row label="2FA" value={u.twoFactorEnabled ? "Enabled" : "Disabled"} />

                  <Row label="Joined" value={format(new Date(u.createdAt), "PPpp")} />

                  {!u.isActive && u.suspendReason && <Row label="Suspend Reason" value={u.suspendReason} />}

                </Section>

                {detail.manager && (

                  <Section title="Assigned Manager">

                    <Row label="Name" value={detail.manager.fullName} />

                    <Row label="Email" value={detail.manager.email} />

                  </Section>

                )}

                <Section title="Wallet Summary">

                  <Row label="Fiat Balance" value={`$${detail.summary.balanceFiat?.toFixed(2)}`} />

                  <Row label="Crypto Balance" value={String(detail.summary.balanceCrypto)} />

                  <Row label="Total Deposits" value={`$${detail.summary.totalDeposits?.toFixed(2)}`} />

                  <Row label="Total Withdrawals" value={`$${detail.summary.totalWithdrawals?.toFixed(2)}`} />

                  <Row label="Active Investments" value={String(detail.summary.activeInvestments ?? 0)} />

                </Section>

                <Section title="Service Access">

                  <ServiceFlag label="Deposits" enabled={u.depositsEnabled !== false} />

                  <ServiceFlag label="Withdrawals" enabled={u.withdrawalsEnabled !== false} />

                  <ServiceFlag label="Investments" enabled={u.investmentsEnabled !== false} />

                  <ServiceFlag label="Algo Trading" enabled={u.algoTradingEnabled !== false} />

                  <ServiceFlag label="Copy Trading" enabled={u.copyTradingEnabled !== false} />

                  <ServiceFlag label="EA Strategies" enabled={u.eaTradingEnabled !== false} />

                  <ServiceFlag label="MT4/MT5" enabled={u.mt5Enabled !== false} />

                </Section>

              </TabsContent>



              <TabsContent value="transactions" className="space-y-4 mt-0">

                {(detail.deposits?.length ?? 0) > 0 && (

                  <Section title={`Deposits (${detail.deposits!.length})`}>

                    {detail.deposits!.map((t: any) => (

                      <TxnRow key={t.id} t={t} />

                    ))}

                  </Section>

                )}

                {(detail.withdrawals?.length ?? 0) > 0 && (

                  <Section title={`Withdrawals (${detail.withdrawals!.length})`}>

                    {detail.withdrawals!.map((t: any) => (

                      <TxnRow key={t.id} t={t} />

                    ))}

                  </Section>

                )}

                {txns.length === 0 && <p className="text-sm text-muted-foreground">No transactions.</p>}

              </TabsContent>



              <TabsContent value="investments" className="space-y-4 mt-0">

                {investments.length > 0 ? (

                  <Section title={`Investment Plans (${investments.length})`}>

                    {investments.map((i: any) => (

                      <Row

                        key={i.id}

                        label={i.planName || i.type}

                        value={`${i.currency} ${Number(i.amount).toFixed(2)} · ${i.status} · P/L ${Number(i.profit).toFixed(2)}`}

                        capitalize

                      />

                    ))}

                  </Section>

                ) : (

                  <p className="text-sm text-muted-foreground">No investments.</p>

                )}

                {(detail.roiPayouts?.length ?? 0) > 0 && (

                  <Section title="ROI Payouts">

                    {detail.roiPayouts!.map((p: any) => (

                      <Row key={p.id} label={p.planName || `#${p.investmentId}`} value={`$${Number(p.amount).toFixed(2)} · ${p.status}`} capitalize />

                    ))}

                  </Section>

                )}

              </TabsContent>



              <TabsContent value="subscriptions" className="space-y-4 mt-0">

                {(detail.algoSubscriptions?.length ?? 0) > 0 && (

                  <Section title="Algo Subscriptions">

                    {detail.algoSubscriptions!.map((s: any) => (

                      <Row key={s.id} label={s.strategyName} value={s.active ? "Active" : "Inactive"} capitalize />

                    ))}

                  </Section>

                )}

                {(detail.eaSubscriptions?.length ?? 0) > 0 && (

                  <Section title="EA Subscriptions">

                    {detail.eaSubscriptions!.map((s: any) => (

                      <Row key={s.id} label={s.strategyName} value={`${s.status} · ${s.mtPlatform?.toUpperCase()} #${s.mtAccountNumber}`} capitalize />

                    ))}

                  </Section>

                )}

                {(detail.copyFollows?.length ?? 0) > 0 && (

                  <Section title="Copy Trading">

                    {detail.copyFollows!.map((f: any) => (

                      <Row key={f.id} label={f.traderName} value={`${f.currency} ${Number(f.amount).toFixed(2)} · ${f.active ? "Active" : "Stopped"}`} />

                    ))}

                  </Section>

                )}

                {!detail.algoSubscriptions?.length && !detail.eaSubscriptions?.length && !detail.copyFollows?.length && (

                  <p className="text-sm text-muted-foreground">No active subscriptions.</p>

                )}

              </TabsContent>



              <TabsContent value="profile" className="space-y-4 mt-0">

                <Section title="Personal">

                  <Row label="Investor ID" value={p?.investorId} />

                  <Row label="Username" value={p?.username} />

                  <Row label="Country" value={p?.country} />

                  <Row label="City" value={p?.city} />

                  <Row label="Address" value={p?.address} />

                </Section>

              </TabsContent>



              <TabsContent value="kyc" className="space-y-4 mt-0">

                {!kyc ? (

                  <p className="text-sm text-muted-foreground py-6 text-center">No KYC submission on file.</p>

                ) : (

                  <>

                    <Section title="Identity">

                      <Row label="Status" value={kyc.status} capitalize />

                      <Row label="Legal Name" value={kyc.fullName} />

                      <Row label="ID Type" value={kyc.idType} capitalize />

                    </Section>

                    <Section title="Documents">

                      <div className="p-3">

                        <KycDocumentsList kyc={kyc} showMissing />

                      </div>

                    </Section>

                  </>

                )}

              </TabsContent>



              <TabsContent value="banking" className="space-y-4 mt-0">

                {detail.paymentAccounts.length > 0 ? (

                  <Section title="Withdrawal / Payout Methods">

                    {detail.paymentAccounts.map((a: any) => (

                      <div key={a.id} className="px-3 py-2 border-b border-border/80 dark:border-white/5 last:border-0">

                        <div className="flex items-center justify-between gap-2">

                          <p className="text-xs font-medium text-amber-400/90">{a.label} · {a.accountType}</p>

                          {!a.isActive && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}

                        </div>

                        {a.accountHolderName && <p className="text-xs text-muted-foreground mt-1">{a.accountHolderName}</p>}

                        {a.bankName && <Row label="Bank" value={a.bankName} compact />}

                        {a.accountNumber && <Row label="Account" value={a.accountNumber} mono compact />}

                        {a.upiId && <Row label="UPI" value={a.upiId} mono compact />}

                        {a.walletAddress && <Row label={`${a.cryptoSymbol || "Crypto"} Wallet`} value={a.walletAddress} mono compact />}

                      </div>

                    ))}

                  </Section>

                ) : (

                  <p className="text-sm text-muted-foreground">No payout methods saved.</p>

                )}

              </TabsContent>



              <TabsContent value="trading" className="space-y-4 mt-0">

                {detail.mt5Accounts.length > 0 ? (

                  <Section title="Linked MT Accounts">

                    {detail.mt5Accounts.map((a: any) => (

                      <div key={a.id} className="px-3 py-2 border-b border-border/80 dark:border-white/5 last:border-0">

                        <p className="text-sm font-medium">{a.platform?.toUpperCase()} · #{a.accountNumber}</p>

                        <Row label="Broker" value={a.broker} compact />

                        <Row label="Status" value={a.status} capitalize compact />

                      </div>

                    ))}

                  </Section>

                ) : (

                  <p className="text-sm text-muted-foreground">No linked MT4/MT5 accounts.</p>

                )}

              </TabsContent>

            </Tabs>

          ) : null}

        </ScrollArea>

      </SheetContent>

    </Sheet>

  );

}



function TxnRow({ t }: { t: any }) {

  return (

    <Row

      label={`${t.type} · ${t.status}`}

      value={`${t.currency} ${Number(t.amount).toFixed(2)} · ${format(new Date(t.createdAt), "dd MMM yyyy")}${t.paymentMethod ? ` · ${t.paymentMethod}` : ""}`}

      capitalize

    />

  );

}



function ServiceFlag({ label, enabled }: { label: string; enabled: boolean }) {

  return (

    <div className="flex justify-between items-center px-3 py-2 text-sm border-b border-border/80 dark:border-white/5 last:border-0">

      <span className="text-muted-foreground">{label}</span>

      <Badge className={enabled ? "bg-green-500/20 text-green-700 dark:text-green-400 text-xs" : "bg-red-500/20 text-red-400 text-xs"}>

        {enabled ? "Allowed" : "Restricted"}

      </Badge>

    </div>

  );

}



function Section({ title, children }: { title: string; children: React.ReactNode }) {

  return (

    <div>

      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</h4>

      <div className="rounded-lg border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.02] divide-y divide-white/5">

        {children}

      </div>

    </div>

  );

}



function Row({

  label, value, capitalize, mono, compact,

}: { label: string; value: unknown; capitalize?: boolean; mono?: boolean; compact?: boolean }) {

  const display = value == null || value === "" ? "—" : String(value);

  return (

    <div className={`flex justify-between items-start gap-4 ${compact ? "px-3 py-1.5" : "px-3 py-2.5"} text-sm`}>

      <span className="text-muted-foreground shrink-0">{label}</span>

      <span className={`font-medium text-right break-all ${capitalize ? "capitalize" : ""} ${mono ? "font-mono text-xs" : ""}`}>

        {display}

      </span>

    </div>

  );

}


