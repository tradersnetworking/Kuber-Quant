import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { Suspense, useEffect, useState, type ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import LandingPage from "@/pages/landing";
import NotFound from "@/pages/not-found";
import {
  LoginPage,
  RegisterPage,
  RegisterManagerPage,
  StaffLoginPage,
  ForgotPasswordPage,
  ManagerDashboard,
  ManagerClients,
  ManagerClientDetail,
  ManagerKyc,
  ManagerTransactions,
  ManagerUpcomingTransactions,
  ManagerTickets,
  ManagerMail,
  ManagerPlansPage,
  ManagerStakingPlansPage,
  ManagerCopyTradingPage,
  ManagerAlgoStrategiesPage,
  ManagerEaStrategiesPage,
  SuperAdminDashboard,
  SupportTeamDashboard,
  SupportTeamTickets,
  SupportComplaintsPage,
  SupportQueriesPage,
  SupportUserLookup,
  SupportTeamManagers,
  SupportTeamKyc,
  SupportTeamMail,
  SupportTransactionsPage,
  SupportUpcomingTransactionsPage,
  SupportInvestmentsPage,
  SupportPlansPage,
  SupportStakingPlansPage,
  SupportCopyTradingPage,
  SupportAlgoStrategiesPage,
  SupportEaStrategiesPage,
  SupportSubscriptionsPage,
  SupportProfitSharingPage,
  SupportExchangePage,
  PrivacyPolicyPage,
  TermsOfServicePage,
  RiskDisclosurePage,
  CookiePolicyPage,
  AmlPolicyPage,
} from "@/lib/lazy-pages";
import { RouteChunkFallback } from "@/components/routing/RouteChunkFallback";
import { getPostLoginPath } from "@/lib/nav-config";
import { getStaffPortal, getCrossPortalRedirectTarget, getStaffPortalForRole, type StaffPortal } from "@/lib/subdomain";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { isPublicPath, isStaffPortalPublic } from "@/lib/public-routes";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { BareRoute } from "@/components/routing/BareRoute";
import { AdminLegacyRedirect } from "@/components/routing/AdminLegacyRedirect";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NotificationPopProvider } from "@/components/notifications/NotificationPopProvider";
import { ReferralAttributionCapture } from "@/components/referral/ReferralAttributionCapture";
import { MobileAppInstallPrompt } from "@/components/pwa/MobileAppInstallPrompt";
import { MaintenanceModeGuard } from "@/components/routing/MaintenanceModeGuard";
import { ScreenshotProtection } from "@/components/security/ScreenshotProtection";
import { DEFAULT_STALE_MS, isRateLimitedError } from "@/lib/query-config";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DEFAULT_STALE_MS,
      refetchOnWindowFocus: false,
      refetchIntervalInBackground: false,
      retry: (failureCount, error: unknown) => {
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403 || status === 429) return false;
        if (isRateLimitedError(error)) return false;
        return failureCount < 1;
      },
    },
  },
});

const portal: StaffPortal = getStaffPortal();

function useInvestorAccountRouteElements(
  Wrap: React.ComponentType<{ component: React.ComponentType<any> }>,
  PromoterWrap?: React.ComponentType<{ component: React.ComponentType<any> }>,
) {
  const [elements, setElements] = useState<ReactElement[] | null>(null);

  useEffect(() => {
    let active = true;
    void import("@/routes/investor-routes").then(({ InvestorAccountRoutes }) => {
      if (!active) return;
      setElements(
        InvestorAccountRoutes({
          Wrap,
          PromoterWrap: PromoterWrap ?? Wrap,
        }),
      );
    });
    return () => {
      active = false;
    };
  }, [Wrap, PromoterWrap]);

  return elements;
}

function ProtectedRoute({ component: Component, managerOnly = false, superAdminOnly = false, supportOnly = false, promoterOnly = false, ...rest }: any) {
  const { user, isRestoring } = useAuth();
  if (isRestoring) return null;
  if (!user) {
    const loginPath = superAdminOnly || managerOnly || supportOnly ? "/staff-login" : "/login";
    return <Redirect to={loginPath} />;
  }

  const role = user.role as string;
  const home = getPostLoginPath(role);
  if (superAdminOnly && role !== "superadmin" && role !== "admin") return <Redirect to={home} />;
  if (supportOnly && role !== "support" && role !== "superadmin" && role !== "admin") return <Redirect to={home} />;
  if (promoterOnly && !(user as any).isPromoter && role !== "superadmin") return <Redirect to={home} />;
  if (managerOnly && role !== "manager" && role !== "support" && role !== "superadmin" && role !== "admin") {
    return <Redirect to={home} />;
  }
  return <Component {...rest} />;
}

