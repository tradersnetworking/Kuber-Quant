import { CopyCredentialButton } from "./CopyCredentialButton";

export function CredentialRow({
  label,
  value,
  copyable = true,
  mono,
}: {
  label: string;
  value?: string | null;
  copyable?: boolean;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border/80 dark:border-white/5 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <div className="flex items-center gap-1 min-w-0">
        <span className={`text-sm font-medium truncate ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
        {copyable && <CopyCredentialButton text={value} />}
      </div>
    </div>
  );
}
