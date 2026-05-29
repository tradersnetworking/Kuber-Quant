import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Download, Shield, Database, FileSpreadsheet, FileJson, Archive, Lock, AlertTriangle,
} from "lucide-react";
import { apiPath, authFetch } from "@/lib/token-store";

type BackupCategory = {
  id: string;
  label: string;
  description: string;
};

const FORMATS = [
  { id: "xlsx", label: "Excel (.xlsx)", icon: FileSpreadsheet },
  { id: "csv", label: "CSV (Excel-compatible)", icon: FileSpreadsheet },
  { id: "json", label: "JSON (restore-ready)", icon: FileJson },
  { id: "zip", label: "ZIP bundle", icon: Archive, fullOnly: true },
] as const;

const CATEGORIES: BackupCategory[] = [
  { id: "users", label: "Users Data", description: "Accounts, profiles, payout methods" },
  { id: "system", label: "System Data", description: "Settings, catalogs, tickets, audit logs" },
  { id: "transactions", label: "Transactional Data", description: "Deposits, withdrawals, ledger, login history" },
  { id: "kyc", label: "Users KYC", description: "All KYC verification records" },
  { id: "investments", label: "Investment Data", description: "Investments and ROI payouts" },
  { id: "algo", label: "Algo Trading", description: "Algo subscriptions and strategies" },
  { id: "copy", label: "Copy Trading", description: "Copy follows and traders" },
  { id: "mt5", label: "MT4/MT5 Accounts", description: "Linked accounts and relay requests" },
  { id: "full", label: "Complete Backup", description: "All data in one ZIP (CSV + JSON + Excel per table)" },
];

async function downloadBackup(category: string, format: string) {
  const url = apiPath(`/super-admin/backup/export/${category}?format=${format}`);
  const res = await authFetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Download failed");
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] || `kuber-backup-${category}.${format === "zip" ? "zip" : format}`;
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

function CategoryPanel({ category }: { category: BackupCategory }) {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState<string | null>(null);
  const isFull = category.id === "full";

  const handleDownload = async (format: string) => {
    setDownloading(format);
    try {
      await downloadBackup(category.id, isFull ? "zip" : format);
      toast({ title: "Backup downloaded", description: `${category.label} exported successfully.` });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const formats = FORMATS.filter(f => !("fullOnly" in f && f.fullOnly) || isFull);

  return (
    <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="h-4 w-4 text-emerald-500" />
          {category.label}
        </CardTitle>
        <CardDescription>{category.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {formats.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={!!downloading}
            onClick={() => handleDownload(id)}
          >
            <Icon className="h-3.5 w-3.5" />
            {downloading === id ? "Exporting…" : label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

export function BackupExportPanel() {
  const [tab, setTab] = useState("users");

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
          <Archive className="h-5 w-5 text-emerald-500" />
          Backup & Export
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Download platform data for disaster recovery and compliance. Passwords, 2FA secrets, and encrypted credentials are automatically redacted.
        </p>
      </div>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 flex gap-3 items-start">
          <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-medium flex items-center gap-2">
              Security notice
              <Badge variant="outline" className="text-[10px]">Super Admin only</Badge>
            </p>
            <ul className="text-muted-foreground text-xs space-y-1 list-disc pl-4">
              <li>All downloads are audit-logged with your IP and timestamp.</li>
              <li>Never share backup files publicly — they contain user PII.</li>
              <li>Store exports encrypted (password-protected ZIP or secure vault).</li>
              <li>Rate limited to 20 exports per 15 minutes to prevent abuse.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border dark:border-white/10">
        <CardContent className="p-4 flex gap-3 items-start">
          <Lock className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">What is excluded for safety</p>
            <p className="text-muted-foreground text-xs mt-1">
              Password hashes, 2FA secrets, MT trading passwords, and encrypted banking blobs are replaced with <code className="text-amber-600 dark:text-amber-400">[REDACTED]</code>.
              Restoring credentials requires users to reset passwords — this prevents backup files from becoming a hacking vector.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/60 dark:bg-white/5 border border-border dark:border-white/10 flex-wrap h-auto">
          {CATEGORIES.map(c => (
            <TabsTrigger key={c.id} value={c.id} className="text-xs sm:text-sm">
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {CATEGORIES.map(c => (
          <TabsContent key={c.id} value={c.id} className="mt-4 outline-none">
            {c.id === "full" && (
              <div className="mb-4 flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg p-3">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                Complete backup downloads a ZIP containing every table as CSV, JSON, and Excel files. This may take a moment on large databases.
              </div>
            )}
            <CategoryPanel category={c} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
