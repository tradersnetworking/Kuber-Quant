import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  logoUrl?: string | null;
  alt?: string;
};

/** Default KQ monogram when no uploaded branding logo is available. */
export function BrandLogo({ className, logoUrl, alt = "Kuber Quant" }: BrandLogoProps) {
  if (logoUrl?.trim()) {
    return <img src={logoUrl} alt={alt} className={cn("object-contain", className)} />;
  }

  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={alt}
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="kq-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D4AF37" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#050A14" />
      <rect x="3" y="3" width="58" height="58" rx="12" fill="none" stroke="url(#kq-gold)" strokeWidth="2" />
      <text
        x="32"
        y="41"
        textAnchor="middle"
        fontSize="22"
        fontWeight="700"
        fill="url(#kq-gold)"
        fontFamily="system-ui, sans-serif"
      >
        KQ
      </text>
    </svg>
  );
}
