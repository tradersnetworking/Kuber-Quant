import { useRoute, Link } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft, Wallet, TrendingUp, ArrowDownLeft, ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useManagerClientDetail } from "@/lib/staff-api";
import { KycDocumentsList } from "@/components/kyc/KycDocumentsList";

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    approved: "bg-green-500/10 text-green-400 border-green-500/20",
    verified: "bg-green-500/10 text-green-400 border-green-500/20",
    processed: "bg-green-500/10 text-green-400 border-green-500/20",
    paid: "bg-green-500/10 text-green-400 border-green-500/20",
    active: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    submitted: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return map[status] || "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
};

export default function ManagerClientDetail() {
  const [, params] = useRoute("/manager/clients/:id");
  const clientId = params?.id ? Number(params.id) : 0;
  const { data, isLoading, error } = useManagerClientDetail(clientId);

  if (isLoading) {
    return (
      <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
);
  }

  if (error || !data) {
    return (
      <div className="text-center py-16 space-y-4">
          <p className="text-muted-foreground">Client not found or not assigned to you.</p>
          <Link href="/manager/clients"><Button variant="outline">Back to Clients</Button></Link>
        </div>
);
  }

  const { user, summary, kyc, transactions, investments, walletLedger, referralEarnings, roiPayouts } = data;

  return (
    <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link href="/manager/clients">
              <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Clients
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-primary">{user.fullName}</h1>
            <p className="text-muted-foreground">{user.email} · ID #{user.id}</p>
          </div>
          <Badge className={statusBadge(user.kycStatus)}>{user.kycStatus.toUpperCase()} KYC</Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { label: "Wallet Balance", value: fmt(summary.balanceFiat), icon: Wallet, color: "text-emerald-400" },
            { label: "Total Deposits", value: fmt(summary.totalDeposits), icon: ArrowDownLeft, color: "text-green-400" },
            { label: "Total Withdrawals", value: fmt(summary.totalWithdrawals), icon: ArrowUpRight, color: "text-red-400" },
            { label: "Total Profit", value: fmt(summary.totalProfit), icon: TrendingUp, color: "text-amber-400" },
            { label: "Investment Value", value: fmt(summary.investmentTotal), icon: TrendingUp, color: "text-blue-400" },
            { label: "Referral Earnings", value: fmt(summary.referralEarnings), icon: Wallet, color: "text-purple-400" },
          ].map(s => (
            <Card key={s.label} className="border-white/10 bg-white/5">
              <CardContent className="p-4">
                <s.icon className={`h-4 w-4 mb-2 ${s.color}`} />
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {(summary.pendingDeposits > 0 || summary.pendingWithdrawals > 0) && (
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4 flex gap-6 flex-wrap text-sm">
              {summary.pendingDeposits > 0 && (
                <span className="text-amber-400">Pending deposits: {fmt(summary.pendingDeposits)}</span>
              )}
              {summary.pendingWithdrawals > 0 && (
                <span className="text-orange-400">Pending withdrawals: {fmt(summary.pendingWithdrawals)}</span>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="transactions">
          <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto gap-1">
            <TabsTrigger value="transactions">Transactions ({transactions.length})</TabsTrigger>
            <TabsTrigger value="kyc">KYC Details</TabsTrigger>
            <TabsTrigger value="investments">Investments ({investments.length})</TabsTrigger>
            <TabsTrigger value="earnings">Earnings & Ledger</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="mt-4">
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-base">All Transactions</CardTitle>
                <CardDescription>Deposits, withdrawals, and payment history</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">No transactions yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map(tx => (
                        <TableRow key={tx.id} className="border-white/10">
                          <TableCell>
                            <div className="flex items-center gap-2 capitalize">
                              {tx.type === "deposit"
                                ? <ArrowDownLeft className="h-4 w-4 text-green-400" />
                                : <ArrowUpRight className="h-4 w-4 text-red-400" />}
                              {tx.type}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{tx.currency} {tx.amount.toLocaleString()}</TableCell>
                          <TableCell><Badge className={statusBadge(tx.status)}>{tx.status}</Badge></TableCell>
                          <TableCell className="text-muted-foreground text-sm">{tx.paymentMethod || "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(tx.createdAt), "MMM d, yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{tx.notes || tx.txHash || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kyc" className="mt-4">
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-teal-400" /> KYC Verification
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!kyc ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">No KYC submission on file.</p>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <Badge className={statusBadge(kyc.status)}>{kyc.status.toUpperCase()}</Badge>
                      {kyc.rejectionReason && (
                        <span className="text-sm text-red-400">Reason: {kyc.rejectionReason}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {[
                        ["Full Name", kyc.fullName], ["Country", kyc.country],
                        ["Address", kyc.address], ["ID Type", kyc.idType?.replace("_", " ")],
                        ["ID Number", kyc.idNumber], ["PAN Card", kyc.panCard],
                        ["Aadhaar", kyc.aadhaarNumber], ["Bank", kyc.bankName],
                        ["Account No.", kyc.bankAccountNumber], ["IFSC", kyc.ifscCode],
                      ].map(([label, val]) => val ? (
                        <div key={label as string}>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
                          <p className="font-medium mt-0.5">{val}</p>
                        </div>
                      ) : null)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Uploaded Documents</p>
                      <KycDocumentsList kyc={kyc} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Submitted {format(new Date(kyc.createdAt), "MMM d, yyyy 'at' HH:mm")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="investments" className="mt-4">
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-base">Investment Portfolio</CardTitle>
                <CardDescription>
                  {summary.activeInvestments} active · Total profit {fmt(summary.investmentProfit)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {investments.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">No investments yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead>Plan</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Profit</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Started</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {investments.map(inv => (
                        <TableRow key={inv.id} className="border-white/10">
                          <TableCell className="font-medium">{inv.planName || "—"}</TableCell>
                          <TableCell className="capitalize text-muted-foreground">{inv.type}</TableCell>
                          <TableCell>{inv.currency} {inv.amount.toLocaleString()}</TableCell>
                          <TableCell className="text-emerald-400">+{inv.profit.toLocaleString()} ({inv.profitPercent}%)</TableCell>
                          <TableCell><Badge className={statusBadge(inv.status)}>{inv.status}</Badge></TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(inv.createdAt), "MMM d, yyyy")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Trading Profit", value: fmt(summary.totalProfit) },
                { label: "Investment Profit", value: fmt(summary.investmentProfit) },
                { label: "ROI Payouts", value: fmt(summary.roiTotal) },
                { label: "Referral Paid", value: fmt(summary.referralPaid) },
              ].map(s => (
                <Card key={s.label} className="border-white/10 bg-white/5">
                  <CardContent className="p-4">
                    <p className="text-lg font-bold text-amber-400">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {referralEarnings.length > 0 && (
              <Card className="border-white/10 bg-white/5">
                <CardHeader><CardTitle className="text-base">Referral Earnings</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead>Referred User</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referralEarnings.map(r => (
                        <TableRow key={r.id} className="border-white/10">
                          <TableCell>User #{r.referredUserId}</TableCell>
                          <TableCell>{r.currency} {r.amount.toLocaleString()}</TableCell>
                          <TableCell><Badge className={statusBadge(r.status)}>{r.status}</Badge></TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(r.createdAt), "MMM d, yyyy")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {roiPayouts.length > 0 && (
              <Card className="border-white/10 bg-white/5">
                <CardHeader><CardTitle className="text-base">ROI Payouts</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead>Plan</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>ROI %</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roiPayouts.map(r => (
                        <TableRow key={r.id} className="border-white/10">
                          <TableCell>{r.planName || `Investment #${r.investmentId}`}</TableCell>
                          <TableCell className="text-emerald-400">{fmt(r.amount)}</TableCell>
                          <TableCell>{r.roiPercent}%</TableCell>
                          <TableCell><Badge className={statusBadge(r.status)}>{r.status}</Badge></TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(r.createdAt), "MMM d, yyyy")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-base">Wallet Ledger</CardTitle>
                <CardDescription>Complete balance movement history</CardDescription>
              </CardHeader>
              <CardContent>
                {walletLedger.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">No ledger entries yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Wallet</TableHead>
                        <TableHead>Balance After</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {walletLedger.map(l => (
                        <TableRow key={l.id} className="border-white/10">
                          <TableCell className="capitalize">{l.type}</TableCell>
                          <TableCell className={l.amount >= 0 ? "text-green-400" : "text-red-400"}>
                            {l.currency} {l.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="capitalize text-muted-foreground">{l.walletType}</TableCell>
                          <TableCell>{l.balanceAfter.toLocaleString()}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{l.description || "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(l.createdAt), "MMM d, HH:mm")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
);
}
