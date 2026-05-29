import * as React from "react";

import { cn } from "@/lib/utils";

import { ThemeToggle } from "@/components/layout/ThemeToggle";

import { LanguageSelector } from "@/components/layout/LanguageSelector";



type Props = {

  children: React.ReactNode;

  brandPanel?: React.ReactNode;

  className?: string;

};



/** Shared responsive shell for login, register, forgot-password. */
export function AuthPageLayout({ children, brandPanel, className }: Props) {
  return (
    <div className={cn("min-h-[100dvh] bg-background flex flex-col md:flex-row overflow-x-clip relative", className)}>
      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 sm:right-4 z-20 flex items-center gap-1.5">
        <LanguageSelector compact />
        <ThemeToggle className="touch-target h-10 w-10 sm:h-9 sm:w-9 bg-card/80 backdrop-blur-sm border border-border/60 shadow-sm" />
      </div>
      {brandPanel}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-10 lg:p-12 pt-[max(3.75rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] min-w-0 w-full">
        <div className="w-full max-w-md lg:max-w-lg min-w-0">{children}</div>
      </div>
    </div>
  );
}

