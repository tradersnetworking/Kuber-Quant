import { Eye, EyeOff, LineChart } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldTooltip } from "@/components/onboarding/FieldTooltip";

export type MtAccountFormValues = {
  mtPlatform: "mt4" | "mt5";
  mtAccountNumber: string;
  mtBroker: string;
  mtServer: string;
  mtPassword: string;
  linkMtLater: boolean;
};

type Props = {
  values: MtAccountFormValues;
  onChange: <K extends keyof MtAccountFormValues>(key: K, value: MtAccountFormValues[K]) => void;
  showDeferOption?: boolean;
  required?: boolean;
  hideHeader?: boolean;
  errors?: Partial<Record<keyof MtAccountFormValues, string>>;
};

export function MtAccountCredentialsForm({
  values,
  onChange,
  showDeferOption = true,
  required = false,
  hideHeader = false,
  errors = {},
}: Props) {
  const [showPw, setShowPw] = useState(false);
  const disabled = showDeferOption && values.linkMtLater;

  return (
    <div className="space-y-4">
      {!hideHeader && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
          <LineChart className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Link MT4/MT5 Account</p>
            <p className="text-muted-foreground text-xs mt-1">
              Required for Account Handling, Algo Trading, and Copy Trading. Platform, account number, broker, server, and trading password are stored securely (encrypted).
            </p>
          </div>
        </div>
      )}

      {showDeferOption && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
          <Checkbox
            id="linkMtLater"
            checked={values.linkMtLater}
            onCheckedChange={v => onChange("linkMtLater", !!v)}
          />
          <Label htmlFor="linkMtLater" className="text-sm leading-relaxed cursor-pointer">
            Link my MT4/MT5 account later from the dashboard
            {!required && " (optional if you did not select MT-based services)"}
          </Label>
        </div>
      )}

      <div className={`space-y-4 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center">
            Platform {required && !values.linkMtLater && "*"}
          </Label>
          <Select value={values.mtPlatform} onValueChange={v => onChange("mtPlatform", v as "mt4" | "mt5")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mt5">MetaTrader 5 (MT5)</SelectItem>
              <SelectItem value="mt4">MetaTrader 4 (MT4)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Account Number" error={errors.mtAccountNumber} required={required} tip="Login / account number from your broker">
            <Input
              value={values.mtAccountNumber}
              onChange={e => onChange("mtAccountNumber", e.target.value.replace(/\s/g, ""))}
              placeholder="e.g. 12345678"
              inputMode="numeric"
            />
          </Field>
          <Field label="Broker" error={errors.mtBroker} required={required} tip="Broker company name">
            <Input
              value={values.mtBroker}
              onChange={e => onChange("mtBroker", e.target.value)}
              placeholder="e.g. IC Markets, Exness"
            />
          </Field>
        </div>

        <Field label="Server" error={errors.mtServer} required={required} tip="Exact server name from MT4/MT5 terminal">
          <Input
            value={values.mtServer}
            onChange={e => onChange("mtServer", e.target.value)}
            placeholder="e.g. ICMarketsSC-Demo, Exness-MT5Real"
          />
        </Field>

        <Field label="Trading Password" error={errors.mtPassword} required={required} tip="Your MT4/MT5 trading password from the terminal — not your Kuber Quant login">
          <div className="relative">
            <Input
              type={showPw ? "text" : "password"}
              value={values.mtPassword}
              onChange={e => onChange("mtPassword", e.target.value)}
              placeholder="Trading password"
              autoComplete="off"
            />
            <button type="button" className="absolute right-3 top-2.5 text-muted-foreground" onClick={() => setShowPw(v => !v)}>
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
      </div>
    </div>
  );
}

function Field({
  label, children, error, required, tip,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
  tip?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center">
        {label}{required && " *"}{tip && <FieldTooltip text={tip} />}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export const EMPTY_MT_ACCOUNT: MtAccountFormValues = {
  mtPlatform: "mt5",
  mtAccountNumber: "",
  mtBroker: "",
  mtServer: "",
  mtPassword: "",
  linkMtLater: false,
};
