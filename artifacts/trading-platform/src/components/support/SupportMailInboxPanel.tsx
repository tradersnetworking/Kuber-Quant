import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import {
  Mail, RefreshCw, Send, Inbox, AlertTriangle, HelpCircle, ShieldAlert,
  Archive, Ticket, Plus, Search, UserCircle2, Clock, MessageSquare, Users, Paperclip,
} from "lucide-react";
import { staffFetch } from "@/lib/staff-api";
import { cn } from "@/lib/utils";
import { KpiStatCard } from "@/components/ui/KpiStatCard";
import { STAFF_CARD, STAFF_HEADER_ROW, STAFF_PAGE_STACK, STAFF_STAT_GRID } from "@/lib/staff-dashboard-ui";
import { APP_ACTION_ROW } from "@/lib/ui-system";
import { MailAttachmentPicker, type MailAttachment } from "@/components/support/MailAttachmentPicker";
import { SecureUploadPreviewDialog } from "@/components/SecureUploadPreviewDialog";

export interface SupportMailMessage {
  id: number;
  threadId: string;
  direction: string;
  fromEmail: string;
  fromName: string | null;
  toEmail: string;
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  category: string;
  status: string;
  priority: string;
  ticketId: number | null;
  userId: number | null;
  userEmail: string | null;
  userName: string | null;
  assignedToUserId: number | null;
  assignedToName: string | null;
  slaDueAt: string | null;
  slaStatus: string;
  receivedAt: string;
  attachments?: MailAttachment[];
}

export interface SupportMailThread {
  threadId: string;
  subject: string;
  fromEmail: string;
  fromName: string | null;
  category: string;
  status: string;
  priority: string;
  ticketId: number | null;
  userName: string | null;
  assignedToName: string | null;
  assignedToUserId: number | null;
  slaStatus: string;
  messageCount: number;
  lastMessageAt: string;
  preview: string;
  latestMessageId: number;
}

interface MailStats {
  total: number;
  threads: number;
  unread: number;
  unassigned: number;
  myQueue: number;
  slaBreached: number;
  queries: number;
  complaints: number;
  disputes: number;
  today: number;
}

interface Agent { id: number; email: string; fullName: string | null; role: string }
interface Template { id: number; name: string; category: string; subject: string | null; body: string }

interface SupportMailInboxPanelProps {
  title?: string;
  description?: string;
  apiBase?: string;
  compact?: boolean;
}

const FOLDERS = [
  { id: "all", label: "All Conversations", icon: Inbox },
  { id: "unread", label: "Unread", icon: Mail },
  { id: "unassigned", label: "Unassigned", icon: Users },
  { id: "mine", label: "My Queue", icon: UserCircle2 },
  { id: "archived", label: "Archived", icon: Archive },
];

const CATEGORIES = [
  { id: "all", label: "All types" },
  { id: "query", label: "Queries" },
  { id: "complaint", label: "Complaints" },
  { id: "dispute", label: "Disputes" },
];

function slaBadge(status: string) {
  if (status === "breached") return "bg-red-500/20 text-red-400 border-red-500/30";
  if (status === "due_soon") return "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30";
  if (status === "met") return "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30";
  return "bg-muted text-muted-foreground border-zinc-500/30";
}

function priorityBadge(priority: string) {
  if (priority === "urgent") return "bg-red-500/20 text-red-400";
  if (priority === "high") return "bg-orange-500/20 text-orange-600 dark:text-orange-400";
  if (priority === "medium") return "bg-blue-500/20 text-blue-600 dark:text-blue-400";
  return "bg-muted text-muted-foreground";
}

function categoryIcon(category: string) {
  if (category === "complaint") return ShieldAlert;
  if (category === "dispute") return AlertTriangle;
  if (category === "query") return HelpCircle;
  return MessageSquare;
}

