import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import * as ApiHooks from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { 
  Wallet, 
  ShieldCheck, 
  User as UserIcon, 
  ArrowRightLeft, 
  History,
  UserPlus
} from "lucide-react";
import { UserPayoutAccountsCard } from "@/components/account/UserPayoutAccountsCard";

export default function AdminUserDetail() {
  const [, params] = useRoute("/admin/users/:id");
  const id = params?.id ? Number(params.id) : 0;
  
  const { data: user, isLoading, refetch } = ApiHooks.useGetAdminUser(id, { 
    query: { enabled: !!id, queryKey: ['getAdminUser', id] } 
  });

  const { data: allUsers } = ApiHooks.useListAdminUsers();
  const managers = (allUsers as any[])?.filter(u => u.role === 'manager' || u.role === 'admin') || [];
  
  const updateMutation = ApiHooks.useUpdateAdminUser();
  const useAdminWalletAdjust = (ApiHooks as any).useAdminWalletAdjust;
  const adjustWalletMutation = useAdminWalletAdjust ? useAdminWalletAdjust() : { mutate: () => {}, isPending: false };
  const { toast } = useToast();

  const [role, setRole] = useState<string>("user");
  const [kycStatus, setKycStatus] = useState<string>("pending");
  const [managerId, setManagerId] = useState<number | null>(null);

  // Wallet Adjustment Form State
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustType, setAdjustType] = useState<"fiat" | "crypto">("fiat");
  const [adjustReason, setAdjustReason] = useState("");

  useEffect(() => {
    if (user) {
      setRole((user as any).role);
      setKycStatus((user as any).kycStatus);
      setManagerId((user as any).managerId || null);
    }
  }, [user]);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(
      { id, data: { role: role as any, kycStatus: kycStatus as any, managerId: managerId || undefined } as any },
      {
        onSuccess: () => {
          toast({ title: "User updated successfully" });
          refetch();
        },
        onError: () => {
          toast({ title: "Update failed", variant: "destructive" });
        }
      }
    );
  };

  const handleAdjustWallet = (e: React.FormEvent) => {
    e.preventDefault();
    adjustWalletMutation.mutate(
      { 
        data: { 
          userId: id,
          amount: Number(adjustAmount), 
          walletType: adjustType === 'fiat' ? 'fiat' : 'crypto',
          reason: adjustReason 
        } 
      },
      {
        onSuccess: () => {
          toast({ title: "Wallet adjusted successfully" });
          setAdjustAmount("");
          setAdjustReason("");
          refetch();
        },
        onError: () => {
          toast({ title: "Adjustment failed", variant: "destructive" });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
);
  }

  if (!user) {
    return (
      <div className="text-center py-12">User not found</div>
);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">{user.fullName}</h1>
              <Badge variant={user.role === 'admin' ? 'default' : (user as any).role === 'manager' ? 'secondary' : 'outline'} className="bg-amber-500/10 text-amber-500 border-amber-500/20 capitalize">
                {user.role}
              </Badge>
            </div>
            <p className="text-muted-foreground">{user.email} • ID: {user.id}</p>
          </div>
          <Badge variant={user.kycStatus === 'verified' ? 'default' : 'secondary'} className={user.kycStatus === 'verified' ? 'bg-green-500' : ''}>
            KYC: {user.kycStatus?.toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5 text-amber-500" />
                  <CardTitle>Permissions & Management</CardTitle>
                </div>
                <CardDescription>Adjust user role and assign managers</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label>User Role</Label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                      value={role} 
                      onChange={(e) => setRole(e.target.value as any)}
                    >
                      <option value="user">User</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>KYC Status</Label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                      value={kycStatus} 
                      onChange={(e) => setKycStatus(e.target.value as any)}
                    >
                      <option value="pending">Pending</option>
                      <option value="verified">Verified</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-amber-500" />
                      <Label>Assigned Manager</Label>
                    </div>
                    <select 
                      className="flex h-10 w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                      value={managerId || ""} 
                      onChange={(e) => setManagerId(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">No Manager Assigned</option>
                      {managers.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.fullName} ({m.role})</option>
                      ))}
                    </select>
                  </div>

                  <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Updating..." : "Update Permissions"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-amber-500" />
                  <CardTitle>Current Balances</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-black/50 border border-white/5">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Fiat Balance</p>
                  <p className="text-2xl font-bold">${user.balanceFiat?.toLocaleString() || '0.00'}</p>
                </div>
                <div className="p-4 rounded-lg bg-black/50 border border-white/5">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Crypto Balance</p>
                  <p className="text-2xl font-bold">₿{user.balanceCrypto?.toFixed(8) || '0.00000000'}</p>
                </div>
              </CardContent>
            </Card>

            <UserPayoutAccountsCard userId={id} />
          </div>

          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-amber-500" />
                <CardTitle>Wallet Adjustment</CardTitle>
              </div>
              <CardDescription>Manually add or subtract funds from user wallets</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdjustWallet} className="space-y-4">
                <div className="space-y-2">
                  <Label>Wallet Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      type="button"
                      variant={adjustType === 'fiat' ? 'default' : 'outline'}
                      className={adjustType === 'fiat' ? 'bg-amber-500 text-black' : 'border-white/10'}
                      onClick={() => setAdjustType('fiat')}
                    >
                      Fiat ($)
                    </Button>
                    <Button 
                      type="button"
                      variant={adjustType === 'crypto' ? 'default' : 'outline'}
                      className={adjustType === 'crypto' ? 'bg-amber-500 text-black' : 'border-white/10'}
                      onClick={() => setAdjustType('crypto')}
                    >
                      Crypto (₿)
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Amount (use negative for deduction)</Label>
                  <Input 
                    type="number" 
                    step={adjustType === 'fiat' ? '0.01' : '0.00000001'} 
                    placeholder="e.g. 500.00" 
                    className="bg-black/50 border-white/10"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Adjustment Reason</Label>
                  <Input 
                    placeholder="Bonus, Correction, etc." 
                    className="bg-black/50 border-white/10"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold" disabled={adjustWalletMutation.isPending}>
                  {adjustWalletMutation.isPending ? "Processing..." : "Apply Adjustment"}
                </Button>

                <div className="pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <History className="h-3 w-3" />
                    <span>RECENT ADJUSTMENTS</span>
                  </div>
                  <div className="text-xs text-center py-4 text-muted-foreground italic">
                    No recent manual adjustments
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
);
}

