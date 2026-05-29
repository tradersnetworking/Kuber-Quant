import { useEffect, useMemo, useState } from "react";

import {

  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,

} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import { Skeleton } from "@/components/ui/skeleton";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useSiteBranding } from "@/hooks/use-site-branding";
import { getShareUserDisplayName } from "@/lib/user-display-name";

import {

  buildProfitShareContent,

  downloadProfitShareImage,

  generateProfitShareImage,

  getReferralSharePlatformUrl,

  shareReferralWithImage,

  type ProfitSharePayload,

  type ReferralSharePlatform,

} from "@/lib/profit-share";

import { Download, TrendingUp } from "lucide-react";

import { SharePlatformGrid } from "@/components/share/SharePlatformGrid";

import { ShareUserIdentityBadge } from "@/components/share/ShareUserIdentityBadge";

import { cn } from "@/lib/utils";



type Props = {

  open: boolean;

  onOpenChange: (open: boolean) => void;

  payload: ProfitSharePayload | null;

};



export function ProfitShareDialog({ open, onOpenChange, payload }: Props) {

  const { toast } = useToast();
  const { user } = useAuth();
  const branding = useSiteBranding();

  const sharePayload = useMemo(() => {
    if (!payload) return null;
    return {
      ...payload,
      userName: payload.userName || getShareUserDisplayName(user),
      avatarUrl: payload.avatarUrl ?? user?.avatarUrl ?? null,
      siteName: branding.siteName,
    };
  }, [payload, user, branding.siteName]);

  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [imageBlob, setImageBlob] = useState<Blob | null>(null);

  const [generating, setGenerating] = useState(false);

  const [sharing, setSharing] = useState<ReferralSharePlatform | null>(null);



  const content = useMemo(() => {
    if (!sharePayload) return null;
    return buildProfitShareContent(sharePayload);
  }, [sharePayload]);



  useEffect(() => {

    if (!open || !sharePayload) return;

    let cancelled = false;

    setGenerating(true);

    setImageUrl(null);

    setImageBlob(null);



    generateProfitShareImage({
      ...sharePayload,
      logoUrl: branding.logoUrl || "/kuber-quant-logo.png",
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

  }, [open, sharePayload, branding.logoUrl, toast]);



  useEffect(() => {

    return () => {

      if (imageUrl) URL.revokeObjectURL(imageUrl);

    };

  }, [imageUrl]);



  const handlePlatformShare = async (platform: ReferralSharePlatform) => {

    if (!content || !payload) return;

    setSharing(platform);

    try {

      const shareContent = {

        title: content.title,

        message: content.message,

        link: content.link,

        code: content.code,

      };

      if (imageBlob) {

        const sharedNatively = await shareReferralWithImage(shareContent, imageBlob);

        if (sharedNatively) {

          toast({

            title: "Shared successfully",

            description: payload.service === "withdrawal"

              ? "Your withdrawal update was shared."

              : "Your profit achievement was shared.",

          });

          onOpenChange(false);

          return;

        }

      }

      window.open(getReferralSharePlatformUrl(platform, shareContent), "_blank", "noopener,noreferrer");

      if (imageBlob) {

        downloadProfitShareImage(imageBlob, payload.service);

        toast({

          title: "Share image downloaded",

          description: "Attach the image in your message if the app did not include it automatically.",

        });

      }

    } finally {

      setSharing(null);

    }

  };



  if (!payload) return null;



  const isWithdrawal = payload.service === "withdrawal";

  const withdrawalSubmitted = isWithdrawal && payload.withdrawalPhase === "submitted";



  return (

    <Dialog open={open} onOpenChange={onOpenChange}>

      <DialogContent className="dialog-scroll-content max-w-lg border-border dark:border-white/10 p-0 gap-0">

        <DialogHeader className="shrink-0 px-4 pt-4 sm:px-6 sm:pt-6">

          <DialogTitle className="flex items-center gap-2 pr-8">

            <TrendingUp className={cn("h-5 w-5 shrink-0", isWithdrawal ? "text-red-400" : "text-green-500")} />

            {isWithdrawal

              ? withdrawalSubmitted ? "Share Withdrawal Request" : "Share Withdrawal Done"

              : "Share Profit Booked"}

          </DialogTitle>

          <DialogDescription>

            {isWithdrawal

              ? "Branded image with your name in a circle, withdrawal amount, invite code, and QR."

              : `Branded image with your name, P&L, ROI %, invite code, and QR.`}

          </DialogDescription>

        </DialogHeader>



        <div className="dialog-form-inner space-y-4 pt-1">

          <ShareUserIdentityBadge

            userName={sharePayload?.userName ?? payload.userName}

            avatarUrl={sharePayload?.avatarUrl ?? payload.avatarUrl}

            accentClass={cn(

              isWithdrawal

                ? withdrawalSubmitted

                  ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400"

                  : "border-red-500/50 bg-red-500/10 text-red-500"

                : "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400",

            )}

          />



          <div className="rounded-xl border border-border dark:border-white/10 overflow-hidden bg-muted/40">

            {generating ? (

              <Skeleton className="w-full aspect-square" />

            ) : imageUrl ? (

              <img src={imageUrl} alt="Share preview" className="w-full aspect-square object-contain bg-black/20" />

            ) : (

              <div className="aspect-square flex items-center justify-center text-sm text-muted-foreground">

                Preview unavailable

              </div>

            )}

          </div>



          {content && (

            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line break-words">{content.message}</p>

          )}



          <SharePlatformGrid onShare={handlePlatformShare} sharing={sharing} disabled={generating} />



          {imageBlob && (

            <Button

              variant="ghost"

              size="wrap"

              className="w-full"

              onClick={() => downloadProfitShareImage(imageBlob, payload.service)}

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


