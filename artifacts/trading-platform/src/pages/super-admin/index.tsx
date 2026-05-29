import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Users, Shield, Activity, Globe, RefreshCw,
  Send, CheckCircle, XCircle, Clock, Zap, Key, Settings2,
  Link2, Wifi, WifiOff, Eye, EyeOff, Copy, ExternalLink,
  Code2, Database, AlertCircle, ChevronDown, ChevronUp,
  Tag, FileText, Plus, Trash2, ToggleLeft, ToggleRight, Search
} from "lucide-react";
import { useLocation } from "wouter";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { SupportMailInboxPanel } from "@/components/support/SupportMailInboxPanel";
import {
  InvestmentPlansPanel,
  EAStrategiesPanel,
  CopyTradersPanel,
  WalletOperationsPanel,
  UsersManagementPanel,
  ManagersManagementPanel,
  SupportTeamManagementPanel,
  ManagerApplicationsPanel,
  KycManagementPanel,
  PaymentGatewaysPanel,
  SupportTicketsPanel,
  SiteSettingsPanel,
  HomepageContentPanel,
  PlatformInvestmentsPanel,
  FinanceLedgerPanel,
  ExchangeControlPanel,
  NotificationManagementPanel,
  PlatformAlgoTradingPanel,
  PlatformReferralsPanel,
  MtLinkedAccountsWorkspacePanel,
  VpsBridgeSettingsPanel,
  MarketDataSettingsPanel,
  CommunicationSettingsPanel,
  LegalAgreementsPanel,
  WindowsServerServicesPanel,
  BackupExportPanel,
  StakingAdminPanel,
  LazyTabPanel,
} from "@/pages/super-admin/lazy-panels";
import {
  SuperAdminPlatformStatsPanel,
  buildStatsQuery,
  type StatsPeriod,
  type PlatformStats,
} from "@/components/super-admin/SuperAdminPlatformStatsPanel";
import { defaultStaffFinancePeriod, todayIso } from "@/lib/finance-period";
import {
  SuperAdminOverviewSamples,
  type OverviewData,
} from "@/components/super-admin/SuperAdminOverviewSamples";
import { TreasuryOperationsPanel } from "@/components/super-admin/TreasuryOperationsPanel";
import { UpcomingTransactionsPanel } from "@/components/transactions/UpcomingTransactionsPanel";
import { PartnerIntegrationsPanel } from "@/components/super-admin/PartnerIntegrationsPanel";
import { RbacManagementPanel } from "@/components/super-admin/RbacManagementPanel";
import { CohortAnalyticsPanel } from "@/components/super-admin/CohortAnalyticsPanel";
import { SUPER_ADMIN_TABS } from "@/lib/nav-config";
import { authFetchJson, getStoredToken } from "@/lib/token-store";
import { SafeBoundary } from "@/components/SafeBoundary";
import { StaffMobileTabBar } from "@/components/staff/StaffMobileTabBar";
import { StaffQuickLinkTile } from "@/components/staff/StaffQuickLinkTile";
import { STAFF_PAGE_STACK, STAFF_QUICK_LINK_GRID, STAFF_HEADER_ROW, STAFF_FORM_GRID, STAFF_CHART_GRID } from "@/lib/staff-dashboard-ui";
import type { StaffStatTone } from "@/lib/staff-dashboard-ui";

const TAB_PANEL = "mt-4 space-y-6 outline-none data-[state=active]:block data-[state=inactive]:hidden";

const SUPER_ADMIN_MOBILE_TABS = [
  { value: "overview", label: "Overview" },
  { value: "wallet", label: "Wallet" },
  { value: "upcoming-transactions", label: "Upcoming" },
  { value: "users", label: "Users" },
  { value: "managers", label: "Managers" },
  { value: "support-team", label: "Support" },
  { value: "kyc", label: "KYC" },
  { value: "investment-plans", label: "Plans" },
  { value: "staking", label: "Staking" },
  { value: "copy-trading", label: "Copy" },
  { value: "algo-trading", label: "Algo" },
  { value: "ea-strategies", label: "EA" },
  { value: "transactions", label: "Txns" },
  { value: "support", label: "Tickets" },
  { value: "communication", label: "Email" },
  { value: "settings", label: "Settings" },
] as const;

const OVERVIEW_QUICK_NAV: { tab: string; label: string; desc: string; tone: StaffStatTone }[] = [
  { tab: "wallet", label: "Wallet & Txns", desc: "Deposits, withdrawals", tone: "emerald" },
  { tab: "upcoming-transactions", label: "Upcoming Txns", desc: "Pending approvals", tone: "amber" },
  { tab: "users", label: "Users", desc: "Edit all accounts", tone: "blue" },
  { tab: "managers", label: "Managers", desc: "Create managers", tone: "cyan" },
  { tab: "support-team", label: "Support Team", desc: "Create support agents", tone: "rose" },
  { tab: "kyc", label: "KYC", desc: "Approvals", tone: "teal" },
  { tab: "investment-plans", label: "Investment Plans", desc: "Plan CRUD", tone: "amber" },
  { tab: "staking", label: "Staking & Earn", desc: "APR, rewards, stakes", tone: "emerald" },
  { tab: "copy-trading", label: "Copy Trading", desc: "Master traders", tone: "violet" },
  { tab: "mt5-accounts", label: "MT Accounts", desc: "Credentials & profit share", tone: "indigo" },
  { tab: "algo-trading", label: "Algo Trading", desc: "Strategies & subs", tone: "fuchsia" },
  { tab: "ea-strategies", label: "EA Strategies", desc: "Catalog CRUD", tone: "orange" },
  { tab: "ea-subs", label: "EA Subscriptions", desc: "User EA subs", tone: "violet" },
  { tab: "payment-gateways", label: "Payments", desc: "Deposit accounts", tone: "emerald" },
  { tab: "support", label: "Support", desc: "Tickets", tone: "rose" },
  { tab: "api", label: "Server API", desc: "VPS bridge & copier", tone: "blue" },
  { tab: "communication", label: "Email & Comms", desc: "SMTP & auto emails", tone: "cyan" },
  { tab: "homepage", label: "Homepage", desc: "Partners & about", tone: "amber" },
  { tab: "site-config", label: "Site Config", desc: "Platform settings", tone: "teal" },
  { tab: "promo-codes", label: "Promo Codes", desc: "Discounts", tone: "amber" },
  { tab: "audit-logs", label: "Audit Logs", desc: "Activity trail", tone: "orange" },
];

