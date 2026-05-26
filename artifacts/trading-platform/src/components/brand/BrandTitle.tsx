import { cn } from "@/lib/utils";
import { useSiteBranding, type SiteBranding } from "@/hooks/use-site-branding";

const SIZE_CLASSES = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-3xl",
} as const;

type BrandTitleProps = {
  className?: string;
  size?: keyof typeof SIZE_CLASSES;
  branding?: Pick<SiteBranding, "titleGold" | "titleSilver" | "titleGoldColor" | "titleSilverColor">;
};

export function BrandTitle({ className, size = "md", branding }: BrandTitleProps) {
  const liveBranding = useSiteBranding();
  const {
    titleGold,
    titleSilver,
    titleGoldColor,
    titleSilverColor,
  } = branding ?? liveBranding;

  return (
    <span className={cn("font-bold tracking-tight", SIZE_CLASSES[size], className)}>
      <span style={{ color: titleGoldColor }}>{titleGold}</span>
      <span className="text-white/20"> </span>
      <span style={{ color: titleSilverColor }}>{titleSilver}</span>
    </span>
  );
}