function PromoterRouteInner({ component: Component, ...rest }: any) {
  const { user, isRestoring } = useAuth();
  if (isRestoring) return null;
  if (!user) return <Redirect to="/login" />;
  if (!(user as any).isPromoter && (user.role as string) !== "superadmin") {
    return <Redirect to={getPostLoginPath(user.role as string)} />;
  }
  return <Component {...rest} />;
}

function PromoterRoute({ component: Component, ...rest }: any) {
  return <PromoterRouteInner component={Component} {...rest} />;
}

function AuthRoute({ component: Component, ...rest }: any) {
  const { user, isRestoring } = useAuth();
  if (isRestoring) return null;
  if (!user) return <Redirect to="/login" />;
  return <Component {...rest} />;
}

function StaffPortalGuard({ role }: { role: "manager" | "support" | "superadmin" }) {
  const { user, isRestoring } = useAuth();
  if (isRestoring) return null;

  if (!user) return <StaffLoginPage />;

  const userRole = user.role as string;

  const crossPortal = getCrossPortalRedirectTarget(userRole);
  if (crossPortal && getStaffPortalForRole(userRole) !== role) {
    window.location.replace(crossPortal);
    return null;
  }

  if (role === "superadmin" && (userRole === "superadmin" || userRole === "admin")) {
    return <Redirect to="/super-admin" />;
  }
  if (role === "manager" && (userRole === "manager" || userRole === "superadmin")) {
    return <Redirect to={userRole === "manager" ? "/manager" : "/super-admin"} />;
  }
  if (role === "support" && userRole === "support") return <Redirect to="/support-team" />;
  if (role === "support" && (userRole === "manager" || userRole === "superadmin" || userRole === "admin")) {
    return <Redirect to={getPostLoginPath(userRole)} />;
  }

  return <StaffLoginPage />;
}

function managerRouteElements() {
  return [
    <Route key="manager-clients-id" path="/manager/clients/:id">
      <ProtectedRoute component={ManagerClientDetail} managerOnly />
    </Route>,
    <Route key="manager-clients" path="/manager/clients">
      <ProtectedRoute component={ManagerClients} managerOnly />
    </Route>,
    <Route key="manager-kyc" path="/manager/kyc">
      <ProtectedRoute component={ManagerKyc} managerOnly />
    </Route>,
    <Route key="manager-upcoming" path="/manager/upcoming-transactions">
      <ProtectedRoute component={ManagerUpcomingTransactions} managerOnly />
    </Route>,
    <Route key="manager-transactions" path="/manager/transactions">
      <ProtectedRoute component={ManagerTransactions} managerOnly />
    </Route>,
    <Route key="manager-tickets" path="/manager/tickets">
      <ProtectedRoute component={ManagerTickets} managerOnly />
    </Route>,
    <Route key="manager-mail" path="/manager/mail">
      <ProtectedRoute component={ManagerMail} managerOnly />
    </Route>,
    <Route key="manager-plans" path="/manager/plans">
      <ProtectedRoute component={ManagerPlansPage} managerOnly />
    </Route>,
    <Route key="manager-staking-plans" path="/manager/staking-plans">
      <ProtectedRoute component={ManagerStakingPlansPage} managerOnly />
    </Route>,
    <Route key="manager-copy-trading" path="/manager/copy-trading">
      <ProtectedRoute component={ManagerCopyTradingPage} managerOnly />
    </Route>,
    <Route key="manager-algo-strategies" path="/manager/algo-strategies">
      <ProtectedRoute component={ManagerAlgoStrategiesPage} managerOnly />
    </Route>,
    <Route key="manager-ea-strategies" path="/manager/ea-strategies">
      <ProtectedRoute component={ManagerEaStrategiesPage} managerOnly />
    </Route>,
    <Route key="manager" path="/manager">
      <ProtectedRoute component={ManagerDashboard} managerOnly />
    </Route>,
  ];
}