export function SupportMailInboxPanel({
  title = "Support Mail Desk",
  description = "Complete SaaS helpdesk for support@kuberquant.com — threaded conversations, agent assignment, SLA tracking, and ticket linking.",
  apiBase = "/support-team/mail",
  compact = false,
}: SupportMailInboxPanelProps) {
  const { toast } = useToast();
  const [threads, setThreads] = useState<SupportMailThread[]>([]);
  const [conversation, setConversation] = useState<SupportMailMessage[]>([]);
  const [stats, setStats] = useState<MailStats | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [folder, setFolder] = useState("all");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedThread, setSelectedThread] = useState<SupportMailThread | null>(null);
  const [reply, setReply] = useState("");
  const [pending, setPending] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [compose, setCompose] = useState({ to: "", subject: "", body: "" });
  const [composeAttachments, setComposeAttachments] = useState<MailAttachment[]>([]);
  const [replyAttachments, setReplyAttachments] = useState<MailAttachment[]>([]);
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<string | null>(null);
  const [logForm, setLogForm] = useState({ fromEmail: "", fromName: "", subject: "", body: "", category: "general" });
  const [compactDialogOpen, setCompactDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (folder !== "all") params.set("folder", folder);
      if (category !== "all") params.set("category", category);
      if (search.trim()) params.set("q", search.trim());

      const [threadList, mailStats, agentList, templateList] = await Promise.all([
        staffFetch<SupportMailThread[]>(`${apiBase}/threads?${params}`),
        staffFetch<MailStats>(`${apiBase}/stats`),
        staffFetch<Agent[]>(`${apiBase}/agents`),
        staffFetch<Template[]>(`${apiBase}/templates`),
      ]);
      setThreads(threadList);
      setStats(mailStats);
      setAgents(agentList);
      setTemplates(templateList);
    } catch (e: any) {
      toast({ title: "Failed to load mail desk", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [apiBase, folder, category, search, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (compact) return;
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [load, compact]);

  const openThread = async (thread: SupportMailThread) => {
    setSelectedThread(thread);
    setReply("");
    setReplyAttachments([]);
    if (compact) setCompactDialogOpen(true);
    try {
      const msgs = await staffFetch<SupportMailMessage[]>(`${apiBase}/threads/${encodeURIComponent(thread.threadId)}`);
      setConversation(msgs);
      const unread = msgs.find(m => m.status === "unread" && m.direction === "inbound");
      if (unread) {
        await staffFetch(`${apiBase}/${unread.id}/read`, { method: "POST" });
        load();
      }
    } catch (e: any) {
      toast({ title: "Could not load conversation", description: e.message, variant: "destructive" });
      if (compact) setCompactDialogOpen(false);
    }
  };

  const syncInbox = async () => {
    setSyncing(true);
    try {
      const result = await staffFetch<{ synced: number; message: string }>(`${apiBase}/sync`, { method: "POST" });
      toast({ title: result.message });
      await load();
      if (selectedThread) {
        const updated = threads.find(t => t.threadId === selectedThread.threadId);
        if (updated) await openThread(updated);
      }
    } catch (e: any) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const sendReply = async () => {
    const latestInbound = [...conversation].reverse().find(m => m.direction === "inbound") || conversation[conversation.length - 1];
    if (!latestInbound || (!reply.trim() && replyAttachments.length === 0)) return;
    setPending(true);
    try {
      await staffFetch(`${apiBase}/${latestInbound.id}/reply`, {
        method: "POST",
        body: JSON.stringify({
          body: reply.trim() || "(See attachments)",
          attachmentIds: replyAttachments.map(a => a.id),
        }),
      });
      toast({ title: "Reply sent to client" });
      setReply("");
      setReplyAttachments([]);
      await load();
      if (selectedThread) await openThread(selectedThread);
    } catch (e: any) {
      toast({ title: "Reply failed", description: e.message, variant: "destructive" });
    } finally {
      setPending(false);
    }
  };

  const assignAgent = async (messageId: number, assignedToUserId: string) => {
    try {
      await staffFetch(`${apiBase}/${messageId}/assign`, {
        method: "POST",
        body: JSON.stringify({ assignedToUserId: assignedToUserId === "none" ? null : parseInt(assignedToUserId, 10) }),
      });
      toast({ title: "Agent assigned" });
      await load();
      if (selectedThread) await openThread(selectedThread);
    } catch (e: any) {
      toast({ title: "Assign failed", description: e.message, variant: "destructive" });
    }
  };

  const applyTemplate = (template: Template) => {
    const root = conversation.find(m => m.direction === "inbound") || conversation[0];
    const vars: Record<string, string> = {
      userName: root?.userName || root?.fromName || "Customer",
      userEmail: root?.userEmail || root?.fromEmail || "",
      ticketId: root?.ticketId ? String(root.ticketId) : "",
      subject: root?.subject || "",
    };
    let body = template.body;
    for (const [k, v] of Object.entries(vars)) body = body.replaceAll(`{{${k}}}`, v);
    setReply(body);
  };

  const statCards = [
    { label: "Unread", value: stats?.unread, color: "text-rose-600 dark:text-rose-400" },
    { label: "Unassigned", value: stats?.unassigned, color: "text-amber-600 dark:text-amber-400" },
    { label: "My Queue", value: stats?.myQueue, color: "text-sky-600 dark:text-sky-400" },
    { label: "SLA Breached", value: stats?.slaBreached, color: "text-red-400" },
    { label: "Today", value: stats?.today, color: "text-green-700 dark:text-green-400" },
  ];

  const rootMessage = conversation.find(m => m.direction === "inbound") || conversation[0];

  const conversationBody = selectedThread && conversation.length > 0 ? (
    <>
      <div className="space-y-3 border-b border-border dark:border-white/10 pb-3 mb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm">{selectedThread.subject}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedThread.fromName || selectedThread.fromEmail}
              {selectedThread.userName && ` · Platform: ${selectedThread.userName}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {rootMessage?.ticketId ? (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs">Ticket #{rootMessage.ticketId}</Badge>
            ) : rootMessage ? (
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={pending} onClick={async () => {
                setPending(true);
                try {
                  const r = await staffFetch<{ ticketId: number }>(`${apiBase}/${rootMessage.id}/create-ticket`, { method: "POST" });
                  toast({ title: `Ticket #${r.ticketId} created` });
                  await load();
                  await openThread(selectedThread);
                } catch (e: any) {
                  toast({ title: "Failed", description: e.message, variant: "destructive" });
                } finally { setPending(false); }
              }}>
                <Ticket className="h-3 w-3 mr-1" />Create Ticket
              </Button>
            ) : null}
            {rootMessage && (
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={async () => {
                await staffFetch(`${apiBase}/${rootMessage.id}`, { method: "PATCH", body: JSON.stringify({ status: "archived" }) });
                toast({ title: "Archived" });
                setSelectedThread(null);
                setConversation([]);
                setCompactDialogOpen(false);
                load();
              }}>
                <Archive className="h-3 w-3 mr-1" />Archive
              </Button>
            )}
          </div>
        </div>
        {rootMessage && (
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-xs text-muted-foreground">Assign to</Label>
            <Select
              value={rootMessage.assignedToUserId ? String(rootMessage.assignedToUserId) : "none"}
              onValueChange={v => assignAgent(rootMessage.id, v)}
            >
              <SelectTrigger className="h-8 w-40 bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 text-xs">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {agents.map(a => (
                  <SelectItem key={a.id} value={String(a.id)}>{a.fullName || a.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {rootMessage.slaDueAt && (
              <Badge variant="outline" className={cn("text-xs", slaBadge(rootMessage.slaStatus))}>
                <Clock className="h-3 w-3 mr-1" />
                SLA: {format(new Date(rootMessage.slaDueAt), "MMM d, HH:mm")}
              </Badge>
            )}
          </div>
        )}
      </div>
      <ScrollArea className={compact ? "max-h-[min(50vh,360px)]" : "flex-1 max-h-[280px]"}>
        <div className="space-y-3 pr-2">
          {conversation.map(msg => (
            <div
              key={msg.id}
              className={cn(
                "rounded-lg p-3 border max-w-[95%]",
                msg.direction === "outbound"
                  ? "ml-auto bg-amber-500/10 border-amber-500/20"
                  : "mr-auto bg-muted/60 dark:bg-white/5 border-border dark:border-white/10",
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs font-medium">
                  {msg.direction === "outbound" ? "Support Team" : msg.fromName || msg.fromEmail}
                </p>
                <span className="text-[10px] text-muted-foreground">{format(new Date(msg.receivedAt), "PPp")}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{msg.bodyText || "(No content)"}</p>
              {!!msg.attachments?.length && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {msg.attachments.map(att => (
                    <Button
                      key={att.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setPreviewAttachmentUrl(att.url)}
                    >
                      <Paperclip className="h-3 w-3 mr-1" />
                      {att.filename}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="border-t border-border dark:border-white/10 pt-3 mt-3 space-y-2">
        {templates.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {templates.slice(0, 4).map(t => (
              <Button key={t.id} variant="outline" size="sm" className="text-xs h-7" onClick={() => applyTemplate(t)}>
                {t.name}
              </Button>
            ))}
          </div>
        )}
        <Textarea
          value={reply}
          onChange={e => setReply(e.target.value)}
          placeholder="Reply to client..."
          rows={3}
          className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"
        />
        <MailAttachmentPicker
          apiBase={apiBase}
          attachments={replyAttachments}
          onChange={setReplyAttachments}
          disabled={pending}
        />
        <Button size="sm" className="bg-amber-500 text-black w-full sm:w-auto" onClick={sendReply} disabled={pending || (!reply.trim() && replyAttachments.length === 0)}>
          <Send className="h-4 w-4 mr-1" />Send Reply
        </Button>
      </div>
    </>
  ) : null;

  return (
    <div className={compact ? "space-y-4 min-w-0" : STAFF_PAGE_STACK}>
      {!compact && title && (
        <div className={STAFF_HEADER_ROW}>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Inbox className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" />
              {title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          <div className={APP_ACTION_ROW}>
            <Button variant="outline" size="sm" onClick={() => setLogOpen(true)}><Plus className="h-4 w-4 mr-1" />Log Email</Button>
            <Button variant="outline" size="sm" onClick={() => setComposeOpen(true)}><Send className="h-4 w-4 mr-1" />Compose</Button>
            <Button variant="outline" size="sm" onClick={syncInbox} disabled={syncing}>
              <RefreshCw className={cn("h-4 w-4 mr-1", syncing && "animate-spin")} />Sync Inbox
            </Button>
          </div>
        </div>
      )}

      {compact && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={syncInbox} disabled={syncing}>
            <RefreshCw className={cn("h-4 w-4 mr-1", syncing && "animate-spin")} />Sync
          </Button>
          <Button variant="outline" size="sm" onClick={() => setComposeOpen(true)}><Send className="h-4 w-4 mr-1" />Compose</Button>
        </div>
      )}

      {!compact && (
        <div className={STAFF_STAT_GRID}>
          {statCards.map(c => (
            <KpiStatCard
              key={c.label}
              compact
              label={c.label}
              loading={loading}
              value={c.value ?? 0}
              iconClassName={c.color}
            />
          ))}
        </div>
      )}

      <div className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-12 min-h-[560px]")}>
        {/* Folders sidebar */}
        {!compact && (
          <Card className={cn(STAFF_CARD, "xl:col-span-2")}>
            <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Mailboxes</CardTitle></CardHeader>
            <CardContent className="p-2 space-y-1">
              {FOLDERS.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFolder(f.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                    folder === f.id ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20" : "hover:bg-muted/80 dark:hover:bg-muted/60 dark:bg-white/5 text-muted-foreground",
                  )}
                >
                  <f.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{f.label}</span>
                  {f.id === "unread" && stats?.unread ? <Badge className="ml-auto text-[10px]">{stats.unread}</Badge> : null}
                  {f.id === "unassigned" && stats?.unassigned ? <Badge className="ml-auto text-[10px]">{stats.unassigned}</Badge> : null}
                </button>
              ))}
              <div className="pt-3 border-t border-border dark:border-white/10 mt-2">
                <p className="text-[10px] uppercase text-muted-foreground px-3 mb-2">Category</p>
                {CATEGORIES.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={cn(
                      "w-full text-left px-3 py-1.5 rounded text-xs",
                      category === c.id ? "text-amber-600 dark:text-amber-400 bg-muted/60 dark:bg-white/5" : "text-muted-foreground hover:bg-muted/80 dark:hover:bg-muted/60 dark:bg-white/5",
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Thread list */}
        <Card className={cn(STAFF_CARD, compact ? "col-span-1" : "xl:col-span-3")}>
          <CardHeader className="pb-2 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 h-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className={compact ? "h-[280px]" : "h-[480px]"}>
              {loading ? (
                <div className="p-4 space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
              ) : !threads.length ? (
                <p className="text-sm text-muted-foreground p-6 text-center">No conversations. Sync IMAP or log an email.</p>
              ) : (
                threads.map(thread => {
                  const Icon = categoryIcon(thread.category);
                  return (
                    <button
                      key={thread.threadId}
                      type="button"
                      onClick={() => openThread(thread)}
                      className={cn(
                        "w-full text-left p-3 border-b border-border/80 dark:border-white/5 hover:bg-muted/80 dark:hover:bg-muted/60 dark:bg-white/5 cursor-pointer transition-colors",
                        selectedThread?.threadId === thread.threadId && "bg-muted dark:bg-white/10 border-l-2 border-l-amber-500",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className={cn("text-sm truncate", thread.status === "unread" && "font-semibold")}>{thread.subject}</p>
                            {thread.messageCount > 1 && (
                              <Badge variant="outline" className="text-[10px] px-1">{thread.messageCount}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{thread.fromName || thread.fromEmail}</p>
                          <p className="text-[11px] text-muted-foreground truncate mt-1">{thread.preview}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            <Badge variant="outline" className={cn("text-[10px]", priorityBadge(thread.priority))}>{thread.priority}</Badge>
                            <Badge variant="outline" className={cn("text-[10px]", slaBadge(thread.slaStatus))}>
                              {thread.slaStatus === "breached" ? "SLA breached" : thread.slaStatus === "due_soon" ? "Due soon" : "SLA OK"}
                            </Badge>
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: true })}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Conversation */}
        {!compact && (
          <Card className={cn(STAFF_CARD, "xl:col-span-7 flex flex-col min-w-0")}>
            {!selectedThread || !conversation.length ? (
              <CardContent className="flex flex-col items-center justify-center flex-1 py-24 text-muted-foreground">
                <Mail className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">Select a conversation to view the thread and reply</p>
                <p className="text-xs mt-1">Auto-sync runs every 5 minutes when IMAP is configured</p>
              </CardContent>
            ) : (
              <CardContent className="flex flex-col flex-1 p-4 min-h-0">
                {conversationBody}
              </CardContent>
            )}
          </Card>
        )}
      </div>

      {compact && (
        <Dialog
          open={compactDialogOpen}
          onOpenChange={open => {
            setCompactDialogOpen(open);
            if (!open) {
              setSelectedThread(null);
              setConversation([]);
              setReply("");
            }
          }}
        >
          <DialogContent className="bg-background border-border dark:border-white/10 max-w-2xl max-h-[min(90dvh,720px)] flex flex-col p-0 gap-0 overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-3 border-b border-border dark:border-white/10 shrink-0">
              <DialogTitle className="flex items-center gap-2 text-left">
                <MessageSquare className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                Client Conversation
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
              {!selectedThread || !conversation.length ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                conversationBody
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={composeOpen} onOpenChange={open => {
        setComposeOpen(open);
        if (!open) setComposeAttachments([]);
      }}>
        <DialogContent className="bg-[#0a1628] border-border dark:border-white/10">
          <DialogHeader><DialogTitle>Compose Email</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>To</Label><Input value={compose.to} onChange={e => setCompose(c => ({ ...c, to: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
            <div><Label>Subject</Label><Input value={compose.subject} onChange={e => setCompose(c => ({ ...c, subject: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
            <div><Label>Message</Label><Textarea value={compose.body} onChange={e => setCompose(c => ({ ...c, body: e.target.value }))} rows={5} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
            <MailAttachmentPicker
              apiBase={apiBase}
              attachments={composeAttachments}
              onChange={setComposeAttachments}
              disabled={pending}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
            <Button className="bg-amber-500 text-black" disabled={pending} onClick={async () => {
              setPending(true);
              try {
                await staffFetch(`${apiBase}/send`, {
                  method: "POST",
                  body: JSON.stringify({
                    ...compose,
                    attachmentIds: composeAttachments.map(a => a.id),
                  }),
                });
                toast({ title: "Email sent" });
                setComposeOpen(false);
                setComposeAttachments([]);
                load();
              } catch (e: any) {
                toast({ title: "Send failed", description: e.message, variant: "destructive" });
              } finally { setPending(false); }
            }}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="bg-[#0a1628] border-border dark:border-white/10">
          <DialogHeader><DialogTitle>Log Incoming Email</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>From Email</Label><Input value={logForm.fromEmail} onChange={e => setLogForm(f => ({ ...f, fromEmail: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
            <div><Label>Subject</Label><Input value={logForm.subject} onChange={e => setLogForm(f => ({ ...f, subject: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
            <div><Label>Message</Label><Textarea value={logForm.body} onChange={e => setLogForm(f => ({ ...f, body: e.target.value }))} rows={4} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogOpen(false)}>Cancel</Button>
            <Button className="bg-amber-500 text-black" disabled={pending} onClick={async () => {
              setPending(true);
              try {
                await staffFetch(`${apiBase}/log`, { method: "POST", body: JSON.stringify(logForm) });
                toast({ title: "Email logged" });
                setLogOpen(false);
                load();
              } catch (e: any) {
                toast({ title: "Failed", description: e.message, variant: "destructive" });
              } finally { setPending(false); }
            }}>Log Email</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SecureUploadPreviewDialog
        open={!!previewAttachmentUrl}
        onOpenChange={open => { if (!open) setPreviewAttachmentUrl(null); }}
        url={previewAttachmentUrl}
        title="Mail attachment"
      />
    </div>
  );
}
