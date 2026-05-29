import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import type { ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun; hint: string }[] = [
  { value: "light", label: "Light", icon: Sun, hint: "Bright gold & cream" },
  { value: "dark", label: "Dark", icon: Moon, hint: "Deep navy & amber" },
  { value: "system", label: "System", icon: Monitor, hint: "Match device" },
];

function ThemeIcon({ preference, resolved }: { preference: ThemePreference; resolved: "light" | "dark" }) {
  if (preference === "system") {
    return <Monitor className="h-4 w-4 text-violet-600 dark:text-violet-400" />;
  }
  if (resolved === "dark") {
    return <Moon className="h-4 w-4 text-indigo-500 dark:text-indigo-300" />;
  }
  return <Sun className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="Theme"
          aria-label="Choose color theme"
          className={cn(
            "h-9 w-9 shrink-0 rounded-full border border-transparent hover:border-amber-500/30 hover:bg-amber-500/10 dark:hover:bg-amber-500/15",
            "[&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0",
            className,
          )}
        >
          <ThemeIcon preference={theme} resolved={resolvedTheme} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Appearance</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemePreference)}>
          {OPTIONS.map(({ value, label, icon: Icon, hint }) => (
            <DropdownMenuRadioItem key={value} value={value} className="gap-2 cursor-pointer">
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  value === "light" && "text-amber-600",
                  value === "dark" && "text-indigo-500",
                  value === "system" && "text-violet-600",
                )}
              />
              <span className="flex flex-col min-w-0">
                <span className="text-sm font-medium leading-tight">{label}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">{hint}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