function supportRouteElements() {
  return [
    <Route key="support-complaints" path="/support-team/complaints">
      <ProtectedRoute component={SupportComplaintsPage} supportOnly />
    </Route>,
    <Route key="support-queries" path="/support-team/queries">
      <ProtectedRoute component={SupportQueriesPage} supportOnly />
    </Route>,
    <Route key="support-tickets" path="/support-team/tickets">
      <ProtectedRoute component={SupportTeamTickets} supportOnly />
    </Route>,
    <Route key="support-mail" path="/support-team/mail">
      <ProtectedRoute component={SupportTeamMail} supportOnly />
    </Route>,
    <Route key="support-users" path="/support-team/users">
      <ProtectedRoute component={SupportUserLookup} supportOnly />
    </Route>,
    <Route key="support-managers" path="/support-team/managers">
      <ProtectedRoute component={SupportTeamManagers} supportOnly />
    </Route>,
    <Route key="support-kyc" path="/support-team/kyc">
      <ProtectedRoute component={SupportTeamKyc} supportOnly />
    </Route>,
    <Route key="support-upcoming" path="/support-team/upcoming-transactions">
      <ProtectedRoute component={SupportUpcomingTransactionsPage} supportOnly />
    </Route>,
    <Route key="support-transactions" path="/support-team/transactions">
      <ProtectedRoute component={SupportTransactionsPage} supportOnly />
    </Route>,
    <Route key="support-investments" path="/support-team/investments">
      <ProtectedRoute component={SupportInvestmentsPage} supportOnly />
    </Route>,
    <Route key="support-plans" path="/support-team/plans">
      <ProtectedRoute component={SupportPlansPage} supportOnly />
    </Route>,
    <Route key="support-staking-plans" path="/support-team/staking-plans">
      <ProtectedRoute component={SupportStakingPlansPage} supportOnly />
    </Route>,
    <Route key="support-copy-trading" path="/support-team/copy-trading">
      <ProtectedRoute component={SupportCopyTradingPage} supportOnly />
    </Route>,
    <Route key="support-algo-strategies" path="/support-team/algo-strategies">
      <ProtectedRoute component={SupportAlgoStrategiesPage} supportOnly />
    </Route>,
    <Route key="support-ea-strategies" path="/support-team/ea-strategies">
      <ProtectedRoute component={SupportEaStrategiesPage} supportOnly />
    </Route>,
    <Route key="support-subscriptions" path="/support-team/subscriptions">
      <ProtectedRoute component={SupportSubscriptionsPage} supportOnly />
    </Route>,
    <Route key="support-profit-sharing" path="/support-team/profit-sharing">
      <ProtectedRoute component={SupportProfitSharingPage} supportOnly />
    </Route>,
    <Route key="support-exchange" path="/support-team/exchange">
      <ProtectedRoute component={SupportExchangePage} supportOnly />
    </Route>,
    <Route key="support-team" path="/support-team">
      <ProtectedRoute component={SupportTeamDashboard} supportOnly />
    </Route>,
  ];
}

function superAdminRouteElements() {
  return [
    <Route key="super-admin-tab" path="/super-admin/:tab">
      <ProtectedRoute component={SuperAdminDashboard} superAdminOnly />
    </Route>,
    <Route key="super-admin" path="/super-admin">
      <ProtectedRoute component={SuperAdminDashboard} superAdminOnly />
    </Route>,
  ];
}

function adminLegacyRouteElements() {
  return [
    <Route key="admin-legacy" path="/admin/:rest*">
      <AdminLegacyRedirect />
    </Route>,
    <Route key="admin-root" path="/admin">
      <AdminLegacyRedirect />
    </Route>,
  ];
}

function AuthenticatedRoutes() {
  const investorRoutes = useInvestorAccountRouteElements(AuthRoute, PromoterRoute);

  if (!investorRoutes) {
    return <RouteChunkFallback />;
  }

  return (
    <Switch>
      {investorRoutes}
      {managerRouteElements()}
      {supportRouteElements()}
      {superAdminRouteElements()}
      {adminLegacyRouteElements()}
      <Route path="/:rest*"><NotFound /></Route>
    </Switch>
  );
}

