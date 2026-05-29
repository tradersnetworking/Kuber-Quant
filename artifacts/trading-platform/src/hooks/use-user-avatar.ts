import { useEffect, useState } from "react";
import { resolveAvatarUrl } from "@/lib/media-url";
import { fetchSecureUpload } from "@/lib/secure-upload";

/**
 * Resolve a displayable avatar URL — public profile photo first,
 * then authenticated KYC passport photo blob as fallback.
 */
export function useUserAvatar(
  avatarUrl?: string | null,
  passportPhotoUrl?: string | null,
): string | undefined {
  const publicSrc = resolveAvatarUrl(avatarUrl);
  const [secureSrc, setSecureSrc] = useState<string | null>(null);

  useEffect(() => {
    if (publicSrc || !passportPhotoUrl?.trim()) {
      setSecureSrc(null);
      return;
    }

    let revoked = false;
    let blobUrl: string | null = null;

    fetchSecureUpload(passportPhotoUrl)
      .then(preview => {
        if (revoked) {
          URL.revokeObjectURL(preview.blobUrl);
          return;
        }
        blobUrl = preview.blobUrl;
        setSecureSrc(preview.blobUrl);
      })
      .catch(() => setSecureSrc(null));

    return () => {
      revoked = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [publicSrc, passportPhotoUrl]);

  return publicSrc || secureSrc || undefined;
}
