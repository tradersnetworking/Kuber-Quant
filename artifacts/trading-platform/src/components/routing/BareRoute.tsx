import type { ComponentType } from "react";

/** Renders a page component without extra wrappers (layout is provided by DashboardShell). */
export function BareRoute({ component: Component, ...rest }: { component: ComponentType<any> }) {
  return <Component {...rest} />;
}
