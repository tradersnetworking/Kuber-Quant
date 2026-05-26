import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Server, Link2, Cpu, Activity, Users, LineChart, History, ArrowRight } from "lucide-react";

const SERVICES = [
  { name: "Copy Trading", icon: Users, config: "Trade Copier API + VPS Bridge", desc: "Master/slave account registration and trade mirroring to Windows VPS", tab: "api" },
  { name: "User MT Accounts & Profit Share", icon: LineChart, config: "MT5 Relay Endpoint + VPS Bridge", desc: "User-submitted credentials and profit-sharing requests (copy trading / account handling)", tab: "mt5-accounts" },
  { name: "Algo Trading", icon: Cpu, config: "VPS Bridge + Market Data", desc: "Algo strategy signals and execution via Windows server API", tab: "api" },
  { name: "EA Strategies", icon: Activity, config: "VPS Bridge", desc: "EA license keys and MT account binding forwarded to VPS", tab: "api" },
  { name: "EA Subscriptions", icon: Activity, config: "VPS Bridge", desc: "Active EA subscriptions synced to Windows execution server", tab: "api" },
];

interface WindowsServerServicesPanelProps {
  vpsConfigured?: boolean;
  tradeCopierConfigured?: boolean;
  onNavigate?: (tab: string) => void;
}

export function WindowsServerServicesPanel({
  vpsConfigured = false,
  tradeCopierConfigured = false,
  onNavigate,
}: WindowsServerServicesPanelProps) {
  const bridgeReady = vpsConfigured || tradeCopierConfigured;

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Server className="h-5 w-5 text-violet-400" />
          Windows Server API — Service Routing
        </CardTitle>
        <CardDescription>
          Configure credentials once in the API tab; they are forwarded to your Windows VPS when users subscribe to trading services.
          {bridgeReady
            ? " At least one integration is configured."
            : " No Windows server connection configured yet — set up VPS Bridge and Trade Copier API."}
        </CardDescription>
        <div className="flex gap-2 pt-1">
          <Badge variant="outline" className={vpsConfigured ? "text-green-400 border-green-500/30" : "text-orange-400 border-orange-500/30"}>
            VPS Bridge: {vpsConfigured ? "Configured" : "Not set"}
          </Badge>
          <Badge variant="outline" className={tradeCopierConfigured ? "text-green-400 border-green-500/30" : "text-orange-400 border-orange-500/30"}>
            Trade Copier: {tradeCopierConfigured ? "Configured" : "Not set"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {SERVICES.map(svc => (
          <div key={svc.name} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/[0.02]">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <svc.icon className="h-4 w-4 text-sky-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{svc.name}</p>
                <p className="text-xs text-muted-foreground">{svc.desc}</p>
                <p className="text-[10px] text-amber-400/80 mt-1">Uses: {svc.config}</p>
              </div>
            </div>
            {onNavigate && (
              <Button size="sm" variant="outline" className="shrink-0" onClick={() => onNavigate(svc.tab)}>
                Configure <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        ))}
        {onNavigate && (
          <Button className="w-full bg-amber-500 text-black mt-2" onClick={() => onNavigate("api")}>
            <Link2 className="h-4 w-4 mr-2" />Open Windows Server &amp; API Configuration
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
