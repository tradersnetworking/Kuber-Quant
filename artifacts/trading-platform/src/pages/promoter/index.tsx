import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, QrCode, Users, DollarSign, TrendingUp, Wallet, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authFetchJson } from "@/lib/token-store";
import { format } from "date-fns";
import { formatActivityTime } from "@/lib/format-activity-time";

export default function PromoterDashboard() {
  const { toast } = useToast();
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["/api/promoter/dashboard"],
    queryFn: () => authFetchJson<any>("/promoter/dashboard"),
  });

  const copyLink = () => {
    if (data?.referralLink) {
      navigator.clipboard.writeText(data.referralLink);
      toast({ title: "Referral link copied" });
    }
  };

  const handleWithdraw = async () => {
    try {
      await authFetchJson("/promoter/commission-withdraw", {
        method: "POST",
        body: JSON.stringify({ amount: Number(withdrawAmount), currency: "USD" }),
      });
      toast({ title: "Withdrawal requested" });
      setWithdrawAmount("");
      refetch();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-64" /></div>
);
  }

  if (isError) {
    const message = error instanceof Error ? error.message : "Failed to load promoter dashboard";
    const forbidden = message.includes("(403)");
    return (
      <Card className="border-red-500/30 bg-red-500/10 max-w-lg">
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {forbidden
                ? "Promoter access is not enabled on your account. Contact support if you believe this is an error."
                : message}
            </p>
            {!forbidden && (
              <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
            )}
          </CardContent>
        </Card>
);
  }

  const stats = [
    { label: "Total Referrals", value: data?.totalReferrals ?? 0, icon: Users, color: "text-blue-400" },
    { label: "Active Investors", value: data?.activeInvestors ?? 0, icon: TrendingUp, color: "text-green-400" },
    { label: "Commission Earned", value: `$${(data?.commissionEarned ?? 0).toLocaleString()}`, icon: DollarSign, color: "text-amber-400" },
    { label: "Pending", value: `$${(data?.pendingCommissions ?? 0).toLocaleString()}`, icon: Wallet, color: "text-orange-400" },
  ];

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
            Promoter Dashboard
          </h1>
          <p className="text-muted-foreground">
            Affiliate program · {data?.commissionType?.replace("_", " ") || "Revenue share"} commission
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => (
            <Card key={s.label} className="border-white/10 bg-white/5">
              <CardContent className="p-4">
                <s.icon className={`h-5 w-5 mb-2 ${s.color}`} />
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><QrCode className="h-5 w-5 text-amber-400" /> Referral Link</CardTitle>
              <CardDescription>Share with investors to earn commissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input readOnly value={data?.referralLink || ""} className="bg-white/5 border-white/10 text-sm" />
                <Button onClick={copyLink} variant="outline" className="shrink-0"><Copy className="h-4 w-4" /></Button>
              </div>
              <p className="text-xs text-muted-foreground">Code: <span className="font-mono text-amber-400">{data?.referralCode}</span></p>
              <p className="text-xs text-muted-foreground">Conversion rate: {data?.conversionRate ?? 0}%</p>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader><CardTitle className="text-base">Commission Withdrawal</CardTitle></CardHeader>
            <CardContent className="flex gap-2">
              <Input type="number" placeholder="Amount" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="bg-white/5 border-white/10" />
              <Button onClick={handleWithdraw} className="bg-amber-500 text-black shrink-0">Withdraw</Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-white/10 bg-white/5">
          <CardHeader><CardTitle className="text-base">Team / Downline ({data?.team?.length ?? 0})</CardTitle></CardHeader>
          <CardContent>
            {!data?.team?.length ? (
              <p className="text-center py-8 text-muted-foreground text-sm">No referrals yet — share your link to grow your team.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>KYC</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.team.map((m: any) => (
                    <TableRow key={m.id} className="border-white/10">
                      <TableCell className="font-medium">{m.fullName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{m.email}</TableCell>
                      <TableCell className="text-emerald-400">${m.balanceFiat}</TableCell>
                      <TableCell><Badge variant="outline">{m.kycStatus}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {m.joinedAt ? formatActivityTime(m.joinedAt) || format(new Date(m.joinedAt), "MMM d, yyyy") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
);
}
