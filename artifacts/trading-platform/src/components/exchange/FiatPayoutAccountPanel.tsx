import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs } from "@/components/ui/tabs";
import { UserQrUploadButton } from "@/components/wallet/UserQrUploadButton";
import { PayoutAccountDetailsCard } from "@/components/wallet/PayoutAccountDetailsCard";
import { resolvePayoutQrSrc } from "@/components/wallet/deposit-account-utils";
import { QrImage } from "@/components/wallet/QrImage";
import type { PaymentAccount } from "@/components/wallet/payout-account-types";
import { authFetchJson } from "@/lib/token-store";
import { useToast } from "@/hooks/use-toast";
import { Building2, Loader2, Smartphone, IndianRupee } from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileBtnWrap } from "@/lib/mobile-ui";
import {
  PaymentMethodFieldLabel,
  PaymentMethodSelect,
  PaymentMethodTabsList,
  PaymentMethodTabsTrigger,
  financeInputClass,
} from "@/components/wallet/PaymentMethodField";

type PayoutMethod = "upi" | "digital_rupee" | "bank";

type Props = {
  accounts: PaymentAccount[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onAccountsUpdated: () => void;
  payoutConfirmed: boolean;
  onPayoutConfirmedChange: (confirmed: boolean) => void;
  submitting?: boolean;
  /** When set, hides UPI/Bank toggle and locks to one method (wallet withdraw tabs). */
  fixedMethod?: PayoutMethod;
  /** Exchange sell vs wallet withdraw copy. */
  context?: "exchange" | "wallet";
};

function methodAccounts(accounts: PaymentAccount[], method: PayoutMethod) {
  return accounts.filter(a => a.accountType === method);
}

function payoutMethodLabel(method: PayoutMethod) {
  if (method === "upi") return "UPI";
  if (method === "digital_rupee") return "Digital Rupee (e-Rupee / CBDC)";
  return "Bank transfer (IMPS / NEFT / RTGS)";
}

function payoutMethodShortLabel(method: PayoutMethod) {
  if (method === "upi") return "UPI";
  if (method === "digital_rupee") return "Digital Rupee";
  return "bank";
}

export function FiatPayoutAccountPanel({
  accounts,
  selectedId,
  onSelect,
  onAccountsUpdated,
  payoutConfirmed,
  onPayoutConfirmedChange,
  submitting = false,
  fixedMethod,
  context = "exchange",
}: Props) {
  const { toast } = useToast();
  const fiatAccounts = accounts.filter(a => ["upi", "digital_rupee", "bank"].includes(a.accountType));

  const initialMethod = useMemo((): PayoutMethod => {
    const selected = fiatAccounts.find(a => a.id === selectedId);
    if (selected?.accountType === "bank") return "bank";
    if (selected?.accountType === "digital_rupee") return "digital_rupee";
    if (selected?.accountType === "upi") return "upi";
    const hasUpi = fiatAccounts.some(a => a.accountType === "upi");
    if (hasUpi) return "upi";
    const hasDigitalRupee = fiatAccounts.some(a => a.accountType === "digital_rupee");
    if (hasDigitalRupee) return "digital_rupee";
    return "bank";
  }, [fiatAccounts, selectedId]);

  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>(fixedMethod ?? initialMethod);

  useEffect(() => {
    if (fixedMethod) setPayoutMethod(fixedMethod);
  }, [fixedMethod]);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newLabel, setNewLabel] = useState("My UPI");
  const [newUpiId, setNewUpiId] = useState("");
  const [newDigitalRupeeId, setNewDigitalRupeeId] = useState("");
  const [newUpiQrUrl, setNewUpiQrUrl] = useState("");
  const [newHolder, setNewHolder] = useState("");
  const [newBankName, setNewBankName] = useState("");
  const [newAccountNumber, setNewAccountNumber] = useState("");
  const [newIfsc, setNewIfsc] = useState("");

  const filteredAccounts = methodAccounts(fiatAccounts, payoutMethod);
  const selected = fiatAccounts.find(a => a.id === selectedId) ?? null;
  const selectedMatchesMethod = selected?.accountType === payoutMethod;

  const resetAddForm = (type: PayoutMethod = payoutMethod) => {
    setNewLabel(type === "upi" ? "My UPI" : type === "digital_rupee" ? "My Digital Rupee" : "My Bank");
    setNewUpiId("");
    setNewDigitalRupeeId("");
    setNewUpiQrUrl("");
    setNewHolder("");
    setNewBankName("");
    setNewAccountNumber("");
    setNewIfsc("");
  };

  const saveAccount = async () => {
    if (saving) return;
    if (payoutMethod === "upi") {
      if (!newUpiId.trim()) {
        toast({ title: "UPI ID required", variant: "destructive" });
        return;
      }
    } else if (payoutMethod === "digital_rupee") {
      if (!newDigitalRupeeId.trim()) {
        toast({ title: "Digital Rupee ID required", variant: "destructive" });
        return;
      }
    } else if (!newHolder.trim() || !newBankName.trim() || !newAccountNumber.trim()) {
      toast({
        title: "Fill bank details",
        description: "Account holder, bank name, and account number are required.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      let created: PaymentAccount;
      if (payoutMethod === "upi") {
        created = await authFetchJson<PaymentAccount>("/wallet/payment-accounts", {
          method: "POST",
          body: JSON.stringify({
            label: newLabel.trim() || "My UPI",
            accountType: "upi",
            upiId: newUpiId.trim(),
            upiQrUrl: newUpiQrUrl || undefined,
            isDefault: fiatAccounts.length === 0,
          }),
        });
      } else if (payoutMethod === "digital_rupee") {
        created = await authFetchJson<PaymentAccount>("/wallet/payment-accounts", {
          method: "POST",
          body: JSON.stringify({
            label: newLabel.trim() || "My Digital Rupee",
            accountType: "digital_rupee",
            digitalRupeeId: newDigitalRupeeId.trim(),
            upiQrUrl: newUpiQrUrl || undefined,
            isDefault: fiatAccounts.length === 0,
          }),
        });
      } else {
        created = await authFetchJson<PaymentAccount>("/wallet/payment-accounts", {
          method: "POST",
          body: JSON.stringify({
            label: newLabel.trim() || "My Bank",
            accountType: "bank",
            accountHolderName: newHolder.trim(),
            bankName: newBankName.trim(),
            accountNumber: newAccountNumber.trim(),
            ifscCode: newIfsc.trim() || undefined,
            isDefault: fiatAccounts.length === 0,
          }),
        });
      }
      toast({ title: "Payout account saved" });
      setAddOpen(false);
      resetAddForm();
      onAccountsUpdated();
      onSelect(created.id);
      onPayoutConfirmedChange(false);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleMethodChange = (method: PayoutMethod) => {
    setPayoutMethod(method);
    setAddOpen(false);
    resetAddForm(method);
    onPayoutConfirmedChange(false);
    const first = methodAccounts(fiatAccounts, method)[0];
    onSelect(first?.id ?? null);
  };

  const confirmationNote = selected && selectedMatchesMethod
    ? payoutMethod === "upi"
      ? context === "wallet"
        ? `Funds will be sent to UPI ID ${selected.upiId} (${selected.label}) after admin approval.`
        : `INR will be sent to UPI ID ${selected.upiId} (${selected.label}) after your crypto deposit is verified.`
      : payoutMethod === "digital_rupee"
        ? context === "wallet"
          ? `Funds will be sent to Digital Rupee ID ${selected.digitalRupeeId} (${selected.label}) after admin approval.`
          : `INR will be sent to Digital Rupee ID ${selected.digitalRupeeId} (${selected.label}) after your crypto deposit is verified.`
        : context === "wallet"
          ? `Funds will be sent via bank transfer to ${selected.bankName} account ending ${String(selected.accountNumber || "").slice(-4)} (${selected.label}) after admin approval.`
          : `INR will be sent via bank transfer to ${selected.bankName} account ending ${String(selected.accountNumber || "").slice(-4)} (${selected.label}) after your crypto deposit is verified.`
    : `Select a saved ${payoutMethodLabel(payoutMethod).toLowerCase()} account or add one below.`;

  const confirmCheckboxText = context === "wallet"
    ? payoutMethod === "upi"
      ? <>I confirm the UPI ID and payout details are correct. Funds will be sent to this account after admin approval.</>
      : payoutMethod === "digital_rupee"
        ? <>I confirm the Digital Rupee ID and payout details are correct. Funds will be sent to this account after admin approval.</>
        : <>I confirm the bank account details are correct. Funds will be sent via <strong className="text-amber-300/90">bank transfer</strong> after admin approval.</>
    : <>I confirm the payout account details and{" "}
        <strong className="text-amber-300/90">{payoutMethodLabel(payoutMethod)}</strong>{" "}
        withdrawal mode are correct. I understand INR will be sent to this account after admin verifies my crypto deposit.</>;

  const methodTone = payoutMethod;

  return (
    <div className="space-y-4">
      {!fixedMethod && (
        <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent p-4">
          <p className="text-sm font-medium text-amber-200/90">Fiat payout — receive INR</p>
          <p className="text-xs text-muted-foreground mt-1">
            Choose how you want to receive INR after selling crypto.
          </p>
        </div>
      )}

      {!fixedMethod && (
      <div className="space-y-2">
        <PaymentMethodFieldLabel tone={methodTone}>Payout method</PaymentMethodFieldLabel>
        <Tabs value={payoutMethod} onValueChange={v => handleMethodChange(v as PayoutMethod)}>
          <PaymentMethodTabsList>
            <PaymentMethodTabsTrigger value="upi" tone="upi">
              <Smartphone className="h-3.5 w-3.5" />
              UPI
            </PaymentMethodTabsTrigger>
            <PaymentMethodTabsTrigger value="digital_rupee" tone="digital_rupee">
              <IndianRupee className="h-3.5 w-3.5" />
              Digital Rupee
            </PaymentMethodTabsTrigger>
            <PaymentMethodTabsTrigger value="bank" tone="bank">
              <Building2 className="h-3.5 w-3.5" />
              Bank
            </PaymentMethodTabsTrigger>
          </PaymentMethodTabsList>
        </Tabs>
      </div>
      )}

      <div className="space-y-2">
        {filteredAccounts.length === 0 ? (
          <>
            <PaymentMethodFieldLabel tone={methodTone}>
              Select saved {payoutMethodShortLabel(payoutMethod)} account
            </PaymentMethodFieldLabel>
            <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border dark:border-white/10 px-3 py-2.5">
              No {payoutMethodShortLabel(payoutMethod)} account saved yet. Add one below.
            </p>
          </>
        ) : (
          <PaymentMethodSelect
            tone={methodTone}
            label={`Select saved ${payoutMethodShortLabel(payoutMethod)} account`}
            value={selectedMatchesMethod && selectedId ? String(selectedId) : ""}
            onValueChange={v => {
              onSelect(Number(v));
              onPayoutConfirmedChange(false);
            }}
            placeholder={`Choose ${payoutMethodShortLabel(payoutMethod)} account`}
            options={filteredAccounts.map(a => ({
              value: String(a.id),
              label: `${a.label} — ${a.accountType === "upi"
                ? a.upiId
                : a.accountType === "digital_rupee"
                  ? a.digitalRupeeId
                  : `${a.bankName} · ****${String(a.accountNumber || "").slice(-4)}`}`,
            }))}
          />
        )}
      </div>

      {selected && selectedMatchesMethod && (
        <div className="space-y-2">
          <PaymentMethodFieldLabel tone={methodTone}>Selected account details</PaymentMethodFieldLabel>
          <PayoutAccountDetailsCard account={selected} />
        </div>
      )}

      <div className="rounded-xl border border-dashed border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.02] overflow-hidden">
        <button
          type="button"
          className="w-full px-3 py-2.5 text-left text-xs font-semibold uppercase text-muted-foreground hover:bg-muted/50 dark:bg-white/[0.03] transition-colors"
          onClick={() => {
            setAddOpen(v => !v);
            if (!addOpen) resetAddForm();
          }}
        >
          {addOpen ? "− Hide add another account" : `+ Add another ${payoutMethodShortLabel(payoutMethod)} account`}
        </button>

        {addOpen && (
          <div className="px-3 pb-3 space-y-3 border-t border-border dark:border-white/10 pt-3">
            {payoutMethod === "upi" ? (
              <div className="space-y-2">
                <Input placeholder="Label (e.g. My UPI)" value={newLabel} onChange={e => setNewLabel(e.target.value)} className={financeInputClass("h-9 text-sm")} />
                <Input placeholder="UPI ID (name@bank)" value={newUpiId} onChange={e => setNewUpiId(e.target.value)} className={financeInputClass("h-9 text-sm")} />
                <div className="flex flex-wrap items-center gap-2">
                  <UserQrUploadButton onUploaded={setNewUpiQrUrl} disabled={submitting || saving} />
                  {newUpiQrUrl && (
                    <QrImage
                      src={resolvePayoutQrSrc({ accountType: "upi", label: newLabel, upiId: newUpiId, upiQrUrl: newUpiQrUrl })}
                      alt="Uploaded UPI QR"
                      className="h-16 w-16 rounded border border-border dark:border-white/10 bg-white p-0.5 object-contain"
                    />
                  )}
                </div>
                {(newUpiQrUrl || newUpiId) && !newUpiQrUrl && newUpiId && (
                  <QrImage
                    src={resolvePayoutQrSrc({ accountType: "upi", label: newLabel, upiId: newUpiId })}
                    alt="UPI QR preview"
                    className="mx-auto max-h-32 rounded border border-border dark:border-white/10 bg-white p-1"
                  />
                )}
              </div>
            ) : payoutMethod === "digital_rupee" ? (
              <div className="space-y-2">
                <Input placeholder="Label (e.g. My Digital Rupee)" value={newLabel} onChange={e => setNewLabel(e.target.value)} className={financeInputClass("h-9 text-sm")} />
                <Input placeholder="Digital Rupee wallet ID" value={newDigitalRupeeId} onChange={e => setNewDigitalRupeeId(e.target.value)} className={financeInputClass("h-9 text-sm font-mono")} />
                <div className="flex flex-wrap items-center gap-2">
                  <UserQrUploadButton onUploaded={setNewUpiQrUrl} disabled={submitting || saving} />
                  {newUpiQrUrl && (
                    <QrImage
                      src={resolvePayoutQrSrc({ accountType: "digital_rupee", label: newLabel, digitalRupeeId: newDigitalRupeeId, upiQrUrl: newUpiQrUrl })}
                      alt="Uploaded Digital Rupee QR"
                      className="h-16 w-16 rounded border border-border dark:border-white/10 bg-white p-0.5 object-contain"
                    />
                  )}
                </div>
                {(newUpiQrUrl || newDigitalRupeeId) && !newUpiQrUrl && newDigitalRupeeId && (
                  <QrImage
                    src={resolvePayoutQrSrc({ accountType: "digital_rupee", label: newLabel, digitalRupeeId: newDigitalRupeeId })}
                    alt="Digital Rupee QR preview"
                    className="mx-auto max-h-32 rounded border border-border dark:border-white/10 bg-white p-1"
                  />
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Input placeholder="Label (e.g. Primary Bank)" value={newLabel} onChange={e => setNewLabel(e.target.value)} className={financeInputClass("h-9 text-sm")} />
                <Input placeholder="Account holder name *" value={newHolder} onChange={e => setNewHolder(e.target.value)} className={financeInputClass("h-9 text-sm")} />
                <Input placeholder="Bank name *" value={newBankName} onChange={e => setNewBankName(e.target.value)} className={financeInputClass("h-9 text-sm")} />
                <Input placeholder="Account number *" value={newAccountNumber} onChange={e => setNewAccountNumber(e.target.value)} className={financeInputClass("h-9 text-sm")} />
                <Input placeholder="IFSC code" value={newIfsc} onChange={e => setNewIfsc(e.target.value)} className={financeInputClass("h-9 text-sm")} />
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="wrap"
              className={cn("w-full border-amber-500/30 text-amber-600 dark:text-amber-400", mobileBtnWrap)}
              onClick={saveAccount}
              disabled={submitting || saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : null}
              <span>Save payout account</span>
            </Button>
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        Manage or edit accounts in{" "}
        <Link href="/account?tab=payout" className="text-amber-600 dark:text-amber-400 hover:underline">My Account → Payout Accounts</Link>
      </p>

      <div className={cn(
        "rounded-xl border p-4 space-y-3",
        payoutConfirmed ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/25 bg-amber-500/5",
      )}>
        <p className="text-xs text-muted-foreground leading-relaxed">{confirmationNote}</p>
        <div className="flex items-start gap-3">
          <Checkbox
            id={fixedMethod ? `payout-confirm-${fixedMethod}` : "payout-confirm"}
            checked={payoutConfirmed}
            disabled={!selected || !selectedMatchesMethod}
            onCheckedChange={v => onPayoutConfirmedChange(v === true)}
            className="mt-0.5 border-amber-500/40 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
          />
          <Label
            htmlFor={fixedMethod ? `payout-confirm-${fixedMethod}` : "payout-confirm"}
            className="text-sm font-normal leading-snug cursor-pointer"
          >
            {confirmCheckboxText}
          </Label>
        </div>
      </div>
    </div>
  );
}
