import * as React from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { walletSectionTabTrigger, walletSectionTabsList } from "@/lib/mobile-ui";
import {
  TAB_LIST_CLASS,
  TAB_TRIGGER_BASE,
  resolveSectionTabTone,
  tabToneClasses,
  type SectionTabTone,
} from "@/lib/tab-tones";

export type WalletTabTone = SectionTabTone;

export function WalletTabsList({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsList>) {
  return <TabsList className={cn(TAB_LIST_CLASS, walletSectionTabsList, className)} {...props} />;
}

type WalletTabsTriggerProps = React.ComponentPropsWithoutRef<typeof TabsTrigger> & {
  tone?: WalletTabTone;
};

export function WalletTabsTrigger({ tone = "amber", className, ...props }: WalletTabsTriggerProps) {
  return (
    <TabsTrigger
      className={cn(TAB_TRIGGER_BASE, walletSectionTabTrigger, tabToneClasses(resolveSectionTabTone(tone)), className)}
      {...props}
    />
  );
}
