import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { getHeaderTradingNav, isNavItemActive } from "@/lib/nav-config";

const SHORT_LABELS: Record<string, string> = {
  "Copy Trading": "Copy Trading",
  "MT4/MT5 Account Handling": "MT Account",
};

export function HeaderTradingNav({ role, className }: { role: string; className?: string }) {
  const [location] = useLocation();
  const items = getHeaderTradingNav(role, location);

  return (
    <nav
      className={cn(
        "flex items-center gap-1 min-w-0 overflow-x-auto scrollbar-none shrink",
        className,
      )}
      aria-label="Trading services"
    >
      {items.map((item) => {
        const active = isNavItemActive(location, item);
        const short = SHORT_LABELS[item.name] ?? item.name;
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.name}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors border shrink-0",
              active
                ? "bg-primary/15 text-primary border-primary/30"
                : "text-muted-foreground border-transparent hover:bg-white/5 hover:text-foreground hover:border-white/10"
            )}
          >
            <item.icon className={cn("h-3.5 w-3.5 shrink-0", active ? item.color : "text-muted-foreground")} />
            <span className="hidden xl:inline">{item.name}</span>
            <span className="xl:hidden">{short}</span>
          </Link>
        );
      })}
    </nav>
  );
}