function StaffPortalAuthenticatedRoutes({ includeSuperAdmin = false }: { includeSuperAdmin?: boolean }) {
  const investorRoutes = useInvestorAccountRouteElements(BareRoute, PromoterRoute);

  if (!investorRoutes) {
    return <RouteChunkFallback />;
  }

  return (
    <Switch>
      {includeSuperAdmin && superAdminRouteElements()}
      {adminLegacyRouteElements()}
      {managerRouteElements()}
      {supportRouteElements()}
      {investorRoutes}
      <Route path="/:rest*"><NotFound /></Route>
    </Switch>
  );
}

function SuperAdminPortalRouter() {
  const [location] = useLocation();
  if (isStaffPortalPublic(location)) {
    return (
      <Switch>
        <Route path="/login" component={StaffLoginPage} />
        <Route path="/staff-login" component={StaffLoginPage} />
        <Route path="/">{() => <StaffPortalGuard role="superadmin" />}</Route>
        <Route path="/:rest*"><NotFound /></Route>
      </Switch>
    );
  }
  return (
    <DashboardShell>
      <StaffPortalAuthenticatedRoutes includeSuperAdmin />
    </DashboardShell>
  );
}

function ManagerPortalRouter() {
  const [location] = useLocation();
  if (isStaffPortalPublic(location)) {
    return (
      <Switch>
        <Route path="/login" component={StaffLoginPage} />
        <Route path="/staff-login" component={StaffLoginPage} />
        <Route path="/">{() => <StaffPortalGuard role="manager" />}</Route>
        <Route path="/:rest*"><NotFound /></Route>
      </Switch>
    );
  }
  return (
    <DashboardShell>
      <StaffPortalAuthenticatedRoutes includeSuperAdmin />
    </DashboardShell>
  );
}

function SupportPortalRouter() {
  const [location] = useLocation();
  if (isStaffPortalPublic(location)) {
    return (
      <Switch>
        <Route path="/login" component={StaffLoginPage} />
        <Route path="/staff-login" component={StaffLoginPage} />
        <Route path="/">{() => <StaffPortalGuard role="support" />}</Route>
        <Route path="/:rest*"><NotFound /></Route>
      </Switch>
    );
  }
  return (
    <DashboardShell>
      <StaffPortalAuthenticatedRoutes includeSuperAdmin />
    </DashboardShell>
  );
}

function MainRouter() {
  const [location] = useLocation();

  if (isPublicPath(location)) {
    return (
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/staff-login" component={StaffLoginPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/register/manager" component={RegisterManagerPage} />
        <Route path="/privacy-policy" component={PrivacyPolicyPage} />
        <Route path="/terms-of-service" component={TermsOfServicePage} />
        <Route path="/risk-disclosure" component={RiskDisclosurePage} />
        <Route path="/cookie-policy" component={CookiePolicyPage} />
        <Route path="/aml-policy" component={AmlPolicyPage} />
        <Route path="/:rest*"><NotFound /></Route>
      </Switch>
    );
  }

  return (
    <DashboardShell>
      <AuthenticatedRoutes />
    </DashboardShell>
  );
}

function ActiveRouter() {
  if (portal === "admin") return <SuperAdminPortalRouter />;
  if (portal === "manager") return <ManagerPortalRouter />;
  if (portal === "support") return <SupportPortalRouter />;
  return <MainRouter />;
}

function App() {
  const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
  const appTree = (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ScreenshotProtection />
          <NotificationPopProvider>
            <MobileAppInstallPrompt />
            <MaintenanceModeGuard>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <ReferralAttributionCapture />
              <ErrorBoundary>
                <Suspense fallback={<RouteChunkFallback />}>
                  <ActiveRouter />
                </Suspense>
              </ErrorBoundary>
            </WouterRouter>
            </MaintenanceModeGuard>
          </NotificationPopProvider>
        </AuthProvider>
        <Toaster />
        <SonnerToaster />
      </TooltipProvider>
    </QueryClientProvider>
  );

  if (!envClientId) return appTree;
  return (
    <GoogleOAuthProvider clientId={envClientId}>{appTree}</GoogleOAuthProvider>
  );
}

export default App;
