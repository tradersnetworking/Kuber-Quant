import { cn } from "@/lib/utils";

export type TabTone =
  | "sky"
  | "blue"
  | "violet"
  | "green"
  | "amber"
  | "orange"
  | "red"
  | "cyan"
  | "indigo"
  | "teal"
  | "fuchsia"
  | "lime";

/** Cycle order for tabs without an explicit tone */
export const TAB_TONE_CYCLE: TabTone[] = [
  "sky",
  "blue",
  "violet",
  "green",
  "amber",
  "orange",
  "red",
  "cyan",
  "indigo",
  "teal",
];

const INACTIVE: Record<TabTone, string> = {
  sky: "text-sky-800 dark:text-sky-300 bg-sky-500/12 border-sky-500/30 hover:bg-sky-500/22 dark:hover:bg-sky-500/20",
  blue: "text-blue-800 dark:text-blue-300 bg-blue-500/12 border-blue-500/30 hover:bg-blue-500/22 dark:hover:bg-blue-500/20",
  violet: "text-violet-800 dark:text-violet-300 bg-violet-500/12 border-violet-500/30 hover:bg-violet-500/22 dark:hover:bg-violet-500/20",
  green: "text-green-800 dark:text-green-300 bg-green-500/12 border-green-500/30 hover:bg-green-500/22 dark:hover:bg-green-500/20",
  amber: "text-amber-900 dark:text-amber-300 bg-amber-500/15 border-amber-500/35 hover:bg-amber-500/25 dark:hover:bg-amber-500/20",
  orange: "text-orange-800 dark:text-orange-300 bg-orange-500/12 border-orange-500/30 hover:bg-orange-500/22 dark:hover:bg-orange-500/20",
  red: "text-red-800 dark:text-red-300 bg-red-500/12 border-red-500/30 hover:bg-red-500/22 dark:hover:bg-red-500/20",
  cyan: "text-cyan-800 dark:text-cyan-300 bg-cyan-500/12 border-cyan-500/30 hover:bg-cyan-500/22 dark:hover:bg-cyan-500/20",
  indigo: "text-indigo-800 dark:text-indigo-300 bg-indigo-500/12 border-indigo-500/30 hover:bg-indigo-500/22 dark:hover:bg-indigo-500/20",
  teal: "text-teal-800 dark:text-teal-300 bg-teal-500/12 border-teal-500/30 hover:bg-teal-500/22 dark:hover:bg-teal-500/20",
  fuchsia: "text-fuchsia-800 dark:text-fuchsia-300 bg-fuchsia-500/12 border-fuchsia-500/30 hover:bg-fuchsia-500/22 dark:hover:bg-fuchsia-500/20",
  lime: "text-lime-800 dark:text-lime-300 bg-lime-500/12 border-lime-500/30 hover:bg-lime-500/22 dark:hover:bg-lime-500/20",
};

const ACTIVE: Record<TabTone, string> = {
  sky: "data-[state=active]:bg-sky-600 data-[state=active]:text-white data-[state=active]:border-sky-600 dark:data-[state=active]:bg-sky-600 dark:data-[state=active]:text-white",
  blue: "data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white",
  violet: "data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:border-violet-600 dark:data-[state=active]:bg-violet-600 dark:data-[state=active]:text-white",
  green: "data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:border-green-600 dark:data-[state=active]:bg-green-600 dark:data-[state=active]:text-white",
  amber: "data-[state=active]:bg-amber-500 data-[state=active]:text-amber-950 data-[state=active]:border-amber-500 dark:data-[state=active]:bg-amber-500 dark:data-[state=active]:text-amber-950",
  orange: "data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:border-orange-600 dark:data-[state=active]:bg-orange-600 dark:data-[state=active]:text-white",
  red: "data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:border-red-600 dark:data-[state=active]:bg-red-600 dark:data-[state=active]:text-white",
  cyan: "data-[state=active]:bg-cyan-600 data-[state=active]:text-white data-[state=active]:border-cyan-600 dark:data-[state=active]:bg-cyan-600 dark:data-[state=active]:text-white",
  indigo: "data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:border-indigo-600 dark:data-[state=active]:bg-indigo-600 dark:data-[state=active]:text-white",
  teal: "data-[state=active]:bg-teal-600 data-[state=active]:text-white data-[state=active]:border-teal-600 dark:data-[state=active]:bg-teal-600 dark:data-[state=active]:text-white",
  fuchsia: "data-[state=active]:bg-fuchsia-600 data-[state=active]:text-white data-[state=active]:border-fuchsia-600 dark:data-[state=active]:bg-fuchsia-600 dark:data-[state=active]:text-white",
  lime: "data-[state=active]:bg-lime-600 data-[state=active]:text-lime-950 data-[state=active]:border-lime-600 dark:data-[state=active]:bg-lime-500 dark:data-[state=active]:text-lime-950",
};

