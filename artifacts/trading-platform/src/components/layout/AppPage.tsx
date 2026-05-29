import * as React from "react";
import { cn } from "@/lib/utils";
import { APP_PAGE_STACK, APP_PAGE_TITLE, APP_PAGE_SUBTITLE } from "@/lib/ui-system";

type Props = {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  stackClassName?: string;
};

/** Consistent responsive page shell for all dashboard routes. */
export function AppPage({ title, subtitle, actions, children, className, stackClassName }: Props) {
  const hasHeader = !!(title || subtitle || actions);

  return (
    <div className={cn(APP_PAGE_STACK, stackClassName, className)}>
      {hasHeader && (
        <header className="app-page-header w-full max-w-full min-w-0">
          <div className="grid w-full max-w-full min-w-0 grid-cols-1 gap-2 sm:gap-2.5">
            {(title || actions) && (
              <div className="flex w-full max-w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                {title && (
                  <div className="min-w-0 w-full max-w-full sm:flex-1">
                    {typeof title === "string"
                      ? <h1 className={APP_PAGE_TITLE}>{title}</h1>
                      : title}
                  </div>
                )}
                {actions && (
                  <div className="app-action-bar shrink-0 sm:ml-auto">
                    {actions}
                  </div>
                )}
              </div>
            )}
            {subtitle && (
              typeof subtitle === "string"
                ? <p className={cn(APP_PAGE_SUBTITLE, "app-page-subtitle")}>{subtitle}</p>
                : <div className="app-page-subtitle min-w-0 w-full max-w-full">{subtitle}</div>
            )}
          </div>
        </header>
      )}
      {children}
    </div>
  );
}
