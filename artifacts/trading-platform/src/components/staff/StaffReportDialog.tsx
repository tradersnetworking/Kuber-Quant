import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldAlert, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { submitStaffReport } from "@/lib/staff-api";

type Props = {
  subjectUserId: number;
  subjectUserName?: string;
  role: "support" | "manager";
  trigger?: React.ReactNode;
  onSuccess?: () => void;
};

const ISSUE_TYPES = [
  "KYC Issue",
  "Transaction / Payment",
  "Wallet Balance",
  "Withdrawal Blocked",
  "Account Access",
  "Trading / MT Account",
  "Compliance",
  "Other",
];

export function StaffReportDialog({
  subjectUserId,
  subjectUserName,
  role,
  trigger,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [issueType, setIssueType] = useState("Transaction / Payment");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"medium" | "high" | "urgent">("high");

  const reset = () => {
    setIssueType("Transaction / Payment");
    setSubject("");
    setMessage("");
    setPriority("high");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setLoading(true);
    try {
      const result = await submitStaffReport(role, {
        subjectUserId,
        issueType,
        subject: subject.trim(),
        message: message.trim(),
        priority,
      });
      toast({
        title: "Report sent to Super Admin",
        description: `Escalation #${result.ticketId} created. Super Admin will review and resolve.`,
      });
      setOpen(false);
      reset();
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Could not submit report", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="gap-2 border-amber-500/40 text-amber-700 dark:text-amber-400">
            <ShieldAlert className="h-4 w-4" />
            Report to Super Admin
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-background border-border dark:border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Report issue to Super Admin
          </DialogTitle>
          <DialogDescription>
            Read-only access — you cannot edit this account. Describe the issue and Super Admin will take action.
            {subjectUserName ? ` Investor: ${subjectUserName}` : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Issue type</Label>
            <Select value={issueType} onValueChange={setIssueType}>
              <SelectTrigger className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ISSUE_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input
              required
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Brief summary for Super Admin"
              className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Details</Label>
            <Textarea
              required
              rows={4}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="What did the investor report? What have you checked? What action is needed?"
              className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={v => setPriority(v as typeof priority)}>
              <SelectTrigger className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-semibold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Send to Super Admin
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
