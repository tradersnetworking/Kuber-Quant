import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

type Props = {
  children: React.ReactNode;
  redirectTo?: string;
};

/** Waits for session restore, then renders children or redirects to login. */
export function AuthGate({ children, redirectTo = "/login" }: Props) {
  const { user, isRestoring } = useAuth();

  if (isRestoring) {
    return (
      <div className="min-h-screen bg-[#050A14] bg-background text-foreground flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your session…</p>
      </div>
    );
  }

  if (!user) {
    return <Redirect to={redirectTo} />;
  }

  return <>{children}</>;
}
