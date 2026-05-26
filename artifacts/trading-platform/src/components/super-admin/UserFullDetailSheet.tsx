import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, RefreshCw } from "lucide-react";
import { staffFetch } from "@/lib/staff-api";
import { format } from "date-fns";

export type UserFullDetail = {
  user: {
    id: number; email: string; fullName: string; phone: string | null; role: string;
    kycStatus: string; balanceFiat: number; balanceCrypto: number; totalProfit: number;
    referralCode: string | null; referralCount: number; referralEarnings: number;
    managerId: number | null; isActive: boolean; isPromoter?: boolean;
    twoFactorEnabled: boolean; createdAt: string;
  };
  profile: {
    username: string | null; investorId: string | null; dateOfBirth: string | null;
    gender: string | null; nationality: string | null; country: string | null;
    state: string | null; city: string | null; address: string | null; postalCode: string | null;
    taxId: string | null; occupation: string | null; annualIncomeRange: string | null;
    investmentExperience: string | null; riskAppetite: string | null;
    preferredInvestmentType: string | null; sourceOfFunds: string | null;
    tradingInterests: string[]; cryptoWallets: Record<string, string>;
    banking: Record<string, string | null> | null;
    onboardingCompletedAt: string | null;
  } | null;
  manager: { id: number; fullName: string; email: string } | null;
  referrer: { id: number; fullName: string; referralCode: string | null } | null;
  kyc: Record<string, unknown> | null;
  kycRecords: Record<string, unknown>[];
  paymentAccounts: Array<Record<string, unknown>>;
  mt5Accounts: Array<Record<string, unknown>>;
  mt5Requests: Array<Record<string, unknown>>;
  summary: Record<string, number>;
  recentTransactions: Array<Record<string, unknown>>;
  recentInvestments: Array<Record<string, unknown>>;
};

interface UserFullDetailSheetProps {
  userId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiBase?: "/super-admin" | "/admin";
  defaultTab?: "overview" | "profile" | "kyc" | "banking" | "trading" | "activity";
  onEdit?: (userId: number) => void;
}

