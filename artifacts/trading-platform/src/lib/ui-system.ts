/**
 * Kuber Quant — shared responsive UI tokens (Tailwind class strings).
 * Use across dashboards, finance flows, auth, and admin panels.
 */

/** Standard page vertical stack */
export const APP_PAGE_STACK = "page-stack min-w-0 max-w-full";

/** Page title / subtitle */
export const APP_PAGE_TITLE = "page-title";
export const APP_PAGE_SUBTITLE = "page-subtitle";

/** Responsive card surface */
export const APP_CARD =
  "border-border/80 dark:border-white/10 bg-card/95 dark:bg-[#0a1220]/80 shadow-sm backdrop-blur-sm min-w-0 overflow-hidden rounded-xl";

/** KPI metric card — used across investor + staff dashboards */
export const APP_KPI_CARD =
  "bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 min-w-0 max-w-full overflow-hidden rounded-xl shadow-sm";

/** Touch-friendly minimum hit area (44px) */
export const APP_TOUCH_TARGET = "min-h-11 min-w-11 sm:min-h-9 sm:min-w-9";

/** Modal / sheet max width steps */
export const APP_MODAL_SM = "max-w-[calc(100vw-1.5rem)] sm:max-w-md";
export const APP_MODAL_MD = "max-w-[calc(100vw-1.5rem)] sm:max-w-lg md:max-w-xl";
export const APP_MODAL_LG = "max-w-[calc(100vw-1.5rem)] sm:max-w-2xl lg:max-w-3xl";

/** Badge status tones */
export const APP_BADGE_SUCCESS = "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30";
export const APP_BADGE_WARNING = "bg-amber-500/15 text-amber-900 dark:text-amber-300 border-amber-500/30";
export const APP_BADGE_DANGER = "bg-red-500/15 text-red-800 dark:text-red-300 border-red-500/30";
export const APP_BADGE_INFO = "bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30";
export const APP_BADGE_NEUTRAL = "bg-muted text-muted-foreground border-border/80 dark:border-white/10";

/** Brand CTA — gold gradient, readable in light & dark */
export const BRAND_CTA_BTN =
  "bg-gradient-to-r from-amber-400 to-yellow-600 hover:from-amber-500 hover:to-yellow-700 text-amber-950 font-bold shadow-lg shadow-amber-500/20";
export const BRAND_SOLID_BTN =
  "bg-amber-500 hover:bg-amber-600 text-amber-950 font-semibold";

/** Auth pages — login, register, forgot-password */
export const AUTH_CARD =
  "w-full border-border dark:border-white/10 bg-card/95 dark:bg-white/5 backdrop-blur-md shadow-2xl min-w-0 rounded-xl text-card-foreground";
export const AUTH_INPUT =
  "bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 h-11 sm:h-12 min-h-[44px] text-foreground placeholder:text-muted-foreground";
export const AUTH_LABEL = "text-foreground";
export const AUTH_MUTED = "text-muted-foreground";
export const AUTH_LINK = "text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 hover:underline font-semibold";
export const AUTH_PRIMARY_BTN =
  "w-full h-11 sm:h-12 bg-gradient-to-r from-amber-400 to-yellow-600 hover:from-amber-500 hover:to-yellow-700 text-amber-950 font-bold text-base shadow-lg shadow-amber-500/20";

/** KPI / stat grids — 2 cols mobile → up to 4 on xl */
export const APP_STAT_GRID =
  "app-stat-grid grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 min-w-0";

/** Two-column dashboard split */
export const APP_DASHBOARD_SPLIT =
  "app-dashboard-split grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 min-w-0";

export const APP_DASHBOARD_MAIN = "app-dashboard-main md:col-span-2 min-w-0";
export const APP_DASHBOARD_SIDE = "app-dashboard-side flex flex-col gap-4 min-w-0";

/** Charts side-by-side from md */
export const APP_CHART_GRID =
  "app-chart-grid grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 min-w-0";

/** Header toolbar row */
export const APP_HEADER_ROW =
  "app-header-row flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 min-w-0";

export const APP_TOOLBAR_ROW =
  "app-toolbar-row flex flex-col md:flex-row md:items-center md:justify-between gap-3 min-w-0";

/** Tables — horizontal scroll wrapper */
export const APP_TABLE_WRAP =
  "app-table-wrap overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0 min-w-0 touch-pan-x";

/** Form field stack */
export const APP_FORM_STACK = "space-y-4 min-w-0";

/** Responsive action row (buttons) */
export const APP_ACTION_ROW =
  "flex flex-row flex-wrap items-center gap-2 sm:gap-3 min-w-0";

/** Two-column form grid — stacks on mobile */
export const APP_FORM_GRID =
  "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 min-w-0";

/** Three-column form grid — 1 → 2 → 3 cols */
export const APP_FORM_GRID_3 =
  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-w-0";

/** Touch-friendly icon button row */
export const APP_ICON_BTN_ROW =
  "flex flex-wrap items-center gap-2 min-w-0 [&_button]:min-h-10 [&_button]:sm:min-h-9";

/** Content max-width inside AppLayout main */
export const APP_CONTENT_WIDTH =
  "max-w-7xl xl:max-w-[1400px] 2xl:max-w-[1600px] 3xl:max-w-[1800px] mx-auto w-full min-w-0 px-0";

/** Public landing page content width (alias) */
export const LANDING_CONTENT = APP_CONTENT_WIDTH;

// Re-export staff aliases for backward compatibility
export {
  STAFF_PAGE_STACK,
  STAFF_CARD,
  STAFF_STAT_GRID,
  STAFF_STAT_GRID_DENSE,
  STAFF_DASHBOARD_SPLIT,
  STAFF_DASHBOARD_MAIN,
  STAFF_DASHBOARD_SIDE,
  STAFF_CHART_GRID,
  STAFF_HEADER_ROW,
  STAFF_TOOLBAR_ROW,
  STAFF_TABLE_WRAP,
  STAFF_QUICK_LINK_GRID,
  STAFF_QUICK_ACTIONS_GRID,
  STAFF_LIST_ROW,
  STAFF_FORM_GRID,
} from "@/lib/staff-dashboard-ui";
