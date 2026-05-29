import { BrandMark } from "@/components/brand/BrandMark";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { useSiteBranding, type SiteBranding } from "@/hooks/use-site-branding";
import { cn } from "@/lib/utils";

type MobileTopBrandBarProps = {
  href?: string;
  branding?: SiteBranding;
  className?: string;
  /** Extra controls rendered after the language selector (e.g. theme toggle). */
  trailing?: React.ReactNode;
};

/** Logo + site title + language — brand left, language pinned to the top-right corner. */
export function MobileTopBrandBar({ href = "/", branding, className, trailing }: MobileTopBrandBarProps) {
  const live = useSiteBranding();
  const b = branding ?? live;

  return (
    <div
      className={cn(
        "relative flex items-center min-h-[3.25rem] py-2 pr-[3.75rem] min-w-0 max-w-full w-full",
        trailing && "pr-[6.5rem]",
        className,
      )}
    >
      <BrandMark
        href={href}
        className="min-w-0 flex-1 overflow-hidden"
        titleSize="md"
        logoClassName="h-9 w-auto max-w-[80px] sm:h-10 sm:max-w-[96px]"
        branding={b}
      />
      <LanguageSelector
        compact
        inline
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10"
      />
      {trailing ? (
        <div className="absolute right-[3.75rem] top-1/2 -translate-y-1/2 flex items-center shrink-0 z-10">
          {trailing}
        </div>
      ) : null}
    </div>
  );
}
