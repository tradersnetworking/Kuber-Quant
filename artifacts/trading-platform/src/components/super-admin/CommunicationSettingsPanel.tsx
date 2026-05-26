import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Mail, Plus, Trash2, Save, RefreshCw, Send, Settings2,
  CheckCircle, AlertCircle, Inbox, Server,
} from "lucide-react";
import { authFetchJson } from "@/lib/token-store";
import { MailSettingsPanel } from "@/components/super-admin/MailSettingsPanel";
import { SupportInboxSettingsPanel } from "@/components/super-admin/SupportInboxSettingsPanel";
import { SupportMailDeskSettingsPanel } from "@/components/super-admin/SupportMailDeskSettingsPanel";
import {
  DEFAULT_EMAIL_COMM_CONFIG,
  DEFAULT_EMAIL_PURPOSE_META,
  DEFAULT_EMAIL_PURPOSES,
} from "@/lib/email-communication-defaults";

type MailIdentity = { id: string; label: string; name: string; address: string };
type AutoEmailSetting = { enabled: boolean; subject: string };
type EmailPurpose = string;

type EmailCommConfig = {
  identities: MailIdentity[];
  assignments: Record<string, string>;
  autoEmails: Record<string, AutoEmailSetting>;
};

type PurposeMeta = Record<string, { label: string; description: string; group: string }>;

type CommSummary = {
  smtp: { configured: boolean; enabled: boolean; envFallback: boolean; from: string };
  inbox: { configured: boolean; enabled: boolean; envFallback?: boolean; address: string };
  identities: number;
  autoEmailsEnabled: number;
  autoEmailsTotal: number;
};

const GROUP_ORDER = ["Account", "Finance", "Compliance", "Trading", "Support", "Other"];

function ConfigTabSkeleton() {
  return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;
}

