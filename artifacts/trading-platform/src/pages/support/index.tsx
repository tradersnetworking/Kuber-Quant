import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useListTickets, useCreateTicket, useGetTicket, useReplyTicket } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Plus, Send, Clock, User, ShieldCheck, ChevronRight, History } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { translateCategory, translatePriority, translateStatus } from "@/lib/i18n/translate-helpers";
import { AppPage } from "@/components/layout/AppPage";
import { APP_CARD, APP_DASHBOARD_SPLIT, APP_FORM_GRID, APP_MODAL_MD } from "@/lib/ui-system";
import { cn } from "@/lib/utils";

export default function SupportPage() {
  const { t } = useTranslation();
  const { data: tickets, isLoading, refetch } = useListTickets();
  const createMutation = useCreateTicket();
  const { toast } = useToast();

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    category: "General",
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      data: {
        subject: formData.subject,
        message: formData.message,
        priority: formData.priority as any,
        category: formData.category,
      }
    }, {
      onSuccess: () => {
        toast({ title: t("support.ticketCreated"), description: t("support.ticketCreatedDesc") });
        setFormData({ subject: "", message: "", priority: "medium", category: "General" });
        refetch();
      }
    });
  };

  return (
    <AppPage
      title={
        <h1 className="page-title bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
          {t("support.title")}
        </h1>
      }
      subtitle={t("support.subtitle")}
      actions={
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> {t("support.newTicket")}
              </Button>
            </DialogTrigger>
            <DialogContent className={cn(APP_MODAL_MD, "bg-background border-border dark:border-white/10")}>
              <DialogHeader>
                <DialogTitle>{t("support.createTicket")}</DialogTitle>
                <DialogDescription>{t("support.createTicketDesc")}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>{t("common.subject")}</Label>
                  <Input placeholder={t("support.subjectPlaceholder")} value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} required />
                </div>
                <div className={APP_FORM_GRID}>
                  <div className="space-y-2">
                    <Label>{t("common.category")}</Label>
                    <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General">{t("categories.general")}</SelectItem>
                        <SelectItem value="Query">{t("categories.query")}</SelectItem>
                        <SelectItem value="Complaint">{t("categories.complaint")}</SelectItem>
                        <SelectItem value="Account">{t("categories.account")}</SelectItem>
                        <SelectItem value="Payment">{t("categories.payment")}</SelectItem>
                        <SelectItem value="Trading">{t("categories.trading")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("common.priority")}</Label>
                    <Select value={formData.priority} onValueChange={v => setFormData({...formData, priority: v as any})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t("priority.low")}</SelectItem>
                        <SelectItem value="medium">{t("priority.medium")}</SelectItem>
                        <SelectItem value="high">{t("priority.high")}</SelectItem>
                        <SelectItem value="urgent">{t("priority.urgent")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("common.message")}</Label>
                  <Textarea 
                    placeholder={t("support.messagePlaceholder")} 
                    className="min-h-[120px]" 
                    value={formData.message} 
                    onChange={e => setFormData({...formData, message: e.target.value})} 
                    required 
                  />
                </div>
                <Button type="submit" className="w-full bg-amber-500 text-black font-bold" disabled={createMutation.isPending}>
                  {createMutation.isPending ? t("support.submitting") : t("support.sendTicket")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
      }
    >
        <div className={cn(APP_DASHBOARD_SPLIT, "lg:grid-cols-3 gap-6 lg:gap-8")}>
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">
              <History className="h-4 w-4" /> {t("support.recentTickets")}
            </h3>
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-3 pr-4">
                {isLoading ? (
                  [1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
                ) : tickets?.length ? (
                  tickets.map((ticket: any) => (
                    <Card 
                      key={ticket.id} 
                      className={`bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 hover:border-amber-500/30 transition-all cursor-pointer group ${selectedTicketId === ticket.id ? 'border-amber-500/50 bg-amber-500/5' : ''}`}
                      onClick={() => setSelectedTicketId(ticket.id)}
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <Badge className={
                            ticket.status === 'open' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 
                            ticket.status === 'resolved' ? 'bg-green-500/20 text-green-500 border-green-500/30' : 
                            'bg-platinum-white/10 text-muted-foreground border-border dark:border-white/10'
                          }>
                            {translateStatus(t, ticket.status)}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold group-hover:text-amber-600 dark:text-amber-400 transition-colors line-clamp-1">{ticket.subject}</p>
                          <p className="text-[10px] text-muted-foreground uppercase mt-1">{translateCategory(t, ticket.category)} • {translatePriority(t, ticket.priority)} {t("common.priority").toLowerCase()}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 bg-muted/60 dark:bg-white/5 border border-dashed border-border dark:border-white/10 rounded-xl">
                    <p className="text-xs text-muted-foreground">{t("support.noTicketsFound")}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="lg:col-span-2">
            {selectedTicketId ? (
              <TicketDetailView ticketId={selectedTicketId} />
            ) : (
              <Card className="h-full bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 flex flex-col items-center justify-center text-center p-12 min-h-[500px]">
                <div className="h-20 w-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
                  <MessageSquare className="h-10 w-10 text-amber-500/40" />
                </div>
                <h3 className="text-xl font-bold">{t("support.selectTicket")}</h3>
                <p className="text-muted-foreground max-w-xs mt-2">{t("support.selectTicketDesc")}</p>
              </Card>
            )}
          </div>
        </div>
    </AppPage>
  );
}

function TicketDetailView({ ticketId }: { ticketId: string }) {
  const { t } = useTranslation();
  const id = Number(ticketId);
  const { data: ticket, isLoading, refetch } = useGetTicket(id, { query: { enabled: id > 0 } as any });
  const replyMutation = useReplyTicket();
  const [replyMessage, setReplyMessage] = useState("");
  const { toast } = useToast();

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    replyMutation.mutate({
      id,
      data: { message: replyMessage }
    }, {
      onSuccess: () => {
        setReplyMessage("");
        refetch();
      },
      onError: (err: any) => {
        toast({ title: t("support.replyFailed"), description: err.message, variant: "destructive" });
      }
    });
  };

  if (isLoading || !ticket) return <Skeleton className="h-[600px] w-full rounded-xl" />;

  return (
    <Card className="h-full bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 flex flex-col min-h-[600px] overflow-hidden">
      <CardHeader className="border-b border-border/80 dark:border-white/5">
        <div className="flex justify-between items-center">
          <CardTitle>{ticket.subject}</CardTitle>
          <Badge variant="outline" className="border-amber-500/30 text-amber-500 uppercase text-[10px]">{translateStatus(t, ticket.status)}</Badge>
        </div>
        <CardDescription>{t("support.createdOn")} {new Date(ticket.createdAt).toLocaleString()}</CardDescription>
      </CardHeader>
      
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6">
          {/* Main Message */}
          <div className="flex gap-4">
             <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 text-xs font-bold shrink-0">U</div>
             <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">{t("support.you")}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(ticket.createdAt).toLocaleString()}</span>
                </div>
                <div className="bg-muted/60 dark:bg-white/5 rounded-2xl rounded-tl-none p-4 text-sm border border-border dark:border-white/10">
                  {ticket.message}
                </div>
             </div>
          </div>

          {/* Replies */}
          {ticket.replies?.map((reply: any) => (
            <div key={reply.id} className={`flex gap-4 ${reply.isAdmin ? '' : 'flex-row-reverse'}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${reply.isAdmin ? 'bg-amber-500 text-black' : 'bg-amber-500/20 text-amber-500'}`}>
                {reply.isAdmin ? 'K' : 'U'}
              </div>
              <div className={`flex-1 space-y-1 ${reply.isAdmin ? '' : 'text-right'}`}>
                 <div className={`flex items-center gap-2 ${reply.isAdmin ? '' : 'justify-end'}`}>
                   <span className="text-xs font-bold">{reply.isAdmin ? t("support.supportTeam") : t("support.you")}</span>
                   <span className="text-[10px] text-muted-foreground">{new Date(reply.createdAt).toLocaleString()}</span>
                 </div>
                 <div className={`rounded-2xl p-4 text-sm border ${
                   reply.isAdmin ? 'bg-amber-500/10 border-amber-500/20 rounded-tl-none' : 'bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 rounded-tr-none'
                 }`}>
                   {reply.message}
                 </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <CardFooter className="p-4 border-t border-border/80 dark:border-white/5">
        <form onSubmit={handleReply} className="w-full flex gap-2">
          <Input 
            placeholder={t("support.typeMessage")} 
            className="bg-muted/80 dark:bg-black/20 border-border dark:border-white/10 h-11" 
            value={replyMessage}
            onChange={e => setReplyMessage(e.target.value)}
          />
          <Button type="submit" size="icon" className="bg-amber-500 text-black h-11 w-11 shrink-0" disabled={replyMutation.isPending || ticket.status === 'resolved'}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
