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
import { useManagerClientDetail } from "@/lib/staff-api";
import { ResponsiveDataView, type ResponsiveColumn } from "@/components/ui/responsive-data-view";
import { KycDocumentsList } from "@/components/kyc/KycDocumentsList";
import { UserFullDetailSheet } from "@/components/super-admin/UserFullDetailSheet";
import { StaffReportDialog } from "@/components/staff/StaffReportDialog";
import { ShieldAlert, Eye } from "lucide-react";
import { useState } from "react";
import { STAFF_PAGE_STACK, STAFF_CARD, STAFF_TABLE_WRAP, STAFF_STAT_GRID, STAFF_HEADER_ROW, STAFF_FORM_GRID } from "@/lib/staff-dashboard-ui";
import { KpiStatCard } from "@/components/ui/KpiStatCard";
import { TAB_LIST_MOBILE_SCROLL } from "@/lib/tab-tones";

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    approved: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    verified: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    processed: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    paid: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    active: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    submitted: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return map[status] || "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
};

type ClientTransaction = {
  id: number;
  type: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod?: string | null;
  createdAt: string;
  notes?: string | null;
  txHash?: string | null;
};

type ClientInvestment = {
  id: number;
  planName?: string | null;
  type: string;
  amount: number;
  currency: string;
  profit: number;
  profitPercent: number;
  status: string;
  createdAt: string;
};

type ClientReferralEarning = {
  id: number;
  referredUserId: number;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
};

type ClientRoiPayout = {
  id: number;
  planName?: string | null;
  investmentId: number;
  amount: number;
  roiPercent: number;
  status: string;
  createdAt: string;
};

type ClientLedgerEntry = {
  id: number;
  type: string;
  amount: number;
  currency: string;
  walletType: string;
  balanceAfter: number;
  description?: string | null;
  createdAt: string;
};

