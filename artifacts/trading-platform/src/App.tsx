import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import { getPostLoginPath, resolveRouteRedirect } from "@/lib/nav-config";
import { InvestorAccountRoutes } from "@/routes/investor-routes";
import { getStaffPortal, type StaffPortal } from "@/lib/subdomain";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { isPublicPath, isStaffPortalPublic } from "@/lib/public-routes";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { BareRoute } from "@/components/routing/BareRoute";

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
import ManagerTickets from "@/pages/manager/tickets";

import AdminDashboardPage from "@/pages/admin/dashboard";
import AdminUsersPage from "@/pages/admin/users/index";
import AdminUserDetail from "@/pages/admin/users/detail";
import AdminTransactionsPage from "@/pages/admin/transactions/index";
import AdminKycPage from "@/pages/admin/kyc/index";
import AdminPlansPage from "@/pages/admin/plans/index";
import AdminReferralsPage from "@/pages/admin/referrals/index";
import AdminTicketsPage from "@/pages/admin/tickets/index";
import AdminManagersPage from "@/pages/admin/managers/index";
import AdminPaymentGatewaysPage from "@/pages/admin/payment-gateways/index";
import AdminSettingsPage from "@/pages/admin/settings/index";
import SuperAdminDashboard from "@/pages/super-admin/index";
import SupportTeamDashboard from "@/pages/support-team/index";
import SupportTeamTickets from "@/pages/support-team/tickets";
import SupportComplaintsPage from "@/pages/support-team/complaints";
import SupportQueriesPage from "@/pages/support-team/queries";
import SupportUserLookup from "@/pages/support-team/users";
import SupportTeamMail from "@/pages/support-team/mail";
import AdminMailPage from "@/pages/admin/mail";
import AdminNotificationsPage from "@/pages/admin/notifications/index";
import AdminMt5AccountsPage from "@/pages/admin/mt5-accounts/index";

import PrivacyPolicyPage from "@/pages/legal/privacy-policy";
import TermsOfServicePage from "@/pages/legal/terms-of-service";
import RiskDisclosurePage from "@/pages/legal/risk-disclosure";
import CookiePolicyPage from "@/pages/legal/cookie-policy";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NotificationPopProvider } from "@/components/notifications/NotificationPopProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

const portal: StaffPortal = getStaffPortal();

function ProtectedRoute({ component: Component, adminOnly = false, managerOnly = false, superAdminOnly = false, supportOnly = false, promoterOnly = false, ...rest }: any) {
  const { user } = useAuth();
  if (!user) return <Redirect to="/login" />;

  const home = getPostLoginPath(user.role as string);
  if (superAdminOnly && (user.role as string) !== "superadmin") return <Redirect to={home} />;
  if (adminOnly && user.role !== "admin" && (user.role as string) !== "superadmin") return <Redirect to={home} />;
  if (supportOnly && (user.role as string) !== "support" && user.role !== "admin" && (user.role as string) !== "superadmin") return <Redirect to={home} />;
  if (promoterOnly && !(user as any).isPromoter && (user.role as string) !== "superadmin") return <Redirect to={home} />;
  if (managerOnly && (user.role as string) !== "manager" && user.role !== "admin" && (user.role as string) !== "support" && (user.role as string) !== "superadmin") {
    return <Redirect to={home} />;
  }
  return <Component {...rest} />;
}

function AdminRouteInner({ component: Component, ...rest }: any) {
  const { user } = useAuth();
  const [location] = useLocation();
  if (!user) return <Redirect to="/login" />;

  const home = getPostLoginPath(user.role as string);
  if ((user.role as string) === "superadmin") {
    const target = resolveRouteRedirect("superadmin", location) || "/super-admin";
    return <Redirect to={target} />;
  }
  if (user.role !== "admin") return <Redirect to={home} />;
  return <Component {...rest} />;
}

