import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { REFERRAL_SHARE_PLATFORMS, type ReferralSharePlatform } from "@/lib/referral-share";
import { Loader2, Mail, MessageCircle, Send, Smartphone } from "lucide-react";

const PLATFORM_ICONS: Record<ReferralSharePlatform, typeof MessageCircle> = {
  whatsapp: MessageCircle,
  telegram: Send,
  email: Mail,
  sms: Smartphone,
};

type Props = {
  onShare: (platform: ReferralSharePlatform) => void;
  sharing: ReferralSharePlatform | null;
  disabled?: boolean;
};

export function SharePlatformGrid({ onShare, sharing, disabled }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 min-w-0">
      {REFERRAL_SHARE_PLATFORMS.map(platform => {
        const Icon = PLATFORM_ICONS[platform.id];
        const busy = sharing === platform.id;
        return (
          <Button
            key={platform.id}
            type="button"
            variant="outline"
            size="wrap"
            disabled={disabled || !!sharing}
            onClick={() => onShare(platform.id)}
            className={cn(
              "h-auto min-h-[4.75rem] py-3 px-3 flex flex-col items-center justify-center gap-1.5 text-center border-2 min-w-0 w-full",
              platform.color,
            )}
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin shrink-0" />
            ) : (
              <Icon className="h-5 w-5 shrink-0" />
            )}
            <span className="font-semibold text-sm leading-tight break-words">{platform.label}</span>
            <span className="text-[10px] opacity-80 font-normal leading-snug break-words px-1">
              {platform.description}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
