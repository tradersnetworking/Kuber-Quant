import { cn } from "@/lib/utils";

/** Shared quick-action button — readable on mobile through large desktop. */
export const QUICK_ACTION_BTN = cn(
  "w-full min-h-11 sm:min-h-12 lg:min-h-[3.25rem]",
  "h-auto py-2.5 px-3 lg:px-4",
  "inline-flex flex-row items-center justify-center gap-2 lg:gap-2.5",
  "text-xs sm:text-sm lg:text-[0.9375rem] font-semibold leading-snug",
  "whitespace-normal text-center",
  "border border-black/[0.06] dark:border-white/10",
  "shadow-sm hover:shadow-md transition-all",
  "overflow-visible",
);

export const QUICK_ACTION_ICON = "h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem] lg:h-5 lg:w-5 shrink-0";

export const QUICK_ACTION_LABEL =
  "min-w-0 text-center leading-snug break-words [overflow-wrap:break-word]";

/** Short deposit / withdraw labels — never squeeze to one character per line. */
export const WALLET_ACTION_LABEL = "shrink-0 whitespace-nowrap";

/** Trading / nav shortcut grid — scales sensibly on large screens. */
export const QUICK_ACTION_GRID = cn(
  "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
  "gap-2.5 sm:gap-3 lg:gap-3.5 min-w-0",
);

/** Deposit / withdraw pair — row in headers, grid in cards. */
export const WALLET_ACTIONS_ROW = cn(
  "flex flex-row flex-wrap items-center justify-start sm:justify-end gap-2 lg:gap-3 min-w-0 max-w-full",
);

export const WALLET_ACTIONS_GRID =
  "grid grid-cols-2 keep-cols-2 gap-2.5 sm:gap-3 min-w-0";

export const WALLET_ACTION_BTN = cn(
  QUICK_ACTION_BTN,
  "flex-1 xs:flex-none min-w-[7.5rem] sm:min-w-[9rem] lg:min-w-[10rem] xl:flex-none",
);

/** Compact header toolbar — deposit/withdraw inline with refer & notifications. */
export const WALLET_ACTION_BTN_COMPACT = cn(
  "h-8 sm:h-9 px-3 text-xs sm:text-sm font-semibold shrink-0",
  "inline-flex items-center justify-center whitespace-nowrap",
  "border border-black/[0.06] dark:border-white/10 shadow-sm",
);

export const WALLET_ACTIONS_INLINE = "flex flex-row flex-wrap items-center gap-1.5 sm:gap-2 min-w-0";