function AdminRoute({ component: Component, ...rest }: any) {
  return <AdminRouteInner component={Component} {...rest} />;
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

function StaffPortalGuard({ role }: { role: "admin" | "manager" | "support" | "superadmin" }) {
  const { user } = useAuth();

  if (!user) return <StaffLoginPage />;

  if (role === "superadmin" && (user.role as string) === "superadmin") return <Redirect to="/super-admin" />;
  if (role === "admin" && (user.role as string) === "superadmin") return <Redirect to="/super-admin" />;
  if (role === "admin" && user.role === "admin") return <Redirect to="/admin" />;
  if (role === "manager" && ((user.role as string) === "manager" || user.role === "admin" || (user.role as string) === "superadmin")) {
    return <Redirect to="/manager" />;
  }
  if (role === "support" && (user.role as string) === "support") return <Redirect to="/support-team" />;
  if (role === "support" && ((user.role as string) === "manager" || user.role === "admin" || (user.role as string) === "superadmin")) {
    return <Redirect to={(user.role as string) === "support" ? "/support-team" : getPostLoginPath(user.role as string)} />;
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
    <Route key="manager-transactions" path="/manager/transactions">
      <ProtectedRoute component={ManagerTransactions} managerOnly />
    </Route>,
    <Route key="manager-tickets" path="/manager/tickets">
      <ProtectedRoute component={ManagerTickets} managerOnly />
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

function adminRouteElements() {
  return [
    <Route key="admin-users-id" path="/admin/users/:id">
      <AdminRoute component={AdminUserDetail} adminPath="/admin/users/:id" />
    </Route>,
    <Route key="admin-users" path="/admin/users">
      <AdminRoute component={AdminUsersPage} adminPath="/admin/users" />
    </Route>,
    <Route key="admin-transactions" path="/admin/transactions">
      <AdminRoute component={AdminTransactionsPage} adminPath="/admin/transactions" />
    </Route>,
    <Route key="admin-kyc" path="/admin/kyc">
      <AdminRoute component={AdminKycPage} adminPath="/admin/kyc" />
    </Route>,
    <Route key="admin-plans" path="/admin/plans">
      <AdminRoute component={AdminPlansPage} adminPath="/admin/plans" />
    </Route>,
    <Route key="admin-referrals" path="/admin/referrals">
      <AdminRoute component={AdminReferralsPage} adminPath="/admin/referrals" />
    </Route>,
    <Route key="admin-tickets" path="/admin/tickets">
      <AdminRoute component={AdminTicketsPage} adminPath="/admin/tickets" />
    </Route>,
    <Route key="admin-managers" path="/admin/managers">
      <AdminRoute component={AdminManagersPage} adminPath="/admin/managers" />
    </Route>,
    <Route key="admin-payment-gateways" path="/admin/payment-gateways">
      <AdminRoute component={AdminPaymentGatewaysPage} adminPath="/admin/payment-gateways" />
    </Route>,
    <Route key="admin-mail" path="/admin/mail">
      <AdminRoute component={AdminMailPage} adminPath="/admin/mail" />
    </Route>,
    <Route key="admin-notifications" path="/admin/notifications">
      <AdminRoute component={AdminNotificationsPage} adminPath="/admin/notifications" />
    </Route>,
    <Route key="admin-mt5-accounts" path="/admin/mt5-accounts">
      <AdminRoute component={AdminMt5AccountsPage} adminPath="/admin/mt5-accounts" />
    </Route>,
    <Route key="admin-settings" path="/admin/settings">
      <AdminRoute component={AdminSettingsPage} adminPath="/admin/settings" />
    </Route>,
    <Route key="admin" path="/admin">
      <AdminRoute component={AdminDashboardPage} adminPath="/admin" />
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
      {adminRouteElements()}
      <Route path="/:rest*"><NotFound /></Route>
    </Switch>
  );
}

function StaffPortalAuthenticatedRoutes({ includeSuperAdmin = false }: { includeSuperAdmin?: boolean }) {
  return (
    <Switch>
      {includeSuperAdmin && superAdminRouteElements()}
      {adminRouteElements()}
      {managerRouteElements()}
      {supportRouteElements()}
      {InvestorAccountRoutes({ Wrap: BareRoute, PromoterWrap: PromoterRoute })}
      <Route path="/:rest*"><NotFound /></Route>
    </Switch>
  );
}

function AdminPortalRouter() {
  const [location] = useLocation();
  if (isStaffPortalPublic(location)) {
    return (
      <Switch>
        <Route path="/login" component={StaffLoginPage} />
        <Route path="/staff-login" component={StaffLoginPage} />
        <Route path="/">{() => <StaffPortalGuard role="admin" />}</Route>
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
      <Switch>
        {managerRouteElements()}
        {InvestorAccountRoutes({ Wrap: BareRoute, PromoterWrap: PromoterRoute })}
        <Route path="/:rest*"><NotFound /></Route>
      </Switch>
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
      <Switch>
        {supportRouteElements()}
        {InvestorAccountRoutes({ Wrap: BareRoute, PromoterWrap: PromoterRoute })}
        <Route path="/:rest*"><NotFound /></Route>
      </Switch>
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
  if (portal === "admin") return <AdminPortalRouter />;
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
          <NotificationPopProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <ErrorBoundary>
                <ActiveRouter />
              </ErrorBoundary>
            </WouterRouter>
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
