import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type UserServiceForm = {
  isActive: boolean;
  suspendReason: string;
  withdrawalsEnabled: boolean;
  withdrawalBlockMessage: string;
  depositsEnabled: boolean;
  investmentsEnabled: boolean;
  algoTradingEnabled: boolean;
  copyTradingEnabled: boolean;
  eaTradingEnabled: boolean;
  mt5Enabled: boolean;
};

type Props = {
  value: UserServiceForm;
  onChange: (patch: Partial<UserServiceForm>) => void;
};

export function UserServiceControls({ value, onChange }: Props) {
  const toggles: { key: keyof UserServiceForm; label: string; desc: string }[] = [
    { key: "depositsEnabled", label: "Deposits", desc: "Allow deposit requests" },
    { key: "withdrawalsEnabled", label: "Withdrawals", desc: "Allow withdrawal requests" },
    { key: "investmentsEnabled", label: "Investments", desc: "Allow new investment plans" },
    { key: "algoTradingEnabled", label: "Algo Trading", desc: "Allow algo subscriptions" },
    { key: "copyTradingEnabled", label: "Copy Trading", desc: "Allow copy-trader follows" },
    { key: "eaTradingEnabled", label: "EA Strategies", desc: "Allow EA subscriptions" },
    { key: "mt5Enabled", label: "MT4/MT5", desc: "Allow MT account linking" },
  ];

  return (
    <div className="rounded-lg border border-border dark:border-white/10 p-3 space-y-3">
      <div>
        <p className="text-sm font-medium">Account access & services</p>
        <p className="text-xs text-muted-foreground">Suspend account or restrict individual platform services.</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>Account active</Label>
          <p className="text-xs text-muted-foreground">Inactive users cannot log in (suspended).</p>
        </div>
        <Switch checked={value.isActive} onCheckedChange={v => onChange({ isActive: v })} />
      </div>

      {!value.isActive && (
        <div className="space-y-1">
          <Label>Suspend reason (optional)</Label>
          <Textarea
            value={value.suspendReason}
            onChange={e => onChange({ suspendReason: e.target.value })}
            placeholder="Reason shown on login attempt..."
            className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 min-h-[72px]"
          />
        </div>
      )}

      <div className="border-t border-border/80 dark:border-white/10 pt-3 space-y-2">
        {toggles.map(t => (
          <div key={t.key} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Label>{t.label}</Label>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </div>
            <Switch
              checked={!!value[t.key]}
              onCheckedChange={v => onChange({ [t.key]: v } as Partial<UserServiceForm>)}
            />
          </div>
        ))}
      </div>

      {!value.withdrawalsEnabled && (
        <div className="space-y-1">
          <Label>Withdrawal block message (optional)</Label>
          <Textarea
            value={value.withdrawalBlockMessage}
            onChange={e => onChange({ withdrawalBlockMessage: e.target.value })}
            placeholder="Shown when user tries to withdraw..."
            className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 min-h-[72px]"
          />
        </div>
      )}
    </div>
  );
}

export function defaultServiceForm(partial?: Partial<UserServiceForm>): UserServiceForm {
  return {
    isActive: partial?.isActive ?? true,
    suspendReason: partial?.suspendReason ?? "",
    withdrawalsEnabled: partial?.withdrawalsEnabled ?? true,
    withdrawalBlockMessage: partial?.withdrawalBlockMessage ?? "",
    depositsEnabled: partial?.depositsEnabled ?? true,
    investmentsEnabled: partial?.investmentsEnabled ?? true,
    algoTradingEnabled: partial?.algoTradingEnabled ?? true,
    copyTradingEnabled: partial?.copyTradingEnabled ?? true,
    eaTradingEnabled: partial?.eaTradingEnabled ?? true,
    mt5Enabled: partial?.mt5Enabled ?? true,
  };
}
