import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useSiteBranding } from "@/hooks/use-site-branding";
import {
  buildReferralShareContent,
  downloadReferralImage,
  generateReferralShareImage,
  getReferralSharePlatformUrl,
  shareReferralWithImage,
  type ReferralSharePlatform,
} from "@/lib/referral-share";
import { buildReferralLink } from "@/lib/referral-attribution";
import { Download, Share2 } from "lucide-react";
import { SharePlatformGrid } from "@/components/share/SharePlatformGrid";
import { ShareUserIdentityBadge } from "@/components/share/ShareUserIdentityBadge";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralCode: string;
  inviterName: string;
  avatarUrl?: string | null;
};

export function ReferralShareDialog({ open, onOpenChange, referralCode, inviterName, avatarUrl }: Props) {
  const { toast } = useToast();
  const branding = useSiteBranding();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sharing, setSharing] = useState<ReferralSharePlatform | null>(null);

  const link = useMemo(() => buildReferralLink(referralCode), [referralCode]);
  const content = useMemo(
    () => buildReferralShareContent({
      link,
      code: referralCode,
      inviterName,
      siteName: branding.siteName,
    }),
    [link, referralCode, inviterName, branding.siteName],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setGenerating(true);
    setImageUrl(null);
    setImageBlob(null);

    generateReferralShareImage({
      link,
      code: referralCode,
      inviterName,
      siteName: branding.siteName,
      logoUrl: branding.logoUrl || "/kuber-quant-logo.png",
      avatarUrl,
    })
      .then(blob => {
        if (cancelled) return;
        setImageBlob(blob);
        setImageUrl(URL.createObjectURL(blob));
      })
      .catch(() => {
        if (!cancelled) {
          toast({ title: "Could not generate share image", variant: "destructive" });
        }
      })
      .finally(() => {
        if (!cancelled) setGenerating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, link, referralCode, inviterName, avatarUrl, branding.siteName, branding.logoUrl, toast]);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const handlePlatformShare = async (platform: ReferralSharePlatform) => {
    setSharing(platform);
    try {
      if (imageBlob) {
        const sharedNatively = await shareReferralWithImage(content, imageBlob);
        if (sharedNatively) {
          toast({ title: "Shared successfully", description: "Your referral invite was shared." });
          onOpenChange(false);
          return;
        }
      }
      window.open(getReferralSharePlatformUrl(platform, content), "_blank", "noopener,noreferrer");
      if (imageBlob) {
        downloadReferralImage(imageBlob, referralCode);
        toast({
          title: "Share image downloaded",
          description: "Attach the image in your message if the app did not include it automatically.",
        });
      }
    } finally {
      setSharing(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dialog-scroll-content max-w-lg border-border dark:border-white/10 p-0 gap-0">
        <DialogHeader className="shrink-0 px-4 pt-4 sm:px-6 sm:pt-6">
          <DialogTitle className="flex items-center gap-2 pr-8">
            <Share2 className="h-5 w-5 text-amber-500 shrink-0" />
            Share Your Referral
          </DialogTitle>
          <DialogDescription>
            Branded image with logo, invite code, and QR — share via WhatsApp, Telegram, email, or SMS.
          </DialogDescription>
        </DialogHeader>

        <div className="dialog-form-inner space-y-4 pt-1">
          <ShareUserIdentityBadge userName={inviterName} avatarUrl={avatarUrl} />

          <div className="rounded-xl border border-border dark:border-white/10 overflow-hidden bg-muted/40">
            {generating ? (
              <Skeleton className="w-full aspect-square" />
            ) : imageUrl ? (
              <img src={imageUrl} alt="Referral share preview" className="w-full aspect-square object-contain bg-black/20" />
            ) : (
              <div className="aspect-square flex items-center justify-center text-sm text-muted-foreground">
                Preview unavailable
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line break-words">{content.message}</p>

          <SharePlatformGrid onShare={handlePlatformShare} sharing={sharing} disabled={generating} />

          {imageBlob && (
            <Button
              variant="ghost"
              size="wrap"
              className="w-full"
              onClick={() => downloadReferralImage(imageBlob, referralCode)}
            >
              <Download className="h-4 w-4 mr-2 shrink-0" />
              Download share image
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