export function CommunicationSettingsPanel() {
  const { toast } = useToast();
  const [config, setConfig] = useState<EmailCommConfig | null>(null);
  const [purposeMeta, setPurposeMeta] = useState<PurposeMeta>({});
  const [purposes, setPurposes] = useState<EmailPurpose[]>([]);
  const [summary, setSummary] = useState<CommSummary | null>(null);
  const [resolvedFrom, setResolvedFrom] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [testPurpose, setTestPurpose] = useState("registration");
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await authFetchJson<{
        config: EmailCommConfig;
        purposeMeta: PurposeMeta;
        purposes: EmailPurpose[];
        summary: CommSummary;
        resolvedFrom: Record<string, string>;
      }>("/super-admin/settings/email-communication");
      setConfig(data.config);
      setPurposeMeta(data.purposeMeta);
      setPurposes(data.purposes);
      setSummary(data.summary);
      setResolvedFrom(data.resolvedFrom || {});
    } catch (e: any) {
      setConfig(JSON.parse(JSON.stringify(DEFAULT_EMAIL_COMM_CONFIG)));
      setPurposeMeta(DEFAULT_EMAIL_PURPOSE_META);
      setPurposes(DEFAULT_EMAIL_PURPOSES);
      setLoadError(e.message || "Could not load saved settings — showing defaults.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveRouting = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await authFetchJson("/super-admin/settings/email-communication", {
        method: "POST",
        body: JSON.stringify({ config }),
      });
      toast({ title: "Mail routing & automation saved" });
      await load();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const sendPurposeTest = async () => {
    if (!testTo.trim()) {
      toast({ title: "Enter a recipient email", variant: "destructive" });
      return;
    }
    setTesting(true);
    try {
      const result = await authFetchJson<{ ok: boolean; message: string }>(
        "/super-admin/settings/email-communication/test",
        { method: "POST", body: JSON.stringify({ purpose: testPurpose, testTo: testTo.trim() }) },
      );
      toast({
        title: result.ok ? "Test sent" : "Test failed",
        description: result.message,
        variant: result.ok ? "default" : "destructive",
      });
    } catch (e: any) {
      toast({ title: "Test failed", description: e.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const addIdentity = () => {
    if (!config) return;
    const id = `custom_${Date.now()}`;
    setConfig({
      ...config,
      identities: [...config.identities, { id, label: "Custom Mail", name: "Kuber Quant", address: "" }],
    });
  };

  const removeIdentity = (id: string) => {
    if (!config || id === "default") return;
    const nextIds = config.identities.filter(i => i.id !== id);
    const nextAssignments = Object.fromEntries(
      purposes.map(p => [p, "noreply"]),
    );
    setConfig({ ...config, identities: nextIds, assignments: nextAssignments });
  };

  const updateIdentity = (id: string, patch: Partial<MailIdentity>) => {
    if (!config) return;
    setConfig({
      ...config,
      identities: config.identities.map(i => i.id === id ? { ...i, ...patch } : i),
    });
  };

  const setAllAutoEmails = (enabled: boolean) => {
    if (!config) return;
    const next = { ...config.autoEmails };
    for (const p of purposes) {
      next[p] = { ...(next[p] || { subject: "" }), enabled };
    }
    setConfig({ ...config, autoEmails: next });
  };

  const groupedPurposes = GROUP_ORDER.map(group => ({
    group,
    items: purposes.filter(p => purposeMeta[p]?.group === group),
  })).filter(g => g.items.length > 0);

  const enabledCount = config
    ? purposes.filter(p => config.autoEmails[p]?.enabled !== false).length
    : 0;

  const previewFrom = (purpose: string) => {
    if (resolvedFrom[purpose]) return resolvedFrom[purpose];
    const noreply = config?.identities.find(i => i.id === "noreply");
    if (noreply?.address) return `${noreply.name} <${noreply.address}>`;
    return summary?.smtp.from?.toLowerCase().includes("noreply@")
      ? summary.smtp.from
      : "Kuber Quant <noreply@kuberquant.com>";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5 text-sky-400" />
            Email &amp; Communication
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Configure SMTP, manage sender mail IDs, and control automated user emails. All notification emails are sent from the No Reply address only.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loadError && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="pt-4 text-sm text-amber-300">{loadError}</CardContent>
        </Card>
      )}

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Server className="h-4 w-4 text-sky-400" />
                <span className="text-sm font-medium">SMTP Outbound</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-1">
                {summary.smtp.configured ? (
                  <Badge className="bg-green-500/20 text-green-400 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Configured</Badge>
                ) : (
                  <Badge className="bg-orange-500/20 text-orange-400 text-xs"><AlertCircle className="h-3 w-3 mr-1" />Not configured</Badge>
                )}
                {!summary.smtp.enabled && <Badge variant="outline" className="text-xs">Disabled</Badge>}
                {summary.smtp.envFallback && <Badge variant="outline" className="text-xs text-blue-400">.env fallback</Badge>}
              </div>
              <p className="text-xs text-muted-foreground truncate">{summary.smtp.from}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Inbox className="h-4 w-4 text-violet-400" />
                <span className="text-sm font-medium">Support Inbox</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-1">
                {summary.inbox.configured ? (
                  <Badge className="bg-green-500/20 text-green-400 text-xs">IMAP configured</Badge>
                ) : (
                  <Badge className="bg-orange-500/20 text-orange-400 text-xs">Not configured</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{summary.inbox.address || "support@kuberquant.com"}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-1">Sender Mail IDs</p>
              <p className="text-2xl font-bold text-amber-400">{summary.identities}</p>
              <p className="text-xs text-muted-foreground">Custom + default identities</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-1">Auto Emails</p>
              <p className="text-2xl font-bold text-green-400">
                {summary.autoEmailsEnabled}/{summary.autoEmailsTotal}
              </p>
              <p className="text-xs text-muted-foreground">Enabled automated events</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="smtp" className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto">
          <TabsTrigger value="smtp">SMTP Server</TabsTrigger>
          <TabsTrigger value="identities">Mail Addresses</TabsTrigger>
          <TabsTrigger value="routing">Purpose Routing</TabsTrigger>
          <TabsTrigger value="automation">
            Auto Emails ({enabledCount}/{purposes.length || DEFAULT_EMAIL_PURPOSES.length})
          </TabsTrigger>
          <TabsTrigger value="inbox">Support Inbox (IMAP)</TabsTrigger>
          <TabsTrigger value="desk">Mail Desk (SaaS)</TabsTrigger>
        </TabsList>

        <TabsContent value="smtp" className="space-y-4">
          <MailSettingsPanel />
        </TabsContent>

        <TabsContent value="inbox">
          <SupportInboxSettingsPanel />
        </TabsContent>

        <TabsContent value="desk">
          <SupportMailDeskSettingsPanel apiBase="/super-admin/settings/mail-desk" />
        </TabsContent>

        <TabsContent value="identities">
          {loading || !config ? (
            <ConfigTabSkeleton />
          ) : (
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Sender Mail IDs</CardTitle>
                  <CardDescription>
                    Define outbound addresses. Notification emails always use the No Reply identity; other IDs are kept for reference only.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={addIdentity}>
                    <Plus className="h-4 w-4 mr-1" />Add Mail ID
                  </Button>
                  <Button size="sm" className="bg-amber-500 text-black" onClick={saveRouting} disabled={saving}>
                    <Save className="h-4 w-4 mr-1" />{saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {config.identities.map(identity => (
                  <div key={identity.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 rounded-lg border border-white/10 bg-white/[0.02] items-end">
                    <div className="md:col-span-2">
                      <Label className="text-xs">ID</Label>
                      <Input value={identity.id} disabled className="bg-white/5 border-white/10 font-mono text-xs" />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Label</Label>
                      <Input value={identity.label} onChange={e => updateIdentity(identity.id, { label: e.target.value })} className="bg-white/5 border-white/10" />
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-xs">Display Name</Label>
                      <Input value={identity.name} onChange={e => updateIdentity(identity.id, { name: e.target.value })} className="bg-white/5 border-white/10" />
                    </div>
                    <div className="md:col-span-4">
                      <Label className="text-xs">Email Address</Label>
                      <Input
                        value={identity.address}
                        onChange={e => updateIdentity(identity.id, { address: e.target.value })}
                        placeholder={identity.id === "default" ? "Uses SMTP From address" : "mail@domain.com"}
                        disabled={identity.id === "default"}
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      {identity.id !== "default" && (
                        <Button size="icon" variant="ghost" className="text-red-400" onClick={() => removeIdentity(identity.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="routing">
          {loading || !config ? (
            <ConfigTabSkeleton />
          ) : (
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Notification Sender (No Reply Only)</CardTitle>
                  <CardDescription>
                    All automated notification emails (OTP, deposits, KYC, tickets, broadcasts) are sent from the No Reply address only.
                    Configure the noreply address under Mail IDs.
                  </CardDescription>
                </div>
                <Button size="sm" className="bg-amber-500 text-black" onClick={saveRouting} disabled={saving}>
                  <Save className="h-4 w-4 mr-1" />{saving ? "Saving..." : "Save"}
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead>Purpose</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Sender Mail ID</TableHead>
                      <TableHead>Resolved From</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purposes.map(purpose => (
                      <TableRow key={purpose} className="border-white/10">
                        <TableCell>
                          <p className="font-medium text-sm">{purposeMeta[purpose]?.label || purpose}</p>
                          <p className="text-xs text-muted-foreground">{purposeMeta[purpose]?.description}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{purposeMeta[purpose]?.group}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-zinc-500/20 text-zinc-300">No Reply (fixed)</Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-[10px] text-muted-foreground break-all">{previewFrom(purpose)}</code>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          {loading || !config ? (
            <ConfigTabSkeleton />
          ) : (
            <>
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Send className="h-4 w-4 text-amber-400" />
                      Automated User Communications
                    </CardTitle>
                    <CardDescription>
                      Enable or disable automatic emails and customize subject lines for registration, OTP, deposits, withdrawals, KYC, and more.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => setAllAutoEmails(true)}>Enable all</Button>
                    <Button size="sm" variant="outline" onClick={() => setAllAutoEmails(false)}>Disable all</Button>
                    <Button size="sm" className="bg-amber-500 text-black" onClick={saveRouting} disabled={saving}>
                      <Save className="h-4 w-4 mr-1" />{saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {groupedPurposes.map(({ group, items }) => (
                    <div key={group}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{group}</p>
                      <div className="space-y-3">
                        {items.map(purpose => {
                          const auto = config.autoEmails[purpose] || { enabled: true, subject: "" };
                          return (
                            <div key={purpose} className="flex flex-col md:flex-row md:items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/[0.02]">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{purposeMeta[purpose]?.label}</p>
                                <p className="text-xs text-muted-foreground">{purposeMeta[purpose]?.description}</p>
                              </div>
                              <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
                                <Switch
                                  checked={auto.enabled !== false}
                                  onCheckedChange={v => setConfig({
                                    ...config,
                                    autoEmails: { ...config.autoEmails, [purpose]: { ...auto, enabled: v } },
                                  })}
                                />
                                <Input
                                  value={auto.subject || ""}
                                  onChange={e => setConfig({
                                    ...config,
                                    autoEmails: { ...config.autoEmails, [purpose]: { ...auto, subject: e.target.value } },
                                  })}
                                  placeholder="Email subject line"
                                  className="bg-white/5 border-white/10 w-full md:w-72"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-base">Send Test Email by Purpose</CardTitle>
                  <CardDescription>
                    Verify SMTP and purpose routing by sending a test message with the resolved sender and subject.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-3">
                  <Select value={testPurpose} onValueChange={setTestPurpose}>
                    <SelectTrigger className="bg-white/5 border-white/10 sm:w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {purposes.map(p => (
                        <SelectItem key={p} value={p}>{purposeMeta[p]?.label || p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={testTo}
                    onChange={e => setTestTo(e.target.value)}
                    placeholder="you@company.com"
                    className="bg-white/5 border-white/10 flex-1"
                  />
                  <Button onClick={sendPurposeTest} disabled={testing} className="bg-amber-500 text-black shrink-0">
                    {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" />Send test</>}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="pt-6 text-sm text-muted-foreground space-y-2">
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    <Settings2 className="h-4 w-4" /> Covered events
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Registration welcome email after signup</li>
                    <li>OTP codes for login, verify, password reset</li>
                    <li>Deposit &amp; withdrawal submitted, approved, rejected</li>
                    <li>KYC submitted, approved, rejected</li>
                    <li>Support ticket replies and admin broadcast announcements</li>
                  </ul>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
