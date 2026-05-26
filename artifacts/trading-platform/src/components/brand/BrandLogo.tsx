import { cn } from "@/lib/utils";
import { resolveBrandLogoUrl } from "@/lib/brand-assets";

type BrandLogoProps = {
  className?: string;
  logoUrl?: string | null;
  alt?: string;
};

/** Platform logo — uses the bundled Kuber Quant asset when no custom URL is set. */
export function BrandLogo({ className, logoUrl, alt = "Kuber Quant" }: BrandLogoProps) {
  return (
    <img
      src={resolveBrandLogoUrl(logoUrl)}
      alt={alt}
      className={cn("object-contain shrink-0", className)}
    />
  );
}
