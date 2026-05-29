/** Radix portaled layers (Select, Popover, DropdownMenu, etc.) render outside Dialog/Sheet DOM. */
const PORTAL_INTERACTIVE_SELECTORS = [
  "[data-radix-select-content]",
  "[data-radix-popover-content]",
  "[data-radix-dropdown-menu-content]",
  "[data-radix-context-menu-content]",
  "[data-radix-hover-card-content]",
  "[data-radix-menubar-content]",
  "[data-radix-popper-content-wrapper]",
  '[role="listbox"]',
  '[role="menu"]',
];

export function isRadixPortalTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return PORTAL_INTERACTIVE_SELECTORS.some(sel => target.closest(sel));
}

/** Prevent Dialog/Sheet from closing when interacting with portaled Radix controls. */
export function preventRadixPortalDismiss(event: Event) {
  if (isRadixPortalTarget(event.target)) {
    event.preventDefault();
  }
}