/** Default tab list — scroll on mobile, wrap on md+ */
export const TAB_LIST_CLASS =
  "inline-flex h-auto min-h-9 w-full items-center justify-start gap-1.5 rounded-xl border border-border bg-muted/60 p-1.5 text-muted-foreground dark:border-white/10 dark:bg-black/30 max-md:flex-nowrap max-md:overflow-x-auto max-md:scrollbar-none max-md:snap-x max-md:snap-mandatory staff-mobile-tab-scroll md:flex-wrap md:overflow-visible";

/** Horizontal scroll tab list on phones; wrapped horizontal row on tablet+ */
export const TAB_LIST_MOBILE_SCROLL =
  "inline-flex h-auto min-h-9 w-full items-center justify-start gap-1.5 rounded-xl border border-border bg-muted/40 p-1.5 text-muted-foreground dark:border-white/10 dark:bg-black/20 max-md:flex-nowrap max-md:overflow-x-auto max-md:scrollbar-none max-md:snap-x max-md:snap-mandatory staff-mobile-tab-scroll md:flex-wrap md:overflow-visible";

export const TAB_TRIGGER_BASE =
  "inline-flex items-center justify-center min-w-0 max-w-full rounded-lg border px-2.5 py-2 text-xs font-medium transition-all sm:px-3 sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:font-semibold data-[state=active]:shadow-sm max-sm:text-[10px] max-sm:leading-tight max-sm:px-1.5 max-sm:py-1.5 [&_svg]:shrink-0 [&>:not(svg)]:min-w-0 [&>:not(svg)]:truncate";

const ACTIVE_SOLID: Record<TabTone, string> = {
  sky: "bg-sky-600 text-white border-sky-600 dark:bg-sky-600 dark:text-white",
  blue: "bg-blue-600 text-white border-blue-600 dark:bg-blue-600 dark:text-white",
  violet: "bg-violet-600 text-white border-violet-600 dark:bg-violet-600 dark:text-white",
  green: "bg-green-600 text-white border-green-600 dark:bg-green-600 dark:text-white",
  amber: "bg-amber-500 text-amber-950 border-amber-500 dark:bg-amber-500 dark:text-amber-950",
  orange: "bg-orange-600 text-white border-orange-600 dark:bg-orange-600 dark:text-white",
  red: "bg-red-600 text-white border-red-600 dark:bg-red-600 dark:text-white",
  cyan: "bg-cyan-600 text-white border-cyan-600 dark:bg-cyan-600 dark:text-white",
  indigo: "bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-600 dark:text-white",
  teal: "bg-teal-600 text-white border-teal-600 dark:bg-teal-600 dark:text-white",
  fuchsia: "bg-fuchsia-600 text-white border-fuchsia-600 dark:bg-fuchsia-600 dark:text-white",
  lime: "bg-lime-600 text-lime-950 border-lime-600 dark:bg-lime-500 dark:text-lime-950",
};

export function tabChipClasses(tone: TabTone, active = false): string {
  return active ? ACTIVE_SOLID[tone] : INACTIVE[tone];
}

export function tabToneClasses(tone: TabTone): string {
  return cn(INACTIVE[tone], ACTIVE[tone]);
}

export function tabToneByIndex(index: number): TabTone {
  return TAB_TONE_CYCLE[index % TAB_TONE_CYCLE.length]!;
}

/** Wallet / section tab aliases */
export type SectionTabTone = TabTone | "emerald" | "rose";

export function resolveSectionTabTone(tone: SectionTabTone): TabTone {
  if (tone === "emerald") return "green";
  if (tone === "rose") return "red";
  return tone;
}
