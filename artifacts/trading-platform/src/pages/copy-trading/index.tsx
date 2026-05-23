import { useState } from "react";
import { useListCopyTraders, useFollowCopyTrader, useUnfollowCopyTrader } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CopyTradingPage() {
  const { data: traders, isLoading, refetch } = useListCopyTraders();
  const followMutation = useFollowCopyTrader();
  const unfollowMutation = useUnfollowCopyTrader();
  const { toast } = useToast();

  const [selectedTrader, setSelectedTrader] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleFollow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrader) return;
    
    followMutation.mutate(
      { id: selectedTrader, data: { amount: Number(amount), currency: "USD" } },
      {
        onSuccess: () => {
          toast({ title: "Following successful", description: "You are now copying this trader." });
          setIsDialogOpen(false);
          setAmount("");
          refetch();
        },
        onError: () => {
          toast({ title: "Action failed", variant: "destructive" });
        }
      }
    );
  };

  const handleUnfollow = (id: number) => {
    unfollowMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Unfollowed successfully" });
          refetch();
        }
      }
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
            Copy Trading
          </h1>
          <p className="text-muted-foreground">Follow top-performing traders and automatically copy their trades.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full" />)}
          </div>
        ) : traders?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {traders.map(trader => (
              <Card key={trader.id} className="flex flex-col h-full bg-white/5 backdrop-blur-sm border-white/10 hover:border-amber-500/50 transition-colors">
                <CardHeader>
                  <div className="flex justify-between items-start mb-4">
                    <Avatar className="h-12 w-12 border border-amber-500/20">
                      <AvatarImage src={trader.avatarUrl || undefined} />
                      <AvatarFallback className="bg-amber-500/10 text-amber-500">{trader.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Badge className={trader.riskLevel === "high" ? "bg-red-500" : trader.riskLevel === "low" ? "bg-blue-500" : "bg-amber-500"}>
                      {trader.riskLevel} Risk
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-bold">{trader.name}</CardTitle>
                  <p className="text-sm text-muted-foreground line-clamp-2">{trader.bio}</p>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-2 rounded bg-black/50 border border-white/5">
                      <p className="text-xs text-muted-foreground uppercase">Win Rate</p>
                      <p className="text-lg font-bold text-amber-500">{trader.winRate}%</p>
                    </div>
                    <div className="p-2 rounded bg-black/50 border border-white/5">
                      <p className="text-xs text-muted-foreground uppercase">Monthly ROI</p>
                      <p className="text-lg font-bold text-green-500">+{trader.monthlyRoi}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Followers</p>
                      <p className="text-sm font-medium">{trader.followers.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Min Investment</p>
                      <p className="text-sm font-medium text-amber-500">${trader.minInvestment}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  {trader.isFollowing ? (
                    <Button 
                      variant="outline" 
                      className="w-full border-white/10 text-white hover:bg-white/5" 
                      onClick={() => handleUnfollow(trader.id)}
                      disabled={unfollowMutation.isPending}
                    >
                      Unfollow
                    </Button>
                  ) : (
                    <Dialog open={isDialogOpen && selectedTrader === trader.id} onOpenChange={(open) => {
                      setIsDialogOpen(open);
                      if (open) setSelectedTrader(trader.id);
                    }}>
                      <DialogTrigger asChild>
                        <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold">Copy Trades</Button>
                      </DialogTrigger>
                      <DialogContent className="bg-[#050A14] border-white/10 text-white">
                        <DialogHeader>
                          <DialogTitle className="text-amber-500 text-2xl font-bold">Copy {trader.name}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleFollow} className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label className="text-muted-foreground uppercase text-xs tracking-wider">Investment Amount (USD)</Label>
                            <Input 
                              type="number" 
                              required 
                              min={trader.minInvestment || 0}
                              className="bg-black/50 border-white/10 focus:ring-amber-500 focus:border-amber-500"
                              value={amount} 
                              onChange={(e) => setAmount(e.target.value)} 
                            />
                            <p className="text-xs text-muted-foreground">Minimum requirement: <span className="text-amber-500">${trader.minInvestment}</span></p>
                          </div>
                          <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold" disabled={followMutation.isPending}>
                            {followMutation.isPending ? "Starting Copy..." : "Confirm & Start Copying"}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">No traders available to copy.</div>
        )}
      </div>
    </AppLayout>
  );
}
