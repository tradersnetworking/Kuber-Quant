import { BrandMark } from "@/components/brand/BrandMark";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { useSiteBranding, type SiteBranding } from "@/hooks/use-site-branding";
import { cn } from "@/lib/utils";

type MobileTopBrandBarProps = {
  href?: string;
  branding?: SiteBranding;
  className?: string;
  /** Theme toggle and notifications — rendered before the language selector. */
  trailing?: React.ReactNode;
};

/** Mobile top row: brand on the left; theme, bell, and language on the right. */
export function MobileTopBrandBar({ href = "/", branding, className, trailing }: MobileTopBrandBarProps) {
  const live = useSiteBranding();
  const b = branding ?? live;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 min-h-[2.75rem] py-1.5 min-w-0 max-w-full w-full",
        className,
      )}
    >
      <BrandMark
        href={href}
        shrinkable
        titleSize="sm"
        className="min-w-0 overflow-hidden"
        logoClassName="h-7 w-auto max-w-[48px] shrink-0"
        branding={b}
      />
      <div className="flex items-center shrink-0 gap-1 ml-auto pl-1">
        {trailing}
        {/* Divider keeps the language picker from visually colliding with the bell on phones */}
        <span aria-hidden className="h-5 w-px bg-border/60 mx-0.5 shrink-0" />
        <LanguageSelector compact brandBar />
      </div>
    </div>
  );
}
