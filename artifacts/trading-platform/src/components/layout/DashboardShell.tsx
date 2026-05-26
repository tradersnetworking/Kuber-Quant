import { AuthGate } from "@/components/auth/AuthGate";
import { AppLayout } from "@/components/layout/AppLayout";
import { SuperAdminInvestorRedirect } from "@/components/routing/SuperAdminInvestorRedirect";
import { SafeBoundary } from "@/components/SafeBoundary";

/** Persistent sidebar + header for all authenticated dashboard routes. */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate redirectTo="/login">
      <SuperAdminInvestorRedirect />
      <SafeBoundary label="Dashboard layout failed to load. Please refresh the page.">
        <AppLayout>{children}</AppLayout>
      </SafeBoundary>
    </AuthGate>
  );
}
