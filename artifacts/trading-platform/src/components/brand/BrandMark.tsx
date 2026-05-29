import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BrandTitle } from "@/components/brand/BrandTitle";
import { useSiteBranding, type SiteBranding } from "@/hooks/use-site-branding";

type BrandMarkProps = {
  href?: string;
  className?: string;
  logoClassName?: string;
  titleSize?: "sm" | "md" | "lg" | "xl";
  branding?: SiteBranding;
  onClick?: () => void;
  /** Allow the mark to shrink in crowded headers (mobile brand bar). */
  shrinkable?: boolean;
};

/** Logo + site title on one line — for fixed mobile/public headers. */
export function BrandMark({
  href = "/",
  className,
  logoClassName,
  titleSize = "sm",
  branding,
  onClick,
  shrinkable = false,
}: BrandMarkProps) {
  const live = useSiteBranding();
  const b = branding ?? live;

  const inner = (
    <div className={cn("flex items-center gap-1.5 sm:gap-2 lg:gap-3 min-w-0 max-w-full", className)}>
      <BrandLogo
        className={cn(
          "h-6 sm:h-8 lg:h-11 xl:h-12 w-auto max-w-[52px] sm:max-w-[88px] lg:max-w-[120px] xl:max-w-[140px] shrink-0",
          logoClassName,
        )}
        logoUrl={b.logoUrl}
        alt={b.siteName}
      />
      <BrandTitle
        size={titleSize}
        branding={b}
        className={cn(
          "truncate min-w-0 block leading-tight",
          titleSize === "sm" && "text-sm sm:text-base lg:text-lg xl:text-xl",
          titleSize === "md" && "text-base sm:text-lg lg:text-2xl xl:text-3xl",
          titleSize === "lg" && "text-lg sm:text-xl lg:text-3xl xl:text-4xl",
          titleSize === "xl" && "text-xl sm:text-2xl lg:text-4xl xl:text-5xl",
        )}
      />
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          "min-w-0 max-w-full block",
          shrinkable ? "flex-1 min-w-0 overflow-hidden shrink" : "shrink-0",
        )}
      >
        {inner}
      </Link>
    );
  }

  return inner;
}