export function UserFullDetailSheet({
  userId, open, onOpenChange, apiBase = "/super-admin", defaultTab = "overview", onEdit,
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
      const data = await staffFetch<UserFullDetail>(`${apiBase}/users/${userId}/full`);
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
  }, [open, userId, defaultTab]);

  const u = detail?.user;
  const p = detail?.profile;
  const kyc = detail?.kyc as Record<string, any> | null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl bg-[#050A14] border-white/10 p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="flex items-center gap-2 flex-wrap text-left">
                {loading ? "Loading..." : u?.fullName || "User Details"}
                {u && <Badge variant="outline" className="capitalize">{u.role}</Badge>}
                {u && (
                  u.isActive
                    ? <Badge className="bg-green-500/20 text-green-400 text-xs">Active</Badge>
                    : <Badge className="bg-red-500/20 text-red-400 text-xs">Inactive</Badge>
                )}
              </SheetTitle>
              <SheetDescription className="text-left truncate">
                {u ? `${u.email} · ID #${u.id}` : error || " "}
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
              <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="kyc">KYC</TabsTrigger>
                <TabsTrigger value="banking">Banking</TabsTrigger>
                <TabsTrigger value="trading">Trading</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-0">
                <Section title="Account">
                  <Row label="Full Name" value={u.fullName} />
                  <Row label="Email" value={u.email} />
                  <Row label="Phone" value={u.phone} />
                  <Row label="Investor ID" value={p?.investorId} />
                  <Row label="Username" value={p?.username} />
                  <Row label="KYC Status" value={u.kycStatus} capitalize />
                  <Row label="2FA" value={u.twoFactorEnabled ? "Enabled" : "Disabled"} />
                  <Row label="Joined" value={format(new Date(u.createdAt), "PPpp")} />
                  <Row label="Onboarding" value={p?.onboardingCompletedAt ? format(new Date(p.onboardingCompletedAt), "PP") : null} />
                </Section>
                {detail.manager && (
                  <Section title="Assigned Manager">
                    <Row label="Name" value={detail.manager.fullName} />
                    <Row label="Email" value={detail.manager.email} />
                  </Section>
                )}
                {detail.referrer && (
                  <Section title="Referred By">
                    <Row label="Name" value={detail.referrer.fullName} />
                    <Row label="Code" value={detail.referrer.referralCode} />
                  </Section>
                )}
                <Section title="Wallet Summary">
                  <Row label="Fiat Balance" value={`$${detail.summary.balanceFiat?.toFixed(2)}`} />
                  <Row label="Crypto Balance" value={String(detail.summary.balanceCrypto)} />
                  <Row label="Total Profit" value={`$${detail.summary.totalProfit?.toFixed(2)}`} />
                  <Row label="Referral Code" value={u.referralCode} />
                  <Row label="Referrals" value={String(u.referralCount)} />
                  <Row label="Referral Earnings" value={`$${u.referralEarnings?.toFixed(2)}`} />
                </Section>
              </TabsContent>

              <TabsContent value="profile" className="space-y-4 mt-0">
                <Section title="Personal">
                  <Row label="Date of Birth" value={p?.dateOfBirth} />
                  <Row label="Gender" value={p?.gender} capitalize />
                  <Row label="Nationality" value={p?.nationality} />
                  <Row label="Occupation" value={p?.occupation} />
                </Section>
                <Section title="Address">
                  <Row label="Country" value={p?.country} />
                  <Row label="State" value={p?.state} />
                  <Row label="City" value={p?.city} />
                  <Row label="Address" value={p?.address} />
                  <Row label="Postal Code" value={p?.postalCode} />
                </Section>
                <Section title="Financial Profile">
                  <Row label="Annual Income" value={p?.annualIncomeRange} />
                  <Row label="Experience" value={p?.investmentExperience} capitalize />
                  <Row label="Risk Appetite" value={p?.riskAppetite} />
                  <Row label="Preferred Type" value={p?.preferredInvestmentType} capitalize />
                  <Row label="Source of Funds" value={p?.sourceOfFunds} capitalize />
                  <Row label="Trading Interests" value={p?.tradingInterests?.length ? p.tradingInterests.join(", ") : null} />
                </Section>
                {p?.cryptoWallets && Object.keys(p.cryptoWallets).length > 0 && (
                  <Section title="Crypto Wallets (Profile)">
                    {Object.entries(p.cryptoWallets).map(([k, v]) => (
                      v ? <Row key={k} label={k.toUpperCase()} value={v} mono /> : null
                    ))}
                  </Section>
                )}
              </TabsContent>

              <TabsContent value="kyc" className="space-y-4 mt-0">
                {!kyc ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No KYC submission on file.</p>
                ) : (
                  <>
                    <Section title="Identity">
                      <Row label="Status" value={kyc.status} capitalize />
                      <Row label="Legal Name" value={kyc.fullName} />
                      <Row label="Country" value={kyc.country} />
                      <Row label="Address" value={kyc.address} />
                      <Row label="ID Type" value={kyc.idType} capitalize />
                      <Row label="ID Number" value={kyc.idNumber} mono />
                      <Row label="PAN" value={kyc.panCard} mono />
                      <Row label="Aadhaar" value={kyc.aadhaarNumber} mono />
                      <Row label="Tax ID" value={kyc.taxId} mono />
                      <Row label="Submitted" value={kyc.createdAt ? format(new Date(kyc.createdAt), "PPpp") : null} />
                      {kyc.rejectionReason && <Row label="Rejection Reason" value={kyc.rejectionReason} />}
                    </Section>
                    <Section title="Documents">
                      <DocLink label="ID Document" url={kyc.idDocumentUrl} />
                      <DocLink label="PAN Document" url={kyc.panDocumentUrl} />
                      <DocLink label="Aadhaar Front" url={kyc.aadhaarFrontUrl} />
                      <DocLink label="Aadhaar Back" url={kyc.aadhaarBackUrl} />
                      <DocLink label="Passport" url={kyc.passportDocumentUrl} />
                      <DocLink label="Address Proof" url={kyc.addressProofUrl} />
                      <DocLink label="Selfie" url={kyc.selfieUrl} />
                      <DocLink label="Signature" url={kyc.signatureUrl} />
                      <DocLink label="Cancelled Cheque" url={kyc.cancelledChequeUrl} />
                    </Section>
                    {detail.kycRecords.length > 1 && (
                      <Section title="KYC History">
                        {detail.kycRecords.slice(1).map((r: any) => (
                          <Row key={r.id} label={`Record #${r.id}`} value={`${r.status} · ${format(new Date(r.createdAt), "dd MMM yyyy")}`} capitalize />
                        ))}
                      </Section>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="banking" className="space-y-4 mt-0">
                <Section title="KYC Banking">
                  <Row label="Bank Name" value={kyc?.bankName} />
                  <Row label="Account" value={kyc?.bankAccountNumber} mono />
                  <Row label="IFSC" value={kyc?.ifscCode} mono />
                  <Row label="Branch" value={kyc?.branchName} />
                  <Row label="UPI ID" value={kyc?.upiId} mono />
                </Section>
                {p?.banking && (
                  <Section title="Onboarding Banking">
                    <Row label="Account Holder" value={p.banking.accountHolderName} />
                    <Row label="Bank Name" value={p.banking.bankName} />
                    <Row label="Account Number" value={p.banking.accountNumber} mono />
                    <Row label="IFSC" value={p.banking.ifscCode} mono />
                    <Row label="Branch" value={p.banking.branchName} />
                    <Row label="UPI" value={p.banking.upiId} mono />
                  </Section>
                )}
                {detail.paymentAccounts.length > 0 ? (
                  <Section title="Payment Accounts">
                    {detail.paymentAccounts.map((a: any) => (
                      <div key={a.id} className="px-3 py-2 border-b border-white/5 last:border-0">
                        <p className="text-xs font-medium text-amber-400/90">{a.label} · {a.accountType}</p>
                        {a.accountHolderName && <p className="text-xs text-muted-foreground mt-1">{a.accountHolderName}</p>}
                        {a.bankName && <Row label="Bank" value={a.bankName} compact />}
                        {a.accountNumber && <Row label="Account" value={a.accountNumber} mono compact />}
                        {a.ifscCode && <Row label="IFSC" value={a.ifscCode} mono compact />}
                        {a.upiId && <Row label="UPI" value={a.upiId} mono compact />}
                        {a.walletAddress && <Row label={`${a.cryptoSymbol || "Crypto"} Wallet`} value={a.walletAddress} mono compact />}
                      </div>
                    ))}
                  </Section>
                ) : (
                  <p className="text-sm text-muted-foreground">No payment accounts saved.</p>
                )}
              </TabsContent>

              <TabsContent value="trading" className="space-y-4 mt-0">
                {detail.mt5Accounts.length > 0 ? (
                  <Section title="Linked MT Accounts">
                    {detail.mt5Accounts.map((a: any) => (
                      <div key={a.id} className="px-3 py-2 border-b border-white/5 last:border-0">
                        <p className="text-sm font-medium">{a.platform?.toUpperCase()} · #{a.accountNumber}</p>
                        <Row label="Broker" value={a.broker} compact />
                        <Row label="Server" value={a.serverName} compact />
                        <Row label="Status" value={a.status} capitalize compact />
                        <Row label="Balance" value={a.balance != null ? `$${Number(a.balance).toFixed(2)}` : null} compact />
                      </div>
                    ))}
                  </Section>
                ) : (
                  <p className="text-sm text-muted-foreground">No linked MT4/MT5 accounts.</p>
                )}
                {detail.mt5Requests.length > 0 && (
                  <Section title="MT Requests">
                    {detail.mt5Requests.map((r: any) => (
                      <Row
                        key={r.id}
                        label={`${r.type?.replace(/_/g, " ")} · ${r.status}`}
                        value={r.details || format(new Date(r.createdAt), "dd MMM yyyy")}
                        capitalize
                      />
                    ))}
                  </Section>
                )}
              </TabsContent>

              <TabsContent value="activity" className="space-y-4 mt-0">
                {detail.recentTransactions.length > 0 ? (
                  <Section title="Recent Transactions">
                    {detail.recentTransactions.map((t: any) => (
                      <Row
                        key={t.id}
                        label={`${t.type} · ${t.status}`}
                        value={`${t.currency} ${Number(t.amount).toFixed(2)} · ${format(new Date(t.createdAt), "dd MMM")}`}
                        capitalize
                      />
                    ))}
                  </Section>
                ) : (
                  <p className="text-sm text-muted-foreground">No transactions yet.</p>
                )}
                {detail.recentInvestments.length > 0 && (
                  <Section title="Recent Investments">
                    {detail.recentInvestments.map((i: any) => (
                      <Row
                        key={i.id}
                        label={i.planName || i.type}
                        value={`${i.currency} ${Number(i.amount).toFixed(2)} · ${i.status}`}
                        capitalize
                      />
                    ))}
                  </Section>
                )}
              </TabsContent>
            </Tabs>
          ) : null}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</h4>
      <div className="rounded-lg border border-white/10 bg-white/[0.02] divide-y divide-white/5">
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

function DocLink({ label, url }: { label: string; url?: string | null }) {
  if (!url) {
    return <Row label={label} value="Not uploaded" />;
  }
  return (
    <div className="flex justify-between items-center px-3 py-2.5 text-sm gap-4">
      <span className="text-muted-foreground">{label}</span>
      <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
        <a href={url} target="_blank" rel="noopener noreferrer">
          View <ExternalLink className="h-3 w-3 ml-1" />
        </a>
      </Button>
    </div>
  );
}