const transactionColumns: ResponsiveColumn<ClientTransaction>[] = [
  {
    key: "type",
    header: "Type",
    mobileTitle: true,
    cell: (tx) => (
      <div className="flex items-center gap-2 capitalize">
        {tx.type === "deposit"
          ? <ArrowDownLeft className="h-4 w-4 text-green-700 dark:text-green-400" />
          : <ArrowUpRight className="h-4 w-4 text-red-400" />}
        {tx.type}
      </div>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    cell: (tx) => <span className="font-medium">{tx.currency} {tx.amount.toLocaleString()}</span>,
  },
  {
    key: "status",
    header: "Status",
    cell: (tx) => <Badge className={statusBadge(tx.status)}>{tx.status}</Badge>,
  },
  {
    key: "method",
    header: "Method",
    cell: (tx) => <span className="text-muted-foreground text-sm">{tx.paymentMethod || "—"}</span>,
  },
  {
    key: "date",
    header: "Date",
    cell: (tx) => (
      <span className="text-muted-foreground text-sm">
        {format(new Date(tx.createdAt), "MMM d, yyyy HH:mm")}
      </span>
    ),
  },
  {
    key: "notes",
    header: "Notes",
    cell: (tx) => (
      <span className="text-xs text-muted-foreground max-w-[200px] truncate block">
        {tx.notes || tx.txHash || "—"}
      </span>
    ),
  },
];

const investmentColumns: ResponsiveColumn<ClientInvestment>[] = [
  {
    key: "plan",
    header: "Plan",
    mobileTitle: true,
    cell: (inv) => <span className="font-medium">{inv.planName || "—"}</span>,
  },
  {
    key: "type",
    header: "Type",
    cell: (inv) => <span className="capitalize text-muted-foreground">{inv.type}</span>,
  },
  {
    key: "amount",
    header: "Amount",
    cell: (inv) => `${inv.currency} ${inv.amount.toLocaleString()}`,
  },
  {
    key: "profit",
    header: "Profit",
    cell: (inv) => (
      <span className="text-emerald-600 dark:text-emerald-400">
        +{inv.profit.toLocaleString()} ({inv.profitPercent}%)
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (inv) => <Badge className={statusBadge(inv.status)}>{inv.status}</Badge>,
  },
  {
    key: "started",
    header: "Started",
    cell: (inv) => (
      <span className="text-muted-foreground text-sm">{format(new Date(inv.createdAt), "MMM d, yyyy")}</span>
    ),
  },
];

const referralColumns: ResponsiveColumn<ClientReferralEarning>[] = [
  {
    key: "user",
    header: "Referred User",
    mobileTitle: true,
    cell: (r) => `User #${r.referredUserId}`,
  },
  {
    key: "amount",
    header: "Amount",
    cell: (r) => `${r.currency} ${r.amount.toLocaleString()}`,
  },
  {
    key: "status",
    header: "Status",
    cell: (r) => <Badge className={statusBadge(r.status)}>{r.status}</Badge>,
  },
  {
    key: "date",
    header: "Date",
    cell: (r) => (
      <span className="text-muted-foreground text-sm">{format(new Date(r.createdAt), "MMM d, yyyy")}</span>
    ),
  },
];

const roiPayoutColumns: ResponsiveColumn<ClientRoiPayout>[] = [
  {
    key: "plan",
    header: "Plan",
    mobileTitle: true,
    cell: (r) => r.planName || `Investment #${r.investmentId}`,
  },
  {
    key: "amount",
    header: "Amount",
    cell: (r) => <span className="text-emerald-600 dark:text-emerald-400">{fmt(r.amount)}</span>,
  },
  {
    key: "roi",
    header: "ROI %",
    cell: (r) => `${r.roiPercent}%`,
  },
  {
    key: "status",
    header: "Status",
    cell: (r) => <Badge className={statusBadge(r.status)}>{r.status}</Badge>,
  },
  {
    key: "date",
    header: "Date",
    cell: (r) => (
      <span className="text-muted-foreground text-sm">{format(new Date(r.createdAt), "MMM d, yyyy")}</span>
    ),
  },
];

const ledgerColumns: ResponsiveColumn<ClientLedgerEntry>[] = [
  {
    key: "type",
    header: "Type",
    mobileTitle: true,
    cell: (l) => <span className="capitalize">{l.type}</span>,
  },
  {
    key: "amount",
    header: "Amount",
    cell: (l) => (
      <span className={l.amount >= 0 ? "text-green-700 dark:text-green-400" : "text-red-400"}>
        {l.currency} {l.amount.toLocaleString()}
      </span>
    ),
  },
  {
    key: "wallet",
    header: "Wallet",
    cell: (l) => <span className="capitalize text-muted-foreground">{l.walletType}</span>,
  },
  {
    key: "balanceAfter",
    header: "Balance After",
    cell: (l) => l.balanceAfter.toLocaleString(),
  },
  {
    key: "description",
    header: "Description",
    cell: (l) => (
      <span className="text-xs text-muted-foreground max-w-[180px] truncate block">{l.description || "—"}</span>
    ),
  },
  {
    key: "date",
    header: "Date",
    cell: (l) => (
      <span className="text-muted-foreground text-sm">{format(new Date(l.createdAt), "MMM d, HH:mm")}</span>
    ),
  },
];

export default function ManagerClientDetail() {
  const [, params] = useRoute("/manager/clients/:id");
  const clientId = params?.id ? Number(params.id) : 0;
  const { data, isLoading, error } = useManagerClientDetail(clientId);
  const [detailOpen, setDetailOpen] = useState(false);

  if (isLoading) {
    return (
      <div className={STAFF_PAGE_STACK}>
          <Skeleton className="h-10 w-64" />
          <div className={STAFF_STAT_GRID}>
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
    <div className={STAFF_PAGE_STACK}>
        <div className={STAFF_HEADER_ROW}>
          <div className="min-w-0">
            <Link href="/manager/clients">
              <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Clients
              </Button>
            </Link>
            <h1 className="page-title text-primary">{user.fullName}</h1>
            <p className="page-subtitle">{user.email} · ID #{user.id}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" /> Read-only — report issues to Super Admin for KYC/transaction approval
            </p>
          </div>
          <div className="flex flex-col xs:flex-row flex-wrap items-stretch xs:items-center gap-2 shrink-0">
            <Button variant="outline" className="gap-2" onClick={() => setDetailOpen(true)}>
              <Eye className="h-4 w-4" /> Full profile
            </Button>
            <StaffReportDialog role="manager" subjectUserId={clientId} subjectUserName={user.fullName} />
            <Badge className={statusBadge(user.kycStatus)}>{user.kycStatus.toUpperCase()} KYC</Badge>
          </div>
        </div>

        <div className={STAFF_STAT_GRID}>
          {[
            { label: "Wallet Balance", value: fmt(summary.balanceFiat), icon: Wallet, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Total Deposits", value: fmt(summary.totalDeposits), icon: ArrowDownLeft, color: "text-green-700 dark:text-green-400" },
            { label: "Total Withdrawals", value: fmt(summary.totalWithdrawals), icon: ArrowUpRight, color: "text-red-400" },
            { label: "Total Profit", value: fmt(summary.totalProfit), icon: TrendingUp, color: "text-amber-600 dark:text-amber-400" },
            { label: "Investment Value", value: fmt(summary.investmentTotal), icon: TrendingUp, color: "text-blue-600 dark:text-blue-400" },
            { label: "Referral Earnings", value: fmt(summary.referralEarnings), icon: Wallet, color: "text-purple-600 dark:text-purple-400" },
          ].map(s => (
            <KpiStatCard
              key={s.label}
              compact
              label={s.label}
              value={s.value}
              icon={<s.icon className={`h-4 w-4 ${s.color}`} />}
            />
          ))}
        </div>

        {(summary.pendingDeposits > 0 || summary.pendingWithdrawals > 0) && (
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4 flex gap-6 flex-wrap text-sm">
              {summary.pendingDeposits > 0 && (
                <span className="text-amber-600 dark:text-amber-400">Pending deposits: {fmt(summary.pendingDeposits)}</span>
              )}
              {summary.pendingWithdrawals > 0 && (
                <span className="text-orange-600 dark:text-orange-400">Pending withdrawals: {fmt(summary.pendingWithdrawals)}</span>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="transactions">
          <TabsList className={TAB_LIST_MOBILE_SCROLL} data-colorful-tabs>
            <TabsTrigger value="transactions">Transactions ({transactions.length})</TabsTrigger>
            <TabsTrigger value="kyc">KYC Details</TabsTrigger>
            <TabsTrigger value="investments">Investments ({investments.length})</TabsTrigger>
            <TabsTrigger value="earnings">Earnings & Ledger</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="mt-4">
            <Card className={STAFF_CARD}>
              <CardHeader>
                <CardTitle className="text-base">All Transactions</CardTitle>
                <CardDescription>Deposits, withdrawals, and payment history</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">No transactions yet.</p>
                ) : (
                  <ResponsiveDataView
                    className={STAFF_TABLE_WRAP}
                    columns={transactionColumns}
                    data={transactions as ClientTransaction[]}
                    rowKey={(tx) => tx.id}
                    rowClassName="border-border dark:border-white/10"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kyc" className="mt-4">
            <Card className={STAFF_CARD}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-teal-600 dark:text-teal-400" /> KYC Verification
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!kyc ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">No KYC submission on file.</p>
                ) : (
                  <div className={STAFF_PAGE_STACK}>
                    <div className="flex items-center gap-3">
                      <Badge className={statusBadge(kyc.status)}>{kyc.status.toUpperCase()}</Badge>
                      {kyc.rejectionReason && (
                        <span className="text-sm text-red-400">Reason: {kyc.rejectionReason}</span>
                      )}
                    </div>
                    <div className={STAFF_FORM_GRID}>
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
            <Card className={STAFF_CARD}>
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
                  <ResponsiveDataView
                    className={STAFF_TABLE_WRAP}
                    columns={investmentColumns}
                    data={investments as ClientInvestment[]}
                    rowKey={(inv) => inv.id}
                    rowClassName="border-border dark:border-white/10"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings" className="mt-4 space-y-4">
            <div className={STAFF_STAT_GRID}>
              {[
                { label: "Trading Profit", value: fmt(summary.totalProfit) },
                { label: "Investment Profit", value: fmt(summary.investmentProfit) },
                { label: "ROI Payouts", value: fmt(summary.roiTotal) },
                { label: "Referral Paid", value: fmt(summary.referralPaid) },
              ].map(s => (
                <KpiStatCard key={s.label} compact label={s.label} value={s.value} />
              ))}
            </div>

            {referralEarnings.length > 0 && (
              <Card className={STAFF_CARD}>
                <CardHeader><CardTitle className="text-base">Referral Earnings</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveDataView
                    className={STAFF_TABLE_WRAP}
                    columns={referralColumns}
                    data={referralEarnings as ClientReferralEarning[]}
                    rowKey={(r) => r.id}
                    rowClassName="border-border dark:border-white/10"
                  />
                </CardContent>
              </Card>
            )}

            {roiPayouts.length > 0 && (
              <Card className={STAFF_CARD}>
                <CardHeader><CardTitle className="text-base">ROI Payouts</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveDataView
                    className={STAFF_TABLE_WRAP}
                    columns={roiPayoutColumns}
                    data={roiPayouts as ClientRoiPayout[]}
                    rowKey={(r) => r.id}
                    rowClassName="border-border dark:border-white/10"
                  />
                </CardContent>
              </Card>
            )}

            <Card className={STAFF_CARD}>
              <CardHeader>
                <CardTitle className="text-base">Wallet Ledger</CardTitle>
                <CardDescription>Complete balance movement history</CardDescription>
              </CardHeader>
              <CardContent>
                {walletLedger.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">No ledger entries yet.</p>
                ) : (
                  <ResponsiveDataView
                    className={STAFF_TABLE_WRAP}
                    columns={ledgerColumns}
                    data={walletLedger as ClientLedgerEntry[]}
                    rowKey={(l) => l.id}
                    rowClassName="border-border dark:border-white/10"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <UserFullDetailSheet
          userId={clientId}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          apiBase="/manager"
          readOnly
        />
      </div>
);
}