async function apiFetch<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  return authFetchJson<T>(path, opts);
}

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const routeTab = useMemo(() => {
    if (location === "/super-admin" || location === "/super-admin/") return "overview";
    const match = location.match(/^\/super-admin\/([^/?#]+)/);
    return match?.[1] || "overview";
  }, [location]);
  const activeTab = SUPER_ADMIN_TABS.has(routeTab) ? routeTab : "overview";

  useEffect(() => {
    if (location.startsWith("/super-admin") && routeTab !== activeTab) {
      setLocation(activeTab === "overview" ? "/super-admin" : `/super-admin/${activeTab}`);
    }
  }, [location, routeTab, activeTab, setLocation]);

  function handleTabChange(tab: string) {
    setLocation(tab === "overview" ? "/super-admin" : `/super-admin/${tab}`);
  }

  // ── Global state ──────────────────────────────────────────────────────────
  const [mt5Endpoint, setMt5Endpoint] = useState("");
  const [endpointSaved, setEndpointSaved] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>(defaultStaffFinancePeriod());
  const [statsCustomFrom, setStatsCustomFrom] = useState(todayIso());
  const [statsCustomTo, setStatsCustomTo] = useState(todayIso());
  const [mt5Requests, setMt5Requests] = useState<any[]>([]);
  const [eaSubs, setEaSubs] = useState<any[]>([]);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Promo Codes state ─────────────────────────────────────────────────────
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [promoForm, setPromoForm] = useState({ code: "", type: "percentage", discountValue: "", appliesTo: "deposit", minAmount: "", maxUses: "", expiresAt: "" });
  const [promoLoaded, setPromoLoaded] = useState(false);
  const [promoLoading, setPromoLoading] = useState(false);
  const [showPromoCreate, setShowPromoCreate] = useState(false);

  // ── Audit Logs state ──────────────────────────────────────────────────────
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoaded, setAuditLoaded] = useState(false);
  const [auditFilter, setAuditFilter] = useState("");

  // ── Agreements state ───────────────────────────────────────────────────────
  const [agreements, setAgreements] = useState<any[]>([]);
  const [agrLoaded, setAgrLoaded] = useState(false);
  const [agrFilter, setAgrFilter] = useState("");
  const [agrGenerating, setAgrGenerating] = useState(false);
  const [agrGenForm, setAgrGenForm] = useState({ userId: "", type: "risk_disclosure" });

  // ── Trade Copier API state ────────────────────────────────────────────────
  const [tcConfig, setTcConfig] = useState({
    baseUrl: "",
    authType: "api_key" as "api_key" | "bearer" | "basic_auth",
    apiKey: "",
    username: "",
    password: "",
    masterAccountId: "",
  });
  const [tcConfigLoaded, setTcConfigLoaded] = useState(false);
  const [tcTestResult, setTcTestResult] = useState<{ ok: boolean; status?: number; message: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [tcSlaves, setTcSlaves] = useState<any[]>([]);
  const [showSlaves, setShowSlaves] = useState(false);
  const [vpsConfigured, setVpsConfigured] = useState(false);

  const isSuperAdmin = user && ((user.role as string) === "superadmin" || (user.role as string) === "admin");

  useEffect(() => {
    if (activeTab === "promo-codes" && !promoLoaded) {
      apiFetch("/promo-codes").then(d => { setPromoCodes(d); setPromoLoaded(true); }).catch(() => setPromoLoaded(true));
    }
    if (activeTab === "audit-logs" && !auditLoaded) {
      apiFetch("/audit-logs?limit=100").then(d => { setAuditLogs(d); setAuditLoaded(true); }).catch(() => setAuditLoaded(true));
    }
    if (activeTab === "agreements" && !agrLoaded) {
      apiFetch("/agreements/admin/all?limit=100").then(d => { setAgreements(d); setAgrLoaded(true); }).catch(() => setAgrLoaded(true));
    }
  }, [activeTab, promoLoaded, auditLoaded, agrLoaded]);

  // ── Load all data ─────────────────────────────────────────────────────────
  const loadStats = useCallback(async (period: StatsPeriod, customFrom: string, customTo: string) => {
    setLoading(l => ({ ...l, stats: true }));
    try {
      const query = buildStatsQuery(period, customFrom, customTo);
      const s = await apiFetch<PlatformStats>(`/super-admin/stats?${query}`);
      setStats(s);
    } catch (e: any) {
      toast({ title: "Stats load failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(l => ({ ...l, stats: false }));
    }
  }, [toast]);

  const loadAll = useCallback(async () => {
    setLoading(l => ({ ...l, all: true }));
    setLoadError(null);
    try {
      const statsQuery = buildStatsQuery(statsPeriod, statsCustomFrom, statsCustomTo);
      const [s, u, m, e, ep, tc, ov, vps] = await Promise.all([
        apiFetch<PlatformStats>(`/super-admin/stats?${statsQuery}`),
        apiFetch("/super-admin/users"),
        apiFetch("/super-admin/mt5-requests"),
        apiFetch("/super-admin/ea-subscriptions"),
        apiFetch("/super-admin/settings/mt5-endpoint"),
        apiFetch("/super-admin/settings/trade-copier"),
        apiFetch("/super-admin/overview"),
        apiFetch("/super-admin/settings/vps-bridge").catch(() => ({ host: "" })),
      ]);
      setStats(s);
      setUsers(u);
      setMt5Requests(m);
      setEaSubs(e);
      setOverview(ov);
      setMt5Endpoint(ep.endpoint || "");
      setTcConfig({
        baseUrl: tc.baseUrl || "",
        authType: tc.authType || "api_key",
        apiKey: tc.apiKey || "",
        username: tc.username || "",
        password: tc.password || "",
        masterAccountId: tc.masterAccountId || "",
      });
      setTcConfigLoaded(true);
      setVpsConfigured(Boolean(vps?.host?.trim()));
      setLoaded(true);
    } catch (e: any) {
      setLoadError(e.message || "Failed to load super admin data");
      toast({ title: "Load failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(l => ({ ...l, all: false }));
    }
  }, [toast, statsPeriod, statsCustomFrom, statsCustomTo]);

  function handleStatsPeriodChange(period: StatsPeriod) {
    setStatsPeriod(period);
    if (period !== "custom") {
      loadStats(period, statsCustomFrom, statsCustomTo);
    }
  }

  function handleApplyCustomStats() {
    loadStats("custom", statsCustomFrom, statsCustomTo);
  }

  useEffect(() => {
    if (isSuperAdmin) loadAll();
  }, [isSuperAdmin, loadAll]);

  // ── MT5 relay endpoint ────────────────────────────────────────────────────
  async function saveEndpoint() {
    try {
      await apiFetch("/super-admin/settings/mt5-endpoint", {
        method: "POST",
        body: JSON.stringify({ endpoint: mt5Endpoint }),
      });
      setEndpointSaved(true);
      toast({ title: "MT5 endpoint saved" });
      setTimeout(() => setEndpointSaved(false), 3000);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  }

  async function forwardRequest(id: number) {
    setLoading(l => ({ ...l, [`fwd_${id}`]: true }));
    try {
      await apiFetch(`/super-admin/mt5-requests/${id}/forward`, { method: "POST" });
      toast({ title: "Forwarded", description: "Request forwarded to Trade Copier API + relay endpoint." });
      setMt5Requests(r => r.map(x => x.id === id ? { ...x, status: "forwarded" } : x));
    } catch (e: any) {
      toast({ title: "Forward failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(l => ({ ...l, [`fwd_${id}`]: false }));
    }
  }

  async function updateRequestStatus(id: number, status: string) {
    try {
      await apiFetch(`/super-admin/mt5-requests/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast({ title: "Status updated" });
      setMt5Requests(r => r.map(x => x.id === id ? { ...x, status } : x));
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  }

  async function updateUserRole(id: number, role: string) {
    try {
      await apiFetch(`/super-admin/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      toast({ title: "Role updated" });
      setUsers(u => u.map(x => x.id === id ? { ...x, role } : x));
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  }

  // ── Trade Copier API actions ──────────────────────────────────────────────
  async function saveTcConfig() {
    setLoading(l => ({ ...l, tcSave: true }));
    try {
      await apiFetch("/super-admin/settings/trade-copier", {
        method: "POST",
        body: JSON.stringify(tcConfig),
      });
      toast({ title: "Trade Copier settings saved" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(l => ({ ...l, tcSave: false }));
    }
  }

  async function testTcConnection() {
    setLoading(l => ({ ...l, tcTest: true }));
    setTcTestResult(null);
    try {
      const result = await apiFetch("/super-admin/settings/trade-copier/test", { method: "POST" });
      setTcTestResult(result);
    } catch (e: any) {
      setTcTestResult({ ok: false, message: e.message });
    } finally {
      setLoading(l => ({ ...l, tcTest: false }));
    }
  }

  async function loadSlaves() {
    setLoading(l => ({ ...l, tcSlaves: true }));
    try {
      const result = await apiFetch("/super-admin/settings/trade-copier/slaves");
      setTcSlaves(result.data || []);
      setShowSlaves(true);
    } catch {
      setTcSlaves([]);
      setShowSlaves(true);
    } finally {
      setLoading(l => ({ ...l, tcSlaves: false }));
    }
  }

  const statusColor: Record<string, string> = {
    pending: "bg-orange-500/20 text-orange-600 dark:text-orange-400",
    forwarded: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
    accepted: "bg-green-500/20 text-green-700 dark:text-green-400",
    rejected: "bg-red-500/20 text-red-400",
    completed: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
  };

  const tcIsConfigured = tcConfig.baseUrl.length > 0;

  return (
    <div className={STAFF_PAGE_STACK}>
        <div className={STAFF_HEADER_ROW}>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 dark:from-amber-400 dark:to-yellow-600 bg-clip-text text-transparent">
              Super Admin
            </h1>
            <p className="page-subtitle mt-1">Create plans, collect funds, and manage users, managers & support across the platform</p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 w-full md:w-auto border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10" onClick={loadAll} disabled={loading.all}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading.all ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {loadError && (
          <Card className="border-red-500/30 bg-red-500/10">
            <CardContent className="pt-4 flex items-center justify-between gap-4">
              <p className="text-sm text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {loadError.includes("token") || loadError.includes("Unauthorized")
                  ? "Your session has expired. Please sign in again."
                  : loadError}
              </p>
              <div className="flex gap-2">
                {loadError.includes("token") || loadError.includes("Unauthorized") ? (
                  <Button size="sm" variant="outline" onClick={() => { localStorage.clear(); window.location.href = "/login?session=expired"; }}>
                    Sign In
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={loadAll}>Retry</Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <StaffMobileTabBar
            tabs={[...SUPER_ADMIN_MOBILE_TABS]}
            value={activeTab}
            onChange={handleTabChange}
            className="mb-2"
          />

          {/* ── Overview ── */}
          <TabsContent value="overview" className={TAB_PANEL}>
            <SuperAdminPlatformStatsPanel
              stats={stats}
              loading={loading.all || loading.stats}
              period={statsPeriod}
              customFrom={statsCustomFrom}
              customTo={statsCustomTo}
              onPeriodChange={handleStatsPeriodChange}
              onCustomFromChange={setStatsCustomFrom}
              onCustomToChange={setStatsCustomTo}
              onApplyCustom={handleApplyCustomStats}
            />

            <SafeBoundary label="Treasury panel failed to load.">
              <TreasuryOperationsPanel />
            </SafeBoundary>

            <SafeBoundary label="Cohort analytics failed to load.">
              <CohortAnalyticsPanel />
            </SafeBoundary>

            <SafeBoundary label="Platform catalog preview failed to load.">
              <SuperAdminOverviewSamples
                data={overview}
                loading={loading.all}
                onNavigate={handleTabChange}
              />
            </SafeBoundary>

            <div className={STAFF_QUICK_LINK_GRID}>
              {OVERVIEW_QUICK_NAV.map(item => (
                <StaffQuickLinkTile
                  key={item.tab}
                  href="#"
                  label={item.label}
                  desc={item.desc}
                  tone={item.tone}
                  onClick={() => handleTabChange(item.tab)}
                />
              ))}
            </div>

            {/* Trade Copier status card */}
            <Card className={`border ${tcIsConfigured ? "bg-green-500/5 border-green-500/20" : "bg-orange-500/5 border-orange-500/20"}`}>
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                {tcIsConfigured
                  ? <Wifi className="h-5 w-5 text-green-700 dark:text-green-400 shrink-0" />
                  : <WifiOff className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0" />}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${tcIsConfigured ? "text-green-700 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}`}>
                    Trade Copier API — {tcIsConfigured ? "Configured" : "Not configured"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tcIsConfigured
                      ? `Connected to: ${tcConfig.baseUrl}`
                      : "Configure your Trade Copier API credentials in the API tab to enable automated copy trading."}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="w-full md:w-auto shrink-0" onClick={() => handleTabChange("api")}>
                  {tcIsConfigured ? "Manage" : "Set up"}
                </Button>
              </CardContent>
            </Card>

            <LazyTabPanel active={activeTab === "overview"}>
            <WindowsServerServicesPanel
              vpsConfigured={vpsConfigured}
              tradeCopierConfigured={tcIsConfigured}
              onNavigate={handleTabChange}
            />
            </LazyTabPanel>
          </TabsContent>

          <TabsContent value="wallet" className={TAB_PANEL}>
            <LazyTabPanel active={activeTab === "wallet"}><WalletOperationsPanel /></LazyTabPanel>
          </TabsContent>

          <TabsContent value="upcoming-transactions" className={TAB_PANEL}>
            <LazyTabPanel active={activeTab === "upcoming-transactions"}>
              <UpcomingTransactionsPanel variant="admin" />
            </LazyTabPanel>
          </TabsContent>

          <TabsContent value="exchange" className={TAB_PANEL}>
            <LazyTabPanel active={activeTab === "exchange"}><ExchangeControlPanel /></LazyTabPanel>
          </TabsContent>

          <TabsContent value="investments" className={TAB_PANEL}>
            <LazyTabPanel active={activeTab === "investments"}><PlatformInvestmentsPanel /></LazyTabPanel>
          </TabsContent>

          <TabsContent value="transactions" className={TAB_PANEL}>
            <LazyTabPanel active={activeTab === "transactions"}><FinanceLedgerPanel /></LazyTabPanel>
          </TabsContent>

          <TabsContent value="notifications" className={TAB_PANEL}>
            <LazyTabPanel active={activeTab === "notifications"}><NotificationManagementPanel /></LazyTabPanel>
          </TabsContent>

          <TabsContent value="algo-trading" className={TAB_PANEL}>
            <LazyTabPanel active={activeTab === "algo-trading"}><PlatformAlgoTradingPanel /></LazyTabPanel>
          </TabsContent>

          <TabsContent value="referrals" className={TAB_PANEL}>
            <LazyTabPanel active={activeTab === "referrals"}><PlatformReferralsPanel /></LazyTabPanel>
          </TabsContent>

          <TabsContent value="users" className={TAB_PANEL}>
            <LazyTabPanel active={activeTab === "users"}><UsersManagementPanel defaultRoleTab="user" /></LazyTabPanel>
          </TabsContent>

          <TabsContent value="managers" className={TAB_PANEL}>
            <LazyTabPanel active={activeTab === "managers"}>
            <ManagerApplicationsPanel />
            <div className="mt-8">
              <ManagersManagementPanel />
            </div>
            </LazyTabPanel>
          </TabsContent>

          <TabsContent value="support-team" className={TAB_PANEL}>
            <LazyTabPanel active={activeTab === "support-team"}><SupportTeamManagementPanel /></LazyTabPanel>
          </TabsContent>

          <TabsContent value="kyc" className={TAB_PANEL}>
            <LazyTabPanel active={activeTab === "kyc"}><KycManagementPanel /></LazyTabPanel>
          </TabsContent>

          <TabsContent value="investment-plans" className={TAB_PANEL}>
            <LazyTabPanel active={activeTab === "investment-plans"}><InvestmentPlansPanel /></LazyTabPanel>
          </TabsContent>

          <TabsContent value="staking" className={TAB_PANEL}>
            <LazyTabPanel active={activeTab === "staking"}><StakingAdminPanel /></LazyTabPanel>
          </TabsContent>

          <TabsContent value="ea-strategies" className={TAB_PANEL}>
            <LazyTabPanel active={activeTab === "ea-strategies"}><EAStrategiesPanel /></LazyTabPanel>
          </TabsContent>

          <TabsContent value="copy-trading" className={TAB_PANEL}>
            <LazyTabPanel active={activeTab === "copy-trading"}><CopyTradersPanel /></LazyTabPanel>
          </TabsContent>

          <TabsContent value="mt5-accounts" className={TAB_PANEL}>
            <LazyTabPanel active={activeTab === "mt5-accounts"}>
            <MtLinkedAccountsWorkspacePanel apiBase="/super-admin" showFormConfig />
            </LazyTabPanel>
          </TabsContent>

          <TabsContent value="mt5" className={TAB_PANEL}>
            <LazyTabPanel active={activeTab === "mt5"}>
            <MtLinkedAccountsWorkspacePanel apiBase="/super-admin" showFormConfig defaultTab="requests" />
            </LazyTabPanel>
          </TabsContent>

          <TabsContent value="payment-gateways" className={TAB_PANEL}>
            <LazyTabPanel active={activeTab === "payment-gateways"}><PaymentGatewaysPanel /></LazyTabPanel>
          </TabsContent>

          <TabsContent value="support" className={TAB_PANEL}>
            <LazyTabPanel active={activeTab === "support"}><SupportTicketsPanel /></LazyTabPanel>
          </TabsContent>

          <TabsContent value="support-mail" className={TAB_PANEL}>
            <LazyTabPanel active={activeTab === "support-mail"}>
            <SupportMailInboxPanel
              title="Support Mail"
              description="Manage client queries, complaints, disputes, and other emails sent to support@kuberquant.com."
              apiBase="/admin/mail"
            />
            </LazyTabPanel>
          </TabsContent>

          <TabsContent value="site-config" className={TAB_PANEL}>
            <LazyTabPanel active={activeTab === "site-config"}><SiteSettingsPanel /></LazyTabPanel>
          </TabsContent>

          <TabsContent value="homepage" className={TAB_PANEL}>
            <LazyTabPanel active={activeTab === "homepage"}><HomepageContentPanel /></LazyTabPanel>
          </TabsContent>

          {/* ── EA Subscriptions ── */}
          <TabsContent value="ea-subs" className={TAB_PANEL}>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">EA Subscriptions</h2>
              <p className="text-sm text-muted-foreground mt-1">
                User subscriptions to catalog Expert Advisors — license keys, MT accounts, and renewal status.
              </p>
            </div>
            <div className="space-y-2">
              {loading.all ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              ) : eaSubs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subscriptions yet</p>
              ) : eaSubs.map(s => (
                <Card key={s.id} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
                  <CardContent className="p-3 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{s.strategyName ?? `Strategy #${s.strategyId}`}</p>
                      <p className="text-xs text-muted-foreground">
                        User #{s.userId} · Account: {s.mtAccountNumber} · {String(s.mtPlatform).toUpperCase()} · {String(s.plan).replace(/^./, c => c.toUpperCase())}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        License: <code className="text-amber-600 dark:text-amber-400">{s.licenseKey}</code> · Downloads: {s.downloadCount}
                        {s.amount ? ` · $${s.amount}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-xs ${
                        s.status === "active" ? "bg-green-500/20 text-green-700 dark:text-green-400" :
                        s.status === "expired" ? "bg-red-500/20 text-red-400" :
                        "bg-muted text-muted-foreground"
                      }`}>{s.status}</Badge>
                      <span className="text-xs text-muted-foreground">
                        Expires {new Date(s.expiresAt).toLocaleDateString()}
                      </span>
                      {s.status === "active" && (
                        <Button size="sm" variant="outline" className="text-xs h-7"
                          onClick={async () => {
                            await apiFetch(`/super-admin/ea-subscriptions/${s.id}`, { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) });
                            setEaSubs(prev => prev.map(x => x.id === s.id ? { ...x, status: "cancelled" } : x));
                            toast({ title: "Subscription cancelled" });
                          }}>Cancel</Button>
                      )}
                      {s.status !== "active" && (
                        <Button size="sm" variant="outline" className="text-xs h-7"
                          onClick={async () => {
                            await apiFetch(`/super-admin/ea-subscriptions/${s.id}`, { method: "PATCH", body: JSON.stringify({ status: "active" }) });
                            setEaSubs(prev => prev.map(x => x.id === s.id ? { ...x, status: "active" } : x));
                            toast({ title: "Subscription reactivated" });
                          }}>Activate</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── API Integrations ── */}
          <TabsContent value="api" className={TAB_PANEL}>
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Link2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                API Integrations
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Configure third-party API connections used by the platform for automated trading services.
              </p>
            </div>

            {/* Trade Copier API */}
            <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <Code2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        Trade Copier API
                        {tcIsConfigured
                          ? <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 text-xs flex items-center gap-1"><Wifi className="h-2.5 w-2.5" />Configured</Badge>
                          : <Badge className="bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs flex items-center gap-1"><WifiOff className="h-2.5 w-2.5" />Not configured</Badge>}
                      </CardTitle>
                      <CardDescription>
                        Connect to a RESTful trade copier service (e.g. Duplikium, custom API). Copy trading relay requests will automatically register slave accounts via this API.
                      </CardDescription>
                    </div>
                  </div>
                  <a
                    href="https://trade-copier.com/features/trade-copier-api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    API Docs
                  </a>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {!tcConfigLoaded ? (
                  <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : (
                  <>
                    {/* Base URL */}
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Base URL</Label>
                      <Input
                        value={tcConfig.baseUrl}
                        onChange={e => setTcConfig(c => ({ ...c, baseUrl: e.target.value }))}
                        placeholder="https://api.trade-copier.com"
                        className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">The root URL of your trade copier API — no trailing slash.</p>
                    </div>

                    {/* Auth Type */}
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Authentication Method</Label>
                      <Select value={tcConfig.authType} onValueChange={v => setTcConfig(c => ({ ...c, authType: v as any }))}>
                        <SelectTrigger className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="api_key">API Key (X-API-Key + Bearer header)</SelectItem>
                          <SelectItem value="bearer">Bearer Token</SelectItem>
                          <SelectItem value="basic_auth">Basic Auth (Username + Password)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Credentials */}
                    {tcConfig.authType !== "basic_auth" ? (
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                          {tcConfig.authType === "api_key" ? "API Key" : "Bearer Token"}
                        </Label>
                        <div className="relative">
                          <Input
                            type={showApiKey ? "text" : "password"}
                            value={tcConfig.apiKey}
                            onChange={e => setTcConfig(c => ({ ...c, apiKey: e.target.value }))}
                            placeholder={tcConfig.authType === "api_key" ? "your-api-key" : "your-bearer-token"}
                            className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 font-mono text-sm pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(s => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={STAFF_FORM_GRID}>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Username</Label>
                          <Input
                            value={tcConfig.username}
                            onChange={e => setTcConfig(c => ({ ...c, username: e.target.value }))}
                            placeholder="your-username"
                            className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              value={tcConfig.password}
                              onChange={e => setTcConfig(c => ({ ...c, password: e.target.value }))}
                              placeholder="your-password"
                              className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(s => !s)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Master Account ID */}
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Master Account ID</Label>
                      <Input
                        value={tcConfig.masterAccountId}
                        onChange={e => setTcConfig(c => ({ ...c, masterAccountId: e.target.value }))}
                        placeholder="master-account-id-from-trade-copier"
                        className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">The master account ID registered on your trade copier platform. Slave accounts will be linked to this master.</p>
                    </div>

                    {/* Actions row */}
                    <div className="flex gap-3 flex-wrap pt-1">
                      <Button
                        onClick={saveTcConfig}
                        disabled={loading.tcSave}
                        className="bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-medium"
                      >
                        {loading.tcSave
                          ? "Saving..."
                          : <><Settings2 className="h-4 w-4 mr-2" />Save Settings</>}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={testTcConnection}
                        disabled={loading.tcTest || !tcConfig.baseUrl}
                      >
                        {loading.tcTest
                          ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Testing...</>
                          : <><Wifi className="h-4 w-4 mr-2" />Test Connection</>}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={showSlaves ? () => setShowSlaves(false) : loadSlaves}
                        disabled={loading.tcSlaves || !tcConfig.baseUrl}
                      >
                        {loading.tcSlaves
                          ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Loading...</>
                          : showSlaves
                            ? <><ChevronUp className="h-4 w-4 mr-2" />Hide Slaves</>
                            : <><Database className="h-4 w-4 mr-2" />List Slaves</>}
                      </Button>
                    </div>

                    {/* Test result */}
                    {tcTestResult && (
                      <div className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
                        tcTestResult.ok
                          ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400"
                          : "bg-red-500/10 border-red-500/20 text-red-400"
                      }`}>
                        {tcTestResult.ok
                          ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                        <div>
                          <p className="font-medium">{tcTestResult.ok ? "Connection successful" : "Connection failed"}</p>
                          <p className="text-xs opacity-80 mt-0.5">{tcTestResult.message}</p>
                          {tcTestResult.status && <p className="text-xs opacity-60 mt-0.5">HTTP {tcTestResult.status}</p>}
                        </div>
                      </div>
                    )}

                    {/* Slave accounts list */}
                    {showSlaves && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                          Slave Accounts ({tcSlaves.length})
                        </p>
                        {tcSlaves.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No slave accounts found on the trade copier.</p>
                        ) : tcSlaves.map((sl, i) => (
                          <div key={i} className="flex items-center justify-between bg-muted/60 dark:bg-white/5 rounded-lg px-3 py-2 text-xs">
                            <span className="font-mono">{sl.login || sl.id || JSON.stringify(sl)}</span>
                            <Badge className="bg-muted dark:bg-white/10 text-muted-foreground text-xs">{sl.status || "active"}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <WindowsServerServicesPanel
              vpsConfigured={vpsConfigured}
              tradeCopierConfigured={tcIsConfigured}
              onNavigate={handleTabChange}
            />

            <VpsBridgeSettingsPanel />

            <MarketDataSettingsPanel />

            {/* How the integration works */}
            <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  How the Integration Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className={STAFF_CHART_GRID}>
                  {[
                    {
                      icon: "1",
                      title: "User Submits Request",
                      desc: "A user submits a Copy Trading request via the MT4/MT5 Services page, including their account number and profit sharing terms.",
                      color: "text-blue-600 dark:text-blue-400 bg-blue-500/20",
                    },
                    {
                      icon: "2",
                      title: "Admin Reviews",
                      desc: "You review the request in the MT5 Relay tab, verify the account details, and click Forward to approve.",
                      color: "text-amber-600 dark:text-amber-400 bg-amber-500/20",
                    },
                    {
                      icon: "3",
                      title: "Auto Slave Registration",
                      desc: "On Forward, the platform calls POST /v1/slaves on your Trade Copier API with the slave login, master account ID, and profit sharing %.",
                      color: "text-purple-600 dark:text-purple-400 bg-purple-500/20",
                    },
                    {
                      icon: "4",
                      title: "Live Copy Trading Begins",
                      desc: "The trade copier begins mirroring trades from your master account to the slave. Both accounts trade in real time.",
                      color: "text-green-700 dark:text-green-400 bg-green-500/20",
                    },
                  ].map(item => (
                    <div key={item.icon} className="flex gap-3">
                      <div className={`h-6 w-6 rounded-full ${item.color} flex items-center justify-center text-xs font-bold shrink-0 mt-0.5`}>
                        {item.icon}
                      </div>
                      <div>
                        <p className="font-medium text-foreground/90">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-muted/90 dark:bg-black/40 border border-border dark:border-white/10 rounded-lg p-4 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">API Endpoints Used</p>
                  {[
                    { method: "POST", path: "/v1/slaves", desc: "Register a new slave account" },
                    { method: "DELETE", path: "/v1/slaves/{id}", desc: "Remove a slave account (on unfollow)" },
                    { method: "GET", path: "/v1/slaves", desc: "List all slave accounts" },
                    { method: "GET", path: "/ping or /health", desc: "Test API connectivity" },
                  ].map(ep => (
                    <div key={ep.path} className="flex items-center gap-3 text-xs">
                      <span className={`font-mono font-bold w-14 text-center ${ep.method === "POST" ? "text-green-700 dark:text-green-400" : ep.method === "DELETE" ? "text-red-400" : "text-blue-600 dark:text-blue-400"}`}>
                        {ep.method}
                      </span>
                      <code className="text-amber-600 dark:text-amber-400 font-mono flex-1">{ep.path}</code>
                      <span className="text-muted-foreground hidden md:block">{ep.desc}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <PartnerIntegrationsPanel />

            {user?.role === "superadmin" && <RbacManagementPanel />}
          </TabsContent>

          <TabsContent value="communication" className={TAB_PANEL}>
            <LazyTabPanel active={activeTab === "communication"}><CommunicationSettingsPanel /></LazyTabPanel>
          </TabsContent>

          {/* ── Settings ── */}
          <TabsContent value="settings" className={TAB_PANEL}>
            <SiteSettingsPanel />

            <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  External MT5 Relay Endpoint
                </CardTitle>
                <CardDescription>
                  Optional secondary relay — configure a custom URL to also receive copy-trading and account-handling requests via POST when you click Forward.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Relay Endpoint URL</Label>
                  <Input
                    value={mt5Endpoint}
                    onChange={e => setMt5Endpoint(e.target.value)}
                    placeholder="https://your-mt5-site.com/api/relay"
                    className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"
                  />
                  <p className="text-xs text-muted-foreground">
                    POST body: requestId, type, userId, userEmail, userName, mt5AccountId, profitSharingPercent, details, timestamp
                  </p>
                </div>
                <Button onClick={saveEndpoint} className="bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-medium">
                  {endpointSaved ? <><CheckCircle className="h-4 w-4 mr-2" />Saved!</> : <><Settings2 className="h-4 w-4 mr-2" />Save Endpoint</>}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  Platform Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  { label: "Your Role", value: <Badge className="bg-red-500/20 text-red-400">Super Admin</Badge> },
                  { label: "Role Hierarchy", value: "superadmin → support → manager → user" },
                  { label: "KYC Requirement", value: <span className="text-green-700 dark:text-green-400">Exempt</span> },
                  { label: "MT5 Relay Endpoint", value: <span className={mt5Endpoint ? "text-green-700 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}>{mt5Endpoint ? "Configured" : "Not configured"}</span> },
                  { label: "Trade Copier API", value: <span className={tcIsConfigured ? "text-green-700 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}>{tcIsConfigured ? "Configured" : "Not configured"}</span> },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center py-2 border-b border-border/80 dark:border-white/5 last:border-0">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span>{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Promo Codes ── */}
          <TabsContent value="promo-codes" className={TAB_PANEL}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Promo Codes</h3>
                <p className="text-sm text-muted-foreground">Create and manage discount codes for deposits, investments, and EA subscriptions.</p>
              </div>
              <Button onClick={() => { setShowPromoCreate(v => !v); }} className="bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold">
                <Plus className="h-4 w-4 mr-2" />Create Code
              </Button>
            </div>

            {showPromoCreate && (
              <Card className="bg-muted/60 dark:bg-white/5 border-amber-500/20">
                <CardHeader><CardTitle className="text-base text-amber-600 dark:text-amber-400">New Promo Code</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setPromoLoading(true);
                    try {
                      await apiFetch("/promo-codes", { method: "POST", body: JSON.stringify({
                        code: promoForm.code,
                        type: promoForm.type,
                        value: Number(promoForm.discountValue),
                        appliesTo: promoForm.appliesTo,
                        minAmount: promoForm.minAmount ? Number(promoForm.minAmount) : undefined,
                        maxUses: promoForm.maxUses ? Number(promoForm.maxUses) : undefined,
                        expiresAt: promoForm.expiresAt || undefined,
                      }) });
                      const d = await apiFetch("/promo-codes"); setPromoCodes(d); setPromoLoaded(true);
                      setPromoForm({ code: "", type: "percentage", discountValue: "", appliesTo: "deposit", minAmount: "", maxUses: "", expiresAt: "" });
                      setShowPromoCreate(false);
                      toast({ title: "Promo code created!" });
                    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                    finally { setPromoLoading(false); }
                  }} className={STAFF_FORM_GRID}>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Code</Label>
                      <Input required value={promoForm.code} onChange={e => setPromoForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SAVE20" className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 uppercase" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Applies To</Label>
                      <Select value={promoForm.appliesTo} onValueChange={v => setPromoForm(f => ({ ...f, appliesTo: v }))}>
                        <SelectTrigger className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deposit">Deposit</SelectItem>
                          <SelectItem value="investment">Investment</SelectItem>
                          <SelectItem value="ea_subscription">EA Subscription</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Discount Type</Label>
                      <Select value={promoForm.type} onValueChange={v => setPromoForm(f => ({ ...f, type: v }))}>
                        <SelectTrigger className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed ($)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Discount Value</Label>
                      <Input required type="number" value={promoForm.discountValue} onChange={e => setPromoForm(f => ({ ...f, discountValue: e.target.value }))} placeholder={promoForm.type === "percentage" ? "20" : "50"} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Min Amount ($, optional)</Label>
                      <Input type="number" value={promoForm.minAmount} onChange={e => setPromoForm(f => ({ ...f, minAmount: e.target.value }))} placeholder="100" className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Max Uses (optional)</Label>
                      <Input type="number" value={promoForm.maxUses} onChange={e => setPromoForm(f => ({ ...f, maxUses: e.target.value }))} placeholder="100" className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs text-muted-foreground">Expiry Date (optional)</Label>
                      <Input type="date" value={promoForm.expiresAt} onChange={e => setPromoForm(f => ({ ...f, expiresAt: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
                    </div>
                    <div className="col-span-2 flex gap-2 pt-1">
                      <Button type="submit" disabled={promoLoading} className="bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold">
                        {promoLoading ? "Creating..." : "Create Promo Code"}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setShowPromoCreate(false)}>Cancel</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
              <CardContent className="p-0">
                {!promoLoaded ? (
                  <div className="p-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : promoCodes.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Tag className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>No promo codes yet. Create your first one above.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {promoCodes.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/80 dark:hover:bg-muted/60 dark:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${p.isActive ? "bg-green-500" : "bg-background0"}`} />
                          <div>
                            <p className="font-mono font-bold text-amber-600 dark:text-amber-400">{p.code}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {p.type === "percentage" ? `${p.value}% off` : `$${p.value} off`} · {p.appliesTo?.replace("_", " ")}
                              {p.maxUses ? ` · ${p.usedCount}/${p.maxUses} used` : ""}
                              {p.expiresAt ? ` · Expires ${new Date(p.expiresAt).toLocaleDateString()}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={p.isActive ? "bg-green-500/20 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"}>
                            {p.isActive ? "Active" : "Disabled"}
                          </Badge>
                          <Button size="sm" variant="ghost" onClick={async () => {
                            await apiFetch(`/promo-codes/${p.id}/toggle`, { method: "PATCH" });
                            setPromoCodes(ps => ps.map(x => x.id === p.id ? { ...x, isActive: !x.isActive } : x));
                          }} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                            {p.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={async () => {
                            if (!confirm("Delete this promo code?")) return;
                            await apiFetch(`/promo-codes/${p.id}`, { method: "DELETE" });
                            setPromoCodes(ps => ps.filter(x => x.id !== p.id));
                            toast({ title: "Deleted" });
                          }} className="h-7 w-7 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Backup & Export ── */}
          <TabsContent value="backup" className={TAB_PANEL}>
            <LazyTabPanel active={activeTab === "backup"}><BackupExportPanel /></LazyTabPanel>
          </TabsContent>

          {/* ── Audit Logs ── */}
          <TabsContent value="audit-logs" className={TAB_PANEL}>
            <div>
              <h3 className="text-lg font-semibold">Audit Logs</h3>
              <p className="text-sm text-muted-foreground">Immutable record of all administrative and user actions.</p>
            </div>

            {!auditLoaded && (
              <Button onClick={async () => {
                const d = await apiFetch("/audit-logs?limit=100");
                setAuditLogs(d); setAuditLoaded(true);
              }} className="bg-muted/60 dark:bg-white/5 border border-border dark:border-white/10 hover:bg-muted dark:bg-white/10 text-foreground">
                <FileText className="h-4 w-4 mr-2" />Load Audit Logs
              </Button>
            )}

            {auditLoaded && (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={auditFilter} onChange={e => setAuditFilter(e.target.value)} placeholder="Filter by action, email, or entity..." className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 pl-10" />
                </div>
                <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
                  <CardContent className="p-0">
                    {auditLogs.length === 0 ? (
                      <div className="p-12 text-center text-muted-foreground">
                        <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p>No audit logs yet.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5 max-h-[600px] overflow-auto">
                        {auditLogs
                          .filter((l: any) => !auditFilter || JSON.stringify(l).toLowerCase().includes(auditFilter.toLowerCase()))
                          .map((l: any, i: number) => (
                            <div key={i} className="px-4 py-3 hover:bg-muted/80 dark:hover:bg-muted/60 dark:bg-white/5 transition-colors">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2 min-w-0">
                                  <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs shrink-0 mt-0.5">{l.action}</Badge>
                                  <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground">
                                      {l.entityType && <span className="text-muted-foreground">{l.entityType}</span>}
                                      {l.entityId && <span className="text-muted-foreground/70"> #{l.entityId}</span>}
                                    </p>
                                    {l.details && (
                                      <p className="text-xs text-muted-foreground/70 font-mono truncate max-w-sm">
                                        {typeof l.details === "object" ? JSON.stringify(l.details) : l.details}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs text-muted-foreground">{l.ipAddress || "—"}</p>
                                  <p className="text-xs text-muted-foreground/70">{l.createdAt ? new Date(l.createdAt).toLocaleString() : "—"}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
          {/* ── Agreements ── */}
          <TabsContent value="agreements" className={TAB_PANEL}>
            <LazyTabPanel active={activeTab === "agreements"}>
            <LegalAgreementsPanel
              agreements={agreements}
              agrFilter={agrFilter}
              setAgrFilter={setAgrFilter}
              agrGenerating={agrGenerating}
              agrGenForm={agrGenForm}
              setAgrGenForm={setAgrGenForm}
              onGenerate={async () => {
                setAgrGenerating(true);
                try {
                  const r = await apiFetch("/agreements/admin/generate", {
                    method: "POST",
                    body: JSON.stringify({ userId: agrGenForm.userId, type: agrGenForm.type }),
                  });
                  toast({ title: "Agreement generated", description: `Ref: ${r.agreementUid}` });
                  const d = await apiFetch("/agreements/admin/all?limit=100");
                  setAgreements(d);
                } catch (e: any) {
                  toast({ title: "Failed", description: e.message, variant: "destructive" });
                } finally {
                  setAgrGenerating(false);
                }
              }}
              onRefreshAgreements={() => apiFetch("/agreements/admin/all?limit=100").then(d => { setAgreements(d); setAgrLoaded(true); })}
              onRevoke={async (id: number) => {
                if (!confirm("Revoke this agreement?")) return;
                await apiFetch(`/agreements/admin/${id}/revoke`, { method: "PATCH" });
                setAgreements(prev => prev.map(a => a.id === id ? { ...a, status: "revoked" } : a));
                toast({ title: "Agreement revoked" });
              }}
            />
            </LazyTabPanel>
          </TabsContent>
        </Tabs>
      </div>
  );
}
