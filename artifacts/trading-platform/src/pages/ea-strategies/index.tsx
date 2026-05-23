import { useState } from "react";
import { useListEAStrategies, useCreateEAStrategy, useActivateEAStrategy } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function EAStrategiesPage() {
  const { data: strategies, isLoading, refetch } = useListEAStrategies();
  const createMutation = useCreateEAStrategy();
  const activateMutation = useActivateEAStrategy();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"scalping"|"swing"|"trend"|"grid"|"arbitrage">("scalping");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      { data: { name, description, type, isPublic: false } },
      {
        onSuccess: () => {
          toast({ title: "EA Strategy created successfully" });
          setIsDialogOpen(false);
          setName("");
          setDescription("");
          refetch();
        },
        onError: () => {
          toast({ title: "Failed to create", variant: "destructive" });
        }
      }
    );
  };

  const handleToggle = (id: number) => {
    activateMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Status updated" });
          refetch();
        }
      }
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">EA Strategies</h1>
            <p className="text-muted-foreground">Expert Advisors for automated market participation.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>Create EA</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Custom EA Strategy</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input required value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={type} 
                    onChange={(e) => setType(e.target.value as any)}
                  >
                    <option value="scalping">Scalping</option>
                    <option value="swing">Swing</option>
                    <option value="trend">Trend</option>
                    <option value="grid">Grid</option>
                    <option value="arbitrage">Arbitrage</option>
                  </select>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  Create Strategy
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
          </div>
        ) : strategies?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {strategies.map(strategy => (
              <Card key={strategy.id} className="flex flex-col h-full border-border">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="capitalize">{strategy.type}</Badge>
                    <Badge variant={strategy.status === "active" ? "default" : "secondary"}>
                      {strategy.status}
                    </Badge>
                  </div>
                  <CardTitle>{strategy.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{strategy.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Backtest ROI</p>
                      <p className="text-lg font-bold text-primary">+{strategy.backtestRoi}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Win Rate</p>
                      <p className="text-lg font-bold">{strategy.winRate}%</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant={strategy.status === "active" ? "secondary" : "default"}
                    className="w-full" 
                    onClick={() => handleToggle(strategy.id)}
                    disabled={activateMutation.isPending}
                  >
                    {strategy.status === "active" ? "Deactivate" : "Activate"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">No EA strategies found.</div>
        )}
      </div>
    </AppLayout>
  );
}
