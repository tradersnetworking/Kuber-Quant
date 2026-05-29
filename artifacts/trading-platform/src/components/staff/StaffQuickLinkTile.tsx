import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAFF_STAT_TONES, type StaffStatTone } from "@/lib/staff-dashboard-ui";

type Props = {
  href?: string;
  label: string;
  desc?: string;
  icon?: LucideIcon;
  tone?: StaffStatTone;
  onClick?: () => void;
};

export function StaffQuickLinkTile({ href, label, desc, icon: Icon, tone = "blue", onClick }: Props) {
  const t = STAFF_STAT_TONES[tone];

  const inner = (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-3.5 sm:p-4 min-w-0 transition-all",
        "hover:shadow-md active:scale-[0.98] cursor-pointer",
        t.bg,
        t.border,
      )}
    >
      <div className={cn("absolute top-0 left-0 h-0.5 w-full bg-gradient-to-r opacity-80", t.bar)} />
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className={cn("p-2.5 rounded-lg shrink-0 bg-background/70 dark:bg-black/25 border", t.border)}>
            <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", t.icon)} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm sm:text-base font-semibold leading-snug break-words", t.value)}>{label}</p>
          {desc && <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-snug break-words">{desc}</p>}
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button type="button" className="w-full text-left" onClick={onClick}>
        {inner}
      </button>
    );
  }

  return href ? <Link href={href}>{inner}</Link> : inner;
}
