/** Shared layout + surface classes for staff portals (super admin, manager, support). */
export const STAFF_PAGE_STACK = "page-stack min-w-0 max-w-full";

export const STAFF_CARD =
  "border-border/80 dark:border-white/10 bg-card/95 dark:bg-[#0a1220]/80 shadow-sm backdrop-blur-sm min-w-0 max-w-full overflow-hidden rounded-xl";

export const STAFF_CARD_MUTED =
  "border-border/80 dark:border-white/10 bg-muted/50 dark:bg-white/[0.04] shadow-sm";

/** Stats: 2 cols mobile → up to 6 on very wide screens (wider cards until 2xl) */
export const STAFF_STAT_GRID =
  "staff-stat-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-6 gap-3 sm:gap-4 min-w-0";

/** Dense KPI rows (18+ platform metrics) — fewer columns so currency values fit */
export const STAFF_STAT_GRID_DENSE =
  "staff-stat-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 min-w-0";

/** Main dashboard split — stacked on mobile, side-by-side from tablet */
export const STAFF_DASHBOARD_SPLIT =
  "staff-dashboard-split grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 min-w-0";

export const STAFF_DASHBOARD_MAIN = "staff-dashboard-main md:col-span-2 min-w-0";

export const STAFF_DASHBOARD_SIDE =
  "staff-dashboard-side flex flex-col gap-4 min-w-0";

/** Charts / twin panels — vertical on mobile, 2-up from tablet */
export const STAFF_CHART_GRID =
  "staff-chart-grid grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 min-w-0";

/** Quick-link tiles — vertical list on mobile, horizontal grid on tablet+ */
export const STAFF_QUICK_LINK_GRID =
  "staff-quick-link-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3 min-w-0";

/** Quick actions inside a sidebar card — readable tiles at every breakpoint */
export const STAFF_QUICK_ACTIONS_GRID =
  "staff-quick-actions-grid grid grid-cols-1 gap-2.5 sm:gap-3 min-w-0";

/** Page / card headers — title block stacked on mobile, row on tablet+ */
export const STAFF_HEADER_ROW =
  "staff-header-row flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 min-w-0";

/** Filter / toolbar rows */
export const STAFF_TOOLBAR_ROW =
  "staff-toolbar-row flex flex-col md:flex-row md:items-center md:justify-between gap-3 min-w-0";

/** List item rows inside cards */
export const STAFF_LIST_ROW =
  "staff-list-row flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3 min-w-0 p-3 rounded-xl border border-border/80 dark:border-white/10 bg-muted/30 dark:bg-white/[0.03]";

export const STAFF_TABLE_WRAP = "app-table-wrap overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0 min-w-0 touch-pan-x";

/** Admin form grids — single column on phones */
export const STAFF_FORM_GRID =
  "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 min-w-0";

export const STAFF_FORM_GRID_3 =
  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-w-0";

export const STAFF_SECTION_TITLE =
  "text-xl sm:text-2xl md:text-3xl font-bold tracking-tight break-words";

export type StaffStatTone =
  | "blue"
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "cyan"
  | "orange"
  | "indigo"
  | "teal"
  | "fuchsia";

export const STAFF_STAT_TONES: Record<
  StaffStatTone,
  { value: string; bg: string; border: string; icon: string; bar: string }
> = {
  blue: {
    value: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    border: "border-blue-500/25 dark:border-blue-500/30",
    icon: "text-blue-600 dark:text-blue-400",
    bar: "from-blue-500 to-cyan-400",
  },
  emerald: {
    value: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    border: "border-emerald-500/25 dark:border-emerald-500/30",
    icon: "text-emerald-600 dark:text-emerald-400",
    bar: "from-emerald-500 to-teal-400",
  },
  amber: {
    value: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-500/12 dark:bg-amber-500/15",
    border: "border-amber-500/30 dark:border-amber-500/35",
    icon: "text-amber-700 dark:text-amber-400",
    bar: "from-amber-500 to-yellow-400",
  },
  rose: {
    value: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10 dark:bg-rose-500/15",
    border: "border-rose-500/25 dark:border-rose-500/30",
    icon: "text-rose-600 dark:text-rose-400",
    bar: "from-rose-500 to-pink-400",
  },
  violet: {
    value: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10 dark:bg-violet-500/15",
    border: "border-violet-500/25 dark:border-violet-500/30",
    icon: "text-violet-600 dark:text-violet-400",
    bar: "from-violet-500 to-purple-400",
  },
  cyan: {
    value: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-500/10 dark:bg-cyan-500/15",
    border: "border-cyan-500/25 dark:border-cyan-500/30",
    icon: "text-cyan-600 dark:text-cyan-400",
    bar: "from-cyan-500 to-sky-400",
  },
  orange: {
    value: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10 dark:bg-orange-500/15",
    border: "border-orange-500/25 dark:border-orange-500/30",
    icon: "text-orange-600 dark:text-orange-400",
    bar: "from-orange-500 to-amber-400",
  },
  indigo: {
    value: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-500/10 dark:bg-indigo-500/15",
    border: "border-indigo-500/25 dark:border-indigo-500/30",
    icon: "text-indigo-600 dark:text-indigo-400",
    bar: "from-indigo-500 to-blue-400",
  },
  teal: {
    value: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-500/10 dark:bg-teal-500/15",
    border: "border-teal-500/25 dark:border-teal-500/30",
    icon: "text-teal-600 dark:text-teal-400",
    bar: "from-teal-500 to-emerald-400",
  },
  fuchsia: {
    value: "text-fuchsia-600 dark:text-fuchsia-400",
    bg: "bg-fuchsia-500/10 dark:bg-fuchsia-500/15",
    border: "border-fuchsia-500/25 dark:border-fuchsia-500/30",
    icon: "text-fuchsia-600 dark:text-fuchsia-400",
    bar: "from-fuchsia-500 to-pink-400",
  },
};
