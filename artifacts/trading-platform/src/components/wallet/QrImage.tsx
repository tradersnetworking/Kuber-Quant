import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type QrImageProps = {
  src?: string | null;
  fallbackSrc?: string;
  alt: string;
  className?: string;
};

/** QR image with automatic fallback when a stored upload URL is stale or missing. */
export function QrImage({ src, fallbackSrc, alt, className }: QrImageProps) {
  const [current, setCurrent] = useState(src || fallbackSrc || "");

  useEffect(() => {
    setCurrent(src || fallbackSrc || "");
  }, [src, fallbackSrc]);

  if (!current) return null;

  return (
    <img
      src={current}
      alt={alt}
      className={cn(className)}
      onError={() => {
        if (fallbackSrc && current !== fallbackSrc) {
          setCurrent(fallbackSrc);
        }
      }}
    />
  );
}
