import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText, Download, CheckCircle, Clock, AlertTriangle, PenTool,
  Shield, Eraser, Eye, Lock, XCircle
} from "lucide-react";
import { AgreementPdfViewDialog } from "@/components/agreements/AgreementPdfViewDialog";
import { fetchAgreementPdfBlob, fetchAgreementUserSettings } from "@/lib/agreements-api";
import { authFetchJson, authFetch, apiPath } from "@/lib/token-store";

const TYPE_LABELS: Record<string, string> = {
  investment: "Investment Agreement",
  profit_sharing: "Profit Sharing Agreement",
  ea_subscription: "EA Subscription Agreement",
  copy_trading: "Copy Trading Agreement",
  account_handling: "Account Handling Agreement",
  algo_trading: "Algo Trading Agreement",
  risk_disclosure: "Risk Disclosure",
  aml_kyc: "AML/KYC Declaration",
  privacy_policy: "Privacy Policy",
  terms_conditions: "Terms & Conditions",
  withdrawal_policy: "Withdrawal Policy",
};

const TYPE_ICONS: Record<string, typeof FileText> = {
  investment: FileText,
  profit_sharing: FileText,
  ea_subscription: Shield,
  copy_trading: Shield,
  account_handling: Shield,
  risk_disclosure: AlertTriangle,
  aml_kyc: CheckCircle,
  privacy_policy: Lock,
  terms_conditions: FileText,
  withdrawal_policy: FileText,
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending_signature: { label: "Pending Signature", color: "bg-amber-500/20 text-amber-600 dark:text-amber-400", icon: Clock },
  signed: { label: "Signed", color: "bg-green-500/20 text-green-700 dark:text-green-400", icon: CheckCircle },
  expired: { label: "Expired", color: "bg-muted text-muted-foreground", icon: XCircle },
  revoked: { label: "Revoked", color: "bg-red-500/20 text-red-400", icon: XCircle },
};

