import { cn } from "@/lib/utils";
import { getUserInitials, resolveShareAvatarUrl } from "@/lib/share-image-utils";

type Props = {
  userName: string;
  avatarUrl?: string | null;
  size?: "sm" | "md";
  className?: string;
  accentClass?: string;
};

export function ShareUserIdentityBadge({
  userName,
  avatarUrl,
  size = "md",
  className,
  accentClass = "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400",
}: Props) {
  const initials = getUserInitials(userName);
  const circle = size === "sm" ? "h-10 w-10 text-xs" : "h-14 w-14 text-sm";
  const nameClass = size === "sm" ? "text-sm" : "text-base";
  const resolvedAvatar = resolveShareAvatarUrl(userName, avatarUrl);

  return (
    <div className={cn("flex items-center gap-3 min-w-0", className)}>
      <div
        className={cn(
          "relative shrink-0 rounded-full border-2 flex items-center justify-center font-bold overflow-hidden",
          circle,
          accentClass,
        )}
        aria-hidden
      >
        {resolvedAvatar ? (
          <img src={resolvedAvatar} alt="" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Sharing as</p>
        <p className={cn("font-semibold leading-snug break-words", nameClass)}>{userName}</p>
      </div>
    </div>
  );
}
