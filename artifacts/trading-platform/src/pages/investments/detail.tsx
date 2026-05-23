import { useRoute } from "wouter";
import { useGetInvestment, useWithdrawInvestment } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function InvestmentDetail() {
  const [, params] = useRoute("/investments/:id");
  const id = params?.id ? Number(params.id) : 0;
  
  const { data: investment, isLoading, refetch } = useGetInvestment(id, { 
    query: { enabled: !!id, queryKey: ['getInvestment', id] } 
  });
  
  const withdrawMutation = useWithdrawInvestment();
  const { toast } = useToast();

  const handleWithdraw = () => {
    withdrawMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Withdrawal successful", description: "Funds have been moved to your balance." });
          refetch();
        },
        onError: () => {
          toast({ title: "Withdrawal failed", variant: "destructive" });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          <Skeleton className="h-12 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!investment) {
    return (
      <AppLayout>
        <div className="text-center py-12">Investment not found</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight">{investment.planName}</h1>
              <Badge variant={investment.status === "active" ? "default" : "secondary"}>
                {investment.status}
              </Badge>
              <Badge variant="outline" className="uppercase">{investment.type}</Badge>
            </div>
            <p className="text-muted-foreground">Created on {new Date(investment.createdAt).toLocaleDateString()}</p>
          </div>
          
          <Button 
            variant="destructive" 
            disabled={investment.status !== "active" && investment.status !== "completed" || withdrawMutation.isPending}
            onClick={handleWithdraw}
          >
            {withdrawMutation.isPending ? "Processing..." : "Withdraw Funds"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Capital</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {investment.amount} <span className="text-xl text-muted-foreground">{investment.currency}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Total Return</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-bold ${investment.profit > 0 ? "text-green-500" : investment.profit < 0 ? "text-red-500" : ""}`}>
                {investment.profit > 0 ? "+" : ""}{investment.profit} <span className="text-xl text-muted-foreground">{investment.currency}</span>
              </div>
              <p className="text-muted-foreground mt-2">
                {investment.profitPercent ? `${investment.profitPercent}% ROI` : "0% ROI"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <div className="flex flex-col pb-2 border-b border-border/50">
                <dt className="text-muted-foreground mb-1">Maturity Date</dt>
                <dd className="font-medium">{investment.maturityDate ? new Date(investment.maturityDate).toLocaleDateString() : "Open-ended"}</dd>
              </div>
              <div className="flex flex-col pb-2 border-b border-border/50">
                <dt className="text-muted-foreground mb-1">ID</dt>
                <dd className="font-medium font-mono text-xs">{investment.id}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
