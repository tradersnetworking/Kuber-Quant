import { cn } from "@/lib/utils";

/** Full-width CTAs with icon + long label — safe on narrow phones. */
export const mobileBtnWrap = cn(
  "whitespace-normal h-auto min-h-10 py-2 px-3",
  "text-center leading-tight max-sm:text-xs sm:text-sm",
  "[&_svg]:shrink-0",
);

/** Payment / wallet tab triggers — icon + label inside cramped grids. */
export const mobileTabTrigger = cn(
  "min-w-0 max-w-full w-full md:w-auto md:flex-1",
  "max-sm:text-[10px] max-sm:leading-tight max-sm:px-1.5 max-sm:py-1.5",
  "justify-start md:justify-center",
  "[&_svg]:shrink-0",
  "[&>:not(svg)]:min-w-0 [&>:not(svg)]:truncate",
);

/** Wallet / money hub section tabs — horizontal scroll on phones, wrap on tablet+. */
export const walletSectionTabsList = cn(
  "w-full min-w-0 gap-1.5 p-1",
);

/** Section tab triggers (Overview, Deposit, Withdraw…) — stay horizontal in scroll rows. */
export const walletSectionTabTrigger = cn(
  "min-w-0 max-w-full shrink-0 snap-start",
  "max-sm:text-[10px] max-sm:leading-tight max-sm:px-2 max-sm:py-1.5",
  "justify-center",
  "[&_svg]:shrink-0",
);

/**
 * Payment method tabs (UPI / Bank / Crypto / Online):
 * stacked full-width on phones, horizontal row from tablet up.
 */
export const paymentMethodTabsList = cn(
  "payment-method-tabs-list w-full min-w-0 gap-1.5 p-1",
  "!flex flex-col md:!inline-flex md:flex-row md:flex-wrap md:items-stretch",
);

/** Nested account picker tabs inside a method — scroll horizontally on tablet+, stack on mobile. */
export const paymentMethodSubTabsList = cn(
  paymentMethodTabsList,
  "md:flex-nowrap md:overflow-x-auto md:scrollbar-none",
);

/** Long-label admin tabs (Homepage Content, etc.) — full-width stack on phones, row on tablet+. */
export const stackedMobileTabsList = cn(
  "stacked-mobile-tabs-list w-full min-w-0 gap-1.5 p-1",
  "!flex flex-col md:!inline-flex md:flex-row md:flex-wrap md:items-stretch md:overflow-visible",
);

export const stackedMobileTabTrigger = cn(
  "min-w-0 max-w-full w-full md:w-auto md:flex-1 md:shrink",
  "justify-start md:justify-center",
  "[&_svg]:shrink-0",
  "[&>:not(svg)]:min-w-0 [&>:not(svg)]:truncate",
);

/** File / chip rows with icon + filename + action. */
export const mobileChipRow = "flex items-center gap-2 min-w-0 max-w-full";

/** Card headers with title + trailing action. */
export const mobileCardHeader = "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between min-w-0";
