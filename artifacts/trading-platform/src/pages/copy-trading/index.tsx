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
import { Slider } from "@/components/ui/slider";
import { TrendingUp, Users, Zap, Info } from "lucide-react";

export default function CopyTradingPage() {
  const { data: traders, isLoading, refetch } = useListCopyTraders();
  const followMutation = useFollowCopyTrader();
  const unfollowMutation = useUnfollowCopyTrader();
  const { toast } = useToast();

  const [selectedTrader, setSelectedTrader] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [profitShare, setProfitShare] = useState(20);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleFollow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrader) return;
    
    followMutation.mutate(
      { id: selectedTrader, data: { amount: Number(amount), currency: "USD" } },
      {
        onSuccess: () => {
          toast({ title: "Following successful", description: "You are now copying this trader's strategies." });
          setIsDialogOpen(false);
          setAmount("");
          setProfitShare(20);
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
          <p className="text-muted-foreground">Follow top-performing traders and automatically mirror their trades in real time.</p>
        </div>

        {/* How it Works */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Users, title: "Choose a Trader", desc: "Browse vetted expert traders with verified track records.", color: "text-blue-400" },
            { icon: Zap, title: "Set Profit Sharing", desc: "Agree on a profit-sharing percentage — only pay when you profit.", color: "text-amber-400" },
            { icon: TrendingUp, title: "Mirror Automatically", desc: "Trades are copied to your MT5 account in real time, 24/5.", color: "text-green-400" },
          ].map(({ icon: Icon, title, desc, color }) => (
            <Card key={title} className="bg-white/5 border-white/10">
              <CardContent className="p-4 flex gap-3 items-start">
                <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${color}`} />
                <div>
                  <p className="font-semibold text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
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
                    <Badge className={trader.riskLevel === "high" ? "bg-red-500/20 text-red-400" : trader.riskLevel === "low" ? "bg-blue-500/20 text-blue-400" : "bg-amber-500/20 text-amber-400"}>
                      {trader.riskLevel} Risk
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-bold">{trader.name}</CardTitle>
                  <p className="text-sm text-muted-foreground line-clamp-2">{trader.bio}</p>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="grid grid-cols-2 gap-3">
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
                    <div className="w-full space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" /> Copying Active</span>
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full border-white/10 text-white hover:bg-white/5" 
                        onClick={() => handleUnfollow(trader.id)}
                        disabled={unfollowMutation.isPending}
                      >
                        Stop Copying
                      </Button>
                    </div>
                  ) : (
                    <Dialog open={isDialogOpen && selectedTrader === trader.id} onOpenChange={(open) => {
                      setIsDialogOpen(open);
                      if (open) setSelectedTrader(trader.id);
                    }}>
                      <DialogTrigger asChild>
                        <Button className="w-full bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-semibold hover:opacity-90">Copy Trades</Button>
                      </DialogTrigger>
                      <DialogContent className="bg-[#050A14] border-white/10 text-white max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-amber-500 text-xl font-bold">Copy {trader.name}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleFollow} className="space-y-5 pt-2">
                          <div className="space-y-2">
                            <Label className="text-muted-foreground uppercase text-xs tracking-wider">Investment Amount (USD)</Label>
                            <Input 
                              type="number" 
                              required 
                              min={trader.minInvestment || 0}
                              placeholder={`Min $${trader.minInvestment}`}
                              className="bg-black/50 border-white/10 focus:ring-amber-500 focus:border-amber-500"
                              value={amount} 
                              onChange={(e) => setAmount(e.target.value)} 
                            />
                            <p className="text-xs text-muted-foreground">Minimum: <span className="text-amber-500">${trader.minInvestment}</span></p>
                          </div>

                          {/* Profit Sharing */}
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <Label className="text-muted-foreground uppercase text-xs tracking-wider">Profit Sharing</Label>
                              <span className="text-xl font-bold text-amber-400">{profitShare}%</span>
                            </div>
                            <Slider
                              value={[profitShare]}
                              onValueChange={([v]) => setProfitShare(v)}
                              min={10} max={40} step={5}
                              className="[&>span]:bg-amber-500"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>10%</span>
                              <span>40%</span>
                            </div>

                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 space-y-1.5">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Info className="h-3.5 w-3.5 text-amber-400" />
                                <p className="text-xs text-amber-300 font-medium">Profit Sharing Model</p>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">You keep</span>
                                <span className="text-green-400 font-semibold">{100 - profitShare}% of profits</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Trader earns</span>
                                <span className="text-amber-400 font-semibold">{profitShare}% of profits</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground pt-1">You only pay when you profit. No upfront fees.</p>
                            </div>
                          </div>

                          <Button type="submit" className="w-full bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold h-11" disabled={followMutation.isPending}>
                            {followMutation.isPending ? "Starting..." : "Confirm & Start Copying"}
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
          <div className="text-center py-12 text-muted-foreground">No traders available. Check back soon.</div>
        )}
      </div>
    </AppLayout>
  );
}
