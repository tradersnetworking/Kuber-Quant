import { cn } from "@/lib/utils";
import { tabChipClasses, tabToneByIndex } from "@/lib/tab-tones";

export type StaffMobileTab = { value: string; label: string };

type Props = {
  tabs: StaffMobileTab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

/** Horizontal scroll tab chips for staff dashboards on phones/tablets. */
export function StaffMobileTabBar({ tabs, value, onChange, className }: Props) {
  return (
    <div className={cn("md:hidden min-w-0 -mx-1", className)}>
      <div
        role="tablist"
        aria-label="Section tabs"
        className="staff-mobile-tab-scroll flex gap-1.5 overflow-x-auto pb-1.5 pt-0.5 px-1 snap-x snap-mandatory scrollbar-none"
      >
        {tabs.map((tab, index) => {
          const tone = tabToneByIndex(index);
          const active = value === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.value)}
              className={cn(
                "snap-start shrink-0 rounded-lg border px-3 py-2 text-[11px] font-semibold leading-tight transition-all shadow-sm",
                tabChipClasses(tone, active),
                !active && "opacity-90",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
