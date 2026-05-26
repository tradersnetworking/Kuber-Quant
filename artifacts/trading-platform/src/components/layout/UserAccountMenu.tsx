import { Link } from "wouter";
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
import { getPostLoginPath, isStaffRole, getRoleAwareHref } from "@/lib/nav-config";

const PORTAL_META: Record<string, { label: string; icon: typeof ShieldAlert }> = {
  superadmin: { label: "Super Admin Portal", icon: ShieldAlert },
  manager: { label: "Manager Portal", icon: Users2 },
  support: { label: "Support Portal", icon: Headset },
};

export function UserAccountMenu({ compact }: { compact?: boolean }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const role = user.role as string;
  const staff = isStaffRole(role);
  const portal = PORTAL_META[role];
  const initials = user.fullName?.charAt(0)?.toUpperCase() || "?";
  const isSuperAdmin = role === "superadmin" || role === "admin";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={`gap-2 px-2 ${compact ? "h-9" : "h-10"}`}>
          <Avatar className="h-8 w-8 border border-primary/30">
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.fullName} /> : null}
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{initials}</AvatarFallback>
          </Avatar>
          {!compact && (
            <span className="hidden lg:flex flex-col items-start max-w-[140px]">
              <span className="text-sm font-medium truncate w-full text-left">{user.fullName}</span>
              <span className="text-[10px] text-muted-foreground capitalize">{role}</span>
            </span>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium truncate">{user.fullName}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {!isSuperAdmin && (
          <>
            <DropdownMenuItem asChild>
              <Link href={getRoleAwareHref(role, "/dashboard")} className="cursor-pointer flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" /> My Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={getRoleAwareHref(role, "/wallet")} className="cursor-pointer flex items-center gap-2">
                <Wallet className="h-4 w-4" /> My Wallet
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={getRoleAwareHref(role, "/investments")} className="cursor-pointer flex items-center gap-2">
                <Briefcase className="h-4 w-4" /> My Investments
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={getRoleAwareHref(role, "/account")} className="cursor-pointer flex items-center gap-2">
                <Settings className="h-4 w-4" /> My Account
              </Link>
            </DropdownMenuItem>
          </>
        )}

        {staff && portal && (
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
          <LogOut className="h-4 w-4 mr-2" /> Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
