import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import { getPostLoginPath } from "@/lib/nav-config";
import { InvestorAccountRoutes } from "@/routes/investor-routes";
import { getStaffPortal, getCrossPortalRedirectTarget, getStaffPortalForRole, type StaffPortal } from "@/lib/subdomain";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { isPublicPath, isStaffPortalPublic } from "@/lib/public-routes";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { BareRoute } from "@/components/routing/BareRoute";
import { AdminLegacyRedirect } from "@/components/routing/AdminLegacyRedirect";

import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/auth/login";
import RegisterPage from "@/pages/auth/register";
import RegisterManagerPage from "@/pages/auth/register-manager";
import StaffLoginPage from "@/pages/auth/staff-login";
import ForgotPasswordPage from "@/pages/auth/forgot-password";

import ManagerDashboard from "@/pages/manager/index";
import ManagerClients from "@/pages/manager/clients";
import ManagerClientDetail from "@/pages/manager/client-detail";
import ManagerKyc from "@/pages/manager/kyc";
import ManagerTransactions from "@/pages/manager/transactions";
import ManagerUpcomingTransactions from "@/pages/manager/upcoming-transactions";
import ManagerTickets from "@/pages/manager/tickets";
import ManagerMail from "@/pages/manager/mail";
import ManagerPlansPage from "@/pages/manager/plans";
import ManagerStakingPlansPage from "@/pages/manager/staking-plans";
import ManagerCopyTradingPage from "@/pages/manager/copy-trading";
import ManagerAlgoStrategiesPage from "@/pages/manager/algo-strategies";
import ManagerEaStrategiesPage from "@/pages/manager/ea-strategies";

import SuperAdminDashboard from "@/pages/super-admin/index";
import SupportTeamDashboard from "@/pages/support-team/index";
import SupportTeamTickets from "@/pages/support-team/tickets";
import SupportComplaintsPage from "@/pages/support-team/complaints";
import SupportQueriesPage from "@/pages/support-team/queries";
import SupportUserLookup from "@/pages/support-team/users";
import SupportTeamManagers from "@/pages/support-team/managers";
import SupportTeamKyc from "@/pages/support-team/kyc";
import SupportTeamMail from "@/pages/support-team/mail";
import SupportTransactionsPage from "@/pages/support-team/transactions";
import SupportUpcomingTransactionsPage from "@/pages/support-team/upcoming-transactions";
import SupportInvestmentsPage from "@/pages/support-team/investments";
import SupportPlansPage from "@/pages/support-team/plans";
import SupportStakingPlansPage from "@/pages/support-team/staking-plans";
import SupportCopyTradingPage from "@/pages/support-team/copy-trading";
import SupportAlgoStrategiesPage from "@/pages/support-team/algo-strategies";
import SupportEaStrategiesPage from "@/pages/support-team/ea-strategies";
import SupportSubscriptionsPage from "@/pages/support-team/subscriptions";
import SupportProfitSharingPage from "@/pages/support-team/profit-sharing";
import SupportExchangePage from "@/pages/support-team/exchange";

import PrivacyPolicyPage from "@/pages/legal/privacy-policy";
import TermsOfServicePage from "@/pages/legal/terms-of-service";
import RiskDisclosurePage from "@/pages/legal/risk-disclosure";
import CookiePolicyPage from "@/pages/legal/cookie-policy";
import AmlPolicyPage from "@/pages/legal/aml-policy";

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

function ProtectedRoute({ component: Component, managerOnly = false, superAdminOnly = false, supportOnly = false, promoterOnly = false, ...rest }: any) {
  const { user } = useAuth();
  if (!user) {
    const loginPath = superAdminOnly || managerOnly || supportOnly ? "/staff-login" : "/login";
    return <Redirect to={loginPath} />;
  }

  const role = user.role as string;
  const home = getPostLoginPath(role);
  if (superAdminOnly && role !== "superadmin" && role !== "admin") return <Redirect to={home} />;
  if (supportOnly && role !== "support" && role !== "superadmin") return <Redirect to={home} />;
  if (promoterOnly && !(user as any).isPromoter && role !== "superadmin") return <Redirect to={home} />;
  if (managerOnly && role !== "manager" && role !== "support" && role !== "superadmin") {
    return <Redirect to={home} />;
  }
  return <Component {...rest} />;
}

function PromoterRouteInner({ component: Component, ...rest }: any) {
  const { user } = useAuth();
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
  const { user } = useAuth();
  if (!user) return <Redirect to="/login" />;
  return <Component {...rest} />;
}

function StaffPortalGuard({ role }: { role: "manager" | "support" | "superadmin" }) {
  const { user } = useAuth();

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
  return (
    <Switch>
      {InvestorAccountRoutes({ Wrap: AuthRoute, PromoterWrap: PromoterRoute })}
      {managerRouteElements()}
      {supportRouteElements()}
      {superAdminRouteElements()}
      {adminLegacyRouteElements()}
      <Route path="/:rest*"><NotFound /></Route>
    </Switch>
  );
}

function StaffPortalAuthenticatedRoutes({ includeSuperAdmin = false }: { includeSuperAdmin?: boolean }) {
  return (
    <Switch>
      {includeSuperAdmin && superAdminRouteElements()}
      {adminLegacyRouteElements()}
      {managerRouteElements()}
      {supportRouteElements()}
      {InvestorAccountRoutes({ Wrap: BareRoute, PromoterWrap: PromoterRoute })}
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
  const googleClientId = envClientId || "000000000000-placeholder.apps.googleusercontent.com";
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
                <ActiveRouter />
              </ErrorBoundary>
            </WouterRouter>
            </MaintenanceModeGuard>
          </NotificationPopProvider>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );

  return (
    <GoogleOAuthProvider clientId={googleClientId}>{appTree}</GoogleOAuthProvider>
  );
}

export default App;