function SignatureCanvas({ onSigned }: { onSigned: (data: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0a1628";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    isDrawing.current = true;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSigned(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0a1628";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onSigned("");
  };

  return (
    <div className="space-y-2">
      <div className="relative rounded-xl overflow-hidden border border-amber-500/30">
        <canvas
          ref={canvasRef}
          width={500} height={150}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
          style={{ background: "#0a1628" }}
        />
        <div className="absolute bottom-2 left-3 text-xs text-muted-foreground/30 pointer-events-none">Draw your signature above</div>
      </div>
      <Button size="sm" variant="ghost" onClick={clear} className="text-xs text-muted-foreground hover:text-foreground">
        <Eraser className="h-3 w-3 mr-1" />Clear
      </Button>
    </div>
  );
}

export default function AgreementsPage() {
  const { toast } = useToast();
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [signing, setSigning] = useState(false);
  const [signatureData, setSignatureData] = useState("");
  const [downloading, setDownloading] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genType, setGenType] = useState("risk_disclosure");
  const [showGenDialog, setShowGenDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "signed" | "all">("pending");
  const [viewing, setViewing] = useState<any>(null);
  const [downloadEnabled, setDownloadEnabled] = useState(true);

  useEffect(() => {
    authFetchJson<any[]>("/agreements/my")
      .then(setAgreements)
      .catch(() => {})
      .finally(() => setLoading(false));
    fetchAgreementUserSettings()
      .then(s => setDownloadEnabled(s.userDownloadEnabled))
      .catch(() => {});
  }, []);

  async function openDetail(agr: any) {
    setSelected(agr);
    setSignatureData("");
    try {
      const d = await authFetchJson<any>(`/agreements/my/${agr.id}`);
      setDetailData(d);
    } catch { setDetailData(null); }
  }

  async function handleSign() {
    if (!selected) return;
    if (!signatureData) { toast({ title: "Please draw your signature first", variant: "destructive" }); return; }
    setSigning(true);
    try {
      await authFetchJson(`/agreements/my/${selected.id}/sign`, {
        method: "POST",
        body: JSON.stringify({ signatureData, method: "draw" }),
      });
      toast({ title: "Agreement signed!", description: "Your signed PDF is ready for download." });
      const updated = await authFetchJson<any[]>("/agreements/my");
      setAgreements(updated);
      const updatedDetail = await authFetchJson<any>(`/agreements/my/${selected.id}`);
      setSelected({ ...selected, status: "signed" });
      setDetailData(updatedDetail);
    } catch (e: any) {
      toast({ title: "Signing failed", description: e.message, variant: "destructive" });
    } finally { setSigning(false); }
  }

  async function handleDownload(id: number, uid: string) {
    setDownloading(id);
    try {
      const r = await authFetch(apiPath(`/agreements/my/${id}/download`));
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "Download failed");
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${uid}.pdf`; a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Download started" });
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message, variant: "destructive" });
    } finally { setDownloading(null); }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const result = await authFetchJson<{ agreementUid: string }>("/agreements/generate", {
        method: "POST",
        body: JSON.stringify({ type: genType }),
      });
      toast({ title: "Agreement generated!", description: `Ref: ${result.agreementUid}` });
      const updated = await authFetchJson<any[]>("/agreements/my");
      setAgreements(updated);
      setShowGenDialog(false);
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally { setGenerating(false); }
  }

  const filtered = agreements.filter(a =>
    activeTab === "all" ? true :
    activeTab === "pending" ? a.status === "pending_signature" :
    a.status === "signed"
  );

  const pendingCount = agreements.filter(a => a.status === "pending_signature").length;

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
              Legal Agreements
            </h1>
            <p className="text-muted-foreground mt-1">View, sign, and download your platform legal agreements and disclosures.</p>
          </div>
          <Button onClick={() => setShowGenDialog(true)}
            className="bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold shrink-0">
            <FileText className="h-4 w-4 mr-2" />Request Agreement
          </Button>
        </div>

        {/* Alert for pending */}
        {pendingCount > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">{pendingCount} agreement{pendingCount > 1 ? "s" : ""} awaiting your signature</p>
              <p className="text-xs text-muted-foreground mt-0.5">Please review and sign all pending agreements to maintain full platform access.</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border dark:border-white/10 pb-px">
          {(["pending", "signed", "all"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? "border-amber-500 text-amber-600 dark:text-amber-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              {tab === "pending" ? `Pending ${pendingCount > 0 ? `(${pendingCount})` : ""}` :
               tab === "signed" ? `Signed (${agreements.filter(a => a.status === "signed").length})` :
               `All (${agreements.length})`}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="text-muted-foreground">No {activeTab !== "all" ? activeTab : ""} agreements found.</p>
            <Button onClick={() => setShowGenDialog(true)} variant="outline" className="mt-4 border-border dark:border-white/10">
              Request an agreement
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(agr => {
              const status = STATUS_CONFIG[agr.status] || STATUS_CONFIG.pending_signature;
              const Icon = TYPE_ICONS[agr.type] || FileText;
              const isSigned = agr.status === "signed";
              return (
                <Card key={agr.id}
                  className={`bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 hover:border-amber-500/30 transition-all ${
                    agr.status === "pending_signature" ? "border-amber-500/20" : ""
                  }`}>
                  <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                    {/* Name */}
                    <p className="font-semibold text-sm break-words w-full">{TYPE_LABELS[agr.type] || agr.type}</p>

                    {/* Icon */}
                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${
                      isSigned ? "bg-green-500/10" : "bg-amber-500/10"
                    }`}>
                      <Icon className={`h-7 w-7 ${isSigned ? "text-green-700 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`} />
                    </div>

                    <p className="text-[11px] text-muted-foreground font-mono break-all">{agr.agreementUid}</p>

                    {/* Status */}
                    <Badge className={`text-xs ${status.color}`}>
                      <status.icon className="h-2.5 w-2.5 mr-1" />
                      {isSigned ? "Signed" : "Unsigned"}
                    </Badge>

                    {/* Actions */}
                    <div className="flex items-center gap-2 w-full pt-1">
                      <Button size="sm" variant="outline"
                        onClick={() => (agr.status === "pending_signature" ? openDetail(agr) : setViewing(agr))}
                        className="flex-1 border-border dark:border-white/10">
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        {agr.status === "pending_signature" ? "Review & Sign" : "View"}
                      </Button>
                      {downloadEnabled && (
                        <Button size="sm" variant="outline"
                          onClick={() => handleDownload(agr.id, agr.agreementUid)}
                          disabled={downloading === agr.id}
                          className="flex-1 border-border dark:border-white/10">
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          {downloading === agr.id ? "…" : "Download"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Detail / Sign Dialog */}
        <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
          <DialogContent className="bg-background border-border dark:border-white/10 max-w-2xl max-h-[85vh] overflow-y-auto">
            {selected && (
              <>
                <DialogHeader className="text-left pr-8">
                  <DialogTitle className="flex items-start gap-2 min-w-0 break-words">
                    <FileText className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <span className="min-w-0 break-words">{TYPE_LABELS[selected.type] || selected.type}</span>
                  </DialogTitle>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="font-mono text-xs text-muted-foreground break-all">{selected.agreementUid}</span>
                    <Badge className={`text-xs ${STATUS_CONFIG[selected.status]?.color || ""}`}>
                      {STATUS_CONFIG[selected.status]?.label || selected.status}
                    </Badge>
                  </div>
                </DialogHeader>

                {/* Agreement preview */}
                {detailData?.filledData && (
                  <div className="bg-muted dark:bg-black/30 rounded-xl border border-border/80 dark:border-white/5 p-4 space-y-3 text-sm max-h-64 overflow-y-auto">
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Agreement Details</p>
                    {Object.entries(detailData.filledData as Record<string, string>)
                      .filter(([k, v]) => v && v !== "—" && !["PDF_HASH", "AGREEMENT_STATUS"].includes(k))
                      .slice(0, 20)
                      .map(([key, val]) => (
                        <div key={key} className="flex gap-2 text-xs py-1 border-b border-border/80 dark:border-white/5 last:border-0">
                          <span className="text-muted-foreground w-36 shrink-0">{key.replace(/_/g, " ")}</span>
                          <span className="text-foreground/80 font-mono break-all">{val}</span>
                        </div>
                      ))}
                  </div>
                )}

                {/* Signing section */}
                {selected.status === "pending_signature" && (
                  <div className="space-y-4 border-t border-border dark:border-white/10 pt-4">
                    <div>
                      <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1.5">
                        <PenTool className="h-4 w-4" />Digital Signature
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        By signing, you confirm you have read and agree to all terms in this agreement. Your signature, IP address, and timestamp will be recorded.
                      </p>
                      <SignatureCanvas onSigned={setSignatureData} />
                    </div>
                    <Button onClick={handleSign} disabled={signing || !signatureData}
                      className="w-full bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold h-11">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {signing ? "Signing & generating PDF..." : "Sign Agreement"}
                    </Button>
                  </div>
                )}

                {/* Signed state */}
                {selected.status === "signed" && (
                  <div className="space-y-3 border-t border-border dark:border-white/10 pt-4">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-700 dark:text-green-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-green-700 dark:text-green-400 font-medium">Agreement signed successfully</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Signed on {selected.signedAt ? new Date(selected.signedAt).toLocaleString() : "—"}
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => { setViewing(selected); setSelected(null); }}
                      variant="outline"
                      className="w-full border-border dark:border-white/10">
                      <Eye className="h-4 w-4 mr-2" /> View Signed Agreement
                    </Button>
                    {downloadEnabled && (
                      <Button onClick={() => handleDownload(selected.id, selected.agreementUid)}
                        disabled={downloading === selected.id}
                        className="w-full bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold">
                        <Download className="h-4 w-4 mr-2" />
                        {downloading === selected.id ? "Generating PDF..." : "Download Signed Agreement PDF"}
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Generate Dialog */}
        <Dialog open={showGenDialog} onOpenChange={setShowGenDialog}>
          <DialogContent className="bg-background border-border dark:border-white/10 max-w-md">
            <DialogHeader>
              <DialogTitle>Request Legal Agreement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Agreement Type</label>
                <Select value={genType} onValueChange={setGenType}>
                  <SelectTrigger className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-muted-foreground">
                Your profile data will be automatically fetched and used to fill the agreement. Review it carefully before signing.
              </div>
              <Button onClick={handleGenerate} disabled={generating}
                className="w-full bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold">
                {generating ? "Generating..." : "Generate Agreement"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* PDF view dialog */}
        <AgreementPdfViewDialog
          open={!!viewing}
          onOpenChange={open => !open && setViewing(null)}
          title={viewing ? (TYPE_LABELS[viewing.type] || viewing.type) : ""}
          subtitle={viewing?.agreementUid}
          documentKey={viewing?.id ?? null}
          fetchBlob={() => fetchAgreementPdfBlob(viewing.id, "view")}
          downloadFilename={viewing ? `${viewing.agreementUid}.pdf` : undefined}
          allowDownload={downloadEnabled}
        />
      </div>
);
}
