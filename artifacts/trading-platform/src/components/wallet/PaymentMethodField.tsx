import * as React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { mobileTabTrigger, paymentMethodTabsList } from "@/lib/mobile-ui";
import { TAB_LIST_CLASS, TAB_TRIGGER_BASE, tabToneClasses, type TabTone } from "@/lib/tab-tones";

export type PaymentMethodTone = "upi" | "bank" | "gateway" | "crypto";

/** Extra label tones for amount, proof, rate, etc. in finance flows. */
export type FinanceLabelTone =
  | PaymentMethodTone
  | "amount"
  | "proof"
  | "rate"
  | "currency"
  | "confirm"
  | "step";

const LABEL_CLASS: Record<FinanceLabelTone, string> = {
  upi: "text-sky-700 dark:text-sky-400",
  bank: "text-blue-700 dark:text-blue-400",
  gateway: "text-violet-700 dark:text-violet-400",
  crypto: "text-orange-700 dark:text-orange-400",
  amount: "text-emerald-700 dark:text-emerald-400",
  proof: "text-amber-700 dark:text-amber-400",
  rate: "text-cyan-700 dark:text-cyan-400",
  currency: "text-indigo-700 dark:text-indigo-400",
  confirm: "text-rose-700 dark:text-rose-400",
  step: "text-primary dark:text-amber-400",
};

export const PAYMENT_METHOD_TAB_ACTIVE: Record<PaymentMethodTone, string> = {
  upi: tabToneClasses("sky"),
  bank: tabToneClasses("blue"),
  gateway: tabToneClasses("violet"),
  crypto: tabToneClasses("orange"),
};

const PAYMENT_METHOD_TONE: Record<PaymentMethodTone, TabTone> = {
  upi: "sky",
  bank: "blue",
  gateway: "violet",
  crypto: "orange",
};

const SELECT_TRIGGER: Record<PaymentMethodTone, string> = {
  upi:
    "border-sky-500/40 bg-sky-500/10 text-sky-900 focus:ring-sky-500/30 [&>span]:text-sky-900 dark:border-sky-500/35 dark:bg-sky-500/10 dark:text-sky-100 dark:[&>span]:text-sky-100",
  bank:
    "border-blue-500/40 bg-blue-500/10 text-blue-900 focus:ring-blue-500/30 [&>span]:text-blue-900 dark:border-blue-500/35 dark:bg-blue-500/10 dark:text-blue-100 dark:[&>span]:text-blue-100",
  gateway:
    "border-violet-500/40 bg-violet-500/10 text-violet-900 focus:ring-violet-500/30 [&>span]:text-violet-900 dark:border-violet-500/35 dark:bg-violet-500/10 dark:text-violet-100 dark:[&>span]:text-violet-100",
  crypto:
    "border-orange-500/40 bg-orange-500/10 text-orange-900 focus:ring-orange-500/30 [&>span]:text-orange-900 dark:border-orange-500/35 dark:bg-orange-500/10 dark:text-orange-100 dark:[&>span]:text-orange-100",
};

const SELECT_ITEM: Record<PaymentMethodTone, string> = {
  upi: "focus:bg-sky-500/15 focus:text-sky-900 dark:focus:bg-sky-500/15 dark:focus:text-sky-200",
  bank: "focus:bg-blue-500/15 focus:text-blue-900 dark:focus:bg-blue-500/15 dark:focus:text-blue-200",
  gateway: "focus:bg-violet-500/15 focus:text-violet-900 dark:focus:bg-violet-500/15 dark:focus:text-violet-200",
  crypto: "focus:bg-orange-500/15 focus:text-orange-900 dark:focus:bg-orange-500/15 dark:focus:text-orange-200",
};

export function FinanceFieldLabel({
  tone,
  children,
  className,
  size = "xs",
}: {
  tone: FinanceLabelTone;
  children: React.ReactNode;
  className?: string;
  size?: "xs" | "sm";
}) {
  return (
    <Label
      className={cn(
        "font-semibold tracking-wide",
        size === "xs" ? "text-xs" : "text-sm",
        LABEL_CLASS[tone],
        className,
      )}
    >
      {children}
    </Label>
  );
}

/** @deprecated alias — use FinanceFieldLabel */
export const PaymentMethodFieldLabel = FinanceFieldLabel;

type PaymentMethodSelectProps = {
  tone: PaymentMethodTone;
  label: React.ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  options: { value: string; label: React.ReactNode }[];
  triggerClassName?: string;
  disabled?: boolean;
};

export function PaymentMethodSelect({
  tone,
  label,
  value,
  onValueChange,
  placeholder = "Choose account",
  options,
  triggerClassName,
  disabled,
}: PaymentMethodSelectProps) {
  return (
    <div className="space-y-1.5">
      <FinanceFieldLabel tone={tone}>{label}</FinanceFieldLabel>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={cn("h-10 font-medium", SELECT_TRIGGER[tone], triggerClassName)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="border-border bg-popover text-popover-foreground">
          {options.map(o => (
            <SelectItem key={o.value} value={o.value} className={SELECT_ITEM[tone]}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function PaymentMethodTabsList({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsList>) {
  return (
    <TabsList
      className={cn(TAB_LIST_CLASS, paymentMethodTabsList, className)}
      {...props}
    />
  );
}

type PaymentMethodTabsTriggerProps = React.ComponentPropsWithoutRef<typeof TabsTrigger> & {
  tone: PaymentMethodTone;
};

export function PaymentMethodTabsTrigger({ tone, className, ...props }: PaymentMethodTabsTriggerProps) {
  return (
    <TabsTrigger
      className={cn(
        TAB_TRIGGER_BASE,
        mobileTabTrigger,
        "gap-1",
        tabToneClasses(PAYMENT_METHOD_TONE[tone]),
        className,
      )}
      {...props}
    />
  );
}

/** Theme-aware input shell for finance forms. */
export function financeInputClass(extra?: string) {
  return cn(
    "border-border bg-input/60 text-foreground placeholder:text-muted-foreground",
    "dark:bg-white/5 dark:border-white/10",
    extra,
  );
}
