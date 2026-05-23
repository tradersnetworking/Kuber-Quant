import { useListAlgoStrategies, useSubscribeAlgoStrategy } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function AlgoTradingPage() {
  const { data: strategies, isLoading } = useListAlgoStrategies();
  const subscribeMutation = useSubscribeAlgoStrategy();
  const { toast } = useToast();

  const handleSubscribe = (id: number) => {
    // In a real app we might want to prompt for amount
    subscribeMutation.mutate(
      { id, data: { amount: 1000, currency: "USD" } },
      {
        onSuccess: () => {
          toast({ title: "Subscribed successfully", description: "Your investment has been placed." });
        },
        onError: () => {
          toast({ title: "Subscription failed", description: "Please check your balance and try again.", variant: "destructive" });
        }
      }
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
            Algo Trading
          </h1>
          <p className="text-muted-foreground">Subscribe to high-performance algorithmic strategies.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full" />)}
          </div>
        ) : strategies?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {strategies.map(strategy => (
              <Card key={strategy.id} className="flex flex-col h-full bg-white/5 backdrop-blur-sm border-white/10 hover:border-amber-500/50 transition-colors">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <Badge className={
                      strategy.riskLevel === "low" ? "bg-blue-500" : 
                      strategy.riskLevel === "high" ? "bg-red-500" : "bg-amber-500"
                    }>
                      {strategy.riskLevel} risk
                    </Badge>
                    <Badge variant="outline" className="border-amber-500/30 text-amber-500 capitalize">{strategy.status}</Badge>
                  </div>
                  <CardTitle className="text-xl font-bold">{strategy.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{strategy.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="p-2 rounded bg-black/50 border border-white/5">
                      <p className="text-xs text-muted-foreground uppercase">Historical ROI</p>
                      <p className="text-lg font-bold text-green-500">+{strategy.roi}%</p>
                    </div>
                    <div className="p-2 rounded bg-black/50 border border-white/5">
                      <p className="text-xs text-muted-foreground uppercase">Subscribers</p>
                      <p className="text-lg font-bold text-amber-500">{strategy.subscribers.toLocaleString()}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Min Investment</p>
                      <p className="text-sm font-medium text-amber-500">{strategy.minInvestment} {strategy.currency}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold" 
                    onClick={() => handleSubscribe(strategy.id)}
                    disabled={strategy.status !== "active" || subscribeMutation.isPending}
                  >
                    {subscribeMutation.isPending ? "Subscribing..." : "Subscribe Now"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">No strategies available at the moment.</div>
        )}
      </div>
    </AppLayout>
  );
}
