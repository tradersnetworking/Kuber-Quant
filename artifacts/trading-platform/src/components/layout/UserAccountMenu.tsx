import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronDown, LayoutDashboard, Wallet, Settings, LogOut,
  ShieldAlert, Users2, Headset, Briefcase,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { getPostLoginPath, isStaffRole, getRoleAwareHref } from "@/lib/nav-config";
import { cn } from "@/lib/utils";
import { authFetchJson } from "@/lib/token-store";
import { useUserAvatar } from "@/hooks/use-user-avatar";

const PORTAL_META: Record<string, { label: string; icon: typeof ShieldAlert }> = {
  superadmin: { label: "Super Admin Portal", icon: ShieldAlert },
  admin: { label: "Platform Admin Portal", icon: ShieldAlert },
  manager: { label: "Manager Portal", icon: Users2 },
  support: { label: "Support Portal", icon: Headset },
};

export function UserAccountMenu({ compact }: { compact?: boolean }) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  if (!user) return null;

  const role = user.role as string;
  const staff = isStaffRole(role);
  const portal = PORTAL_META[role];
  const initials = user.fullName?.charAt(0)?.toUpperCase() || "?";
  const { data: kycData } = useQuery({
    queryKey: ["/api/kyc", "avatar-fallback"],
    queryFn: () => authFetchJson<{ passportPhotoUrl?: string | null }>("/kyc"),
    enabled: !user.avatarUrl,
    staleTime: 60_000,
  });
  const avatarSrc = useUserAvatar(user.avatarUrl, kycData?.passportPhotoUrl);
  const isSuperAdmin = role === "superadmin" || role === "admin";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={cn("gap-1.5 px-1", compact ? "h-7 min-w-7" : "h-10")}>
          <Avatar className={cn("border border-primary/30", compact ? "h-6 w-6" : "h-8 w-8")}>
            {avatarSrc ? <AvatarImage src={avatarSrc} alt={user.fullName} key={avatarSrc} /> : null}
            <AvatarFallback className={cn("bg-primary/10 text-primary font-bold", compact ? "text-[10px]" : "text-sm")}>{initials}</AvatarFallback>
          </Avatar>
          {!compact && (
            <span className="hidden lg:flex flex-col items-start max-w-[140px]">
              <span className="text-sm font-medium truncate w-full text-left">{user.fullName}</span>
              <span className="text-[10px] text-muted-foreground capitalize">{t(`roles.${role}`, { defaultValue: role })}</span>
            </span>
          )}
          {!compact && (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium truncate">{user.fullName}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {!isSuperAdmin && role !== "support" && (
          <>
            <DropdownMenuItem asChild>
              <Link href={getRoleAwareHref(role, "/dashboard")} className="cursor-pointer flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" /> {t("nav.myDashboard")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={getRoleAwareHref(role, "/wallet")} className="cursor-pointer flex items-center gap-2">
                <Wallet className="h-4 w-4" /> {t("nav.myWallet")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={getRoleAwareHref(role, "/investments")} className="cursor-pointer flex items-center gap-2">
                <Briefcase className="h-4 w-4" /> {t("nav.myInvestments")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={getRoleAwareHref(role, "/account")} className="cursor-pointer flex items-center gap-2">
                <Settings className="h-4 w-4" /> {t("nav.myAccount")}
              </Link>
            </DropdownMenuItem>
          </>
        )}

        {staff && portal && role !== "support" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={getPostLoginPath(role)} className="cursor-pointer flex items-center gap-2">
                <portal.icon className="h-4 w-4" /> {portal.label}
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
          <LogOut className="h-4 w-4 mr-2" /> {t("common.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
