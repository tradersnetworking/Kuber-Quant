import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import { getStaffPortal, type StaffPortal } from "@/lib/subdomain";
import { GoogleOAuthProvider } from "@react-oauth/google";

import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/auth/login";
import RegisterPage from "@/pages/auth/register";
import StaffLoginPage from "@/pages/auth/staff-login";
import ForgotPasswordPage from "@/pages/auth/forgot-password";
import DashboardPage from "@/pages/dashboard";

import InvestmentsPage from "@/pages/investments/index";
import InvestmentDetail from "@/pages/investments/detail";
import TradesPage from "@/pages/trades/index";
import AlgoTradingPage from "@/pages/algo-trading/index";
import CopyTradingPage from "@/pages/copy-trading/index";
import EAStrategiesPage from "@/pages/ea-strategies/index";
import TransactionsPage from "@/pages/transactions/index";
import SettingsPage from "@/pages/settings/index";

import WalletPage from "@/pages/wallet/index";
import PlansPage from "@/pages/plans/index";
import KycPage from "@/pages/kyc/index";
import ReferralPage from "@/pages/referral/index";
import Mt5Page from "@/pages/mt5/index";
import SupportPage from "@/pages/support/index";
import NotificationsPage from "@/pages/notifications/index";

import ManagerDashboard from "@/pages/manager/index";
import ManagerClients from "@/pages/manager/clients";
import ManagerKyc from "@/pages/manager/kyc";
import ManagerTransactions from "@/pages/manager/transactions";

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

const queryClient = new QueryClient();

const portal: StaffPortal = getStaffPortal();

// ── Protected Route Wrapper ─────────────────────────────────────────────────
function ProtectedRoute({ component: Component, adminOnly = false, managerOnly = false, ...rest }: any) {
  const { user } = useAuth();
  const redirectTo = portal ? "/login" : "/login";

  if (!user) return <Redirect to={redirectTo} />;
  if (adminOnly && user.role !== "admin") return <Redirect to="/dashboard" />;
  if (managerOnly && (user.role as string) !== "manager" && (user.role as string) !== "admin") {
    return <Redirect to="/dashboard" />;
  }
  return <Component {...rest} />;
}

// ── Staff Portal Guard ──────────────────────────────────────────────────────
// On admin/manager/support subdomains, unauthenticated users see staff-login.
// Regular users are rejected. Staff are sent to their dashboard.
function StaffPortalGuard({ role }: { role: "admin" | "manager" | "support" }) {
  const { user } = useAuth();

  if (!user) return <StaffLoginPage />;

  if (role === "admin" && user.role === "admin") return <Redirect to="/admin" />;
  if (role === "manager" && ((user.role as string) === "manager" || (user.role as string) === "admin")) {
    return <Redirect to="/manager" />;
  }
  if (role === "support" && ((user.role as string) === "manager" || (user.role as string) === "admin")) {
    return <Redirect to="/manager/tickets" />;
  }

  // Wrong role — force re-login
  return <StaffLoginPage />;
}

// ── Admin Subdomain Router ──────────────────────────────────────────────────
function AdminPortalRouter() {
  return (
    <Switch>
      <Route path="/login" component={StaffLoginPage} />
      <Route path="/staff-login" component={StaffLoginPage} />
      <Route path="/">
        {() => <StaffPortalGuard role="admin" />}
      </Route>
      <Route path="/admin">
        <ProtectedRoute component={AdminDashboardPage} adminOnly />
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute component={AdminUsersPage} adminOnly />
      </Route>
      <Route path="/admin/users/:id">
        <ProtectedRoute component={AdminUserDetail} adminOnly />
      </Route>
      <Route path="/admin/transactions">
        <ProtectedRoute component={AdminTransactionsPage} adminOnly />
      </Route>
      <Route path="/admin/kyc">
        <ProtectedRoute component={AdminKycPage} adminOnly />
      </Route>
      <Route path="/admin/plans">
        <ProtectedRoute component={AdminPlansPage} adminOnly />
      </Route>
      <Route path="/admin/referrals">
        <ProtectedRoute component={AdminReferralsPage} adminOnly />
      </Route>
      <Route path="/admin/tickets">
        <ProtectedRoute component={AdminTicketsPage} adminOnly />
      </Route>
      <Route path="/admin/managers">
        <ProtectedRoute component={AdminManagersPage} adminOnly />
      </Route>
      <Route path="/admin/payment-gateways">
        <ProtectedRoute component={AdminPaymentGatewaysPage} adminOnly />
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute component={AdminSettingsPage} adminOnly />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

// ── Manager Subdomain Router ────────────────────────────────────────────────
function ManagerPortalRouter() {
  return (
    <Switch>
      <Route path="/login" component={StaffLoginPage} />
      <Route path="/staff-login" component={StaffLoginPage} />
      <Route path="/">
        {() => <StaffPortalGuard role="manager" />}
      </Route>
      <Route path="/manager">
        <ProtectedRoute component={ManagerDashboard} managerOnly />
      </Route>
      <Route path="/manager/clients">
        <ProtectedRoute component={ManagerClients} managerOnly />
      </Route>
      <Route path="/manager/kyc">
        <ProtectedRoute component={ManagerKyc} managerOnly />
      </Route>
      <Route path="/manager/transactions">
        <ProtectedRoute component={ManagerTransactions} managerOnly />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

// ── Support Subdomain Router ────────────────────────────────────────────────
function SupportPortalRouter() {
  return (
    <Switch>
      <Route path="/login" component={StaffLoginPage} />
      <Route path="/staff-login" component={StaffLoginPage} />
      <Route path="/">
        {() => <StaffPortalGuard role="support" />}
      </Route>
      <Route path="/manager">
        <ProtectedRoute component={ManagerDashboard} managerOnly />
      </Route>
      <Route path="/manager/tickets">
        <ProtectedRoute component={ManagerTransactions} managerOnly />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

// ── Main App Router ─────────────────────────────────────────────────────────
function MainRouter() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/staff-login" component={StaffLoginPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/register" component={RegisterPage} />

      <Route path="/dashboard">
        <ProtectedRoute component={DashboardPage} />
      </Route>

      {/* User Routes */}
      <Route path="/wallet">
        <ProtectedRoute component={WalletPage} />
      </Route>
      <Route path="/plans">
        <ProtectedRoute component={PlansPage} />
      </Route>
      <Route path="/kyc">
        <ProtectedRoute component={KycPage} />
      </Route>
      <Route path="/referral">
        <ProtectedRoute component={ReferralPage} />
      </Route>
      <Route path="/mt5-accounts">
        <ProtectedRoute component={Mt5Page} />
      </Route>
      <Route path="/support">
        <ProtectedRoute component={SupportPage} />
      </Route>
      <Route path="/notifications">
        <ProtectedRoute component={NotificationsPage} />
      </Route>
      <Route path="/investments">
        <ProtectedRoute component={InvestmentsPage} />
      </Route>
      <Route path="/investments/:id">
        <ProtectedRoute component={InvestmentDetail} />
      </Route>
      <Route path="/trades">
        <ProtectedRoute component={TradesPage} />
      </Route>
      <Route path="/algo-trading">
        <ProtectedRoute component={AlgoTradingPage} />
      </Route>
      <Route path="/copy-trading">
        <ProtectedRoute component={CopyTradingPage} />
      </Route>
      <Route path="/ea-strategies">
        <ProtectedRoute component={EAStrategiesPage} />
      </Route>
      <Route path="/transactions">
        <ProtectedRoute component={TransactionsPage} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={SettingsPage} />
      </Route>

      {/* Manager Routes */}
      <Route path="/manager">
        <ProtectedRoute component={ManagerDashboard} managerOnly />
      </Route>
      <Route path="/manager/clients">
        <ProtectedRoute component={ManagerClients} managerOnly />
      </Route>
      <Route path="/manager/kyc">
        <ProtectedRoute component={ManagerKyc} managerOnly />
      </Route>
      <Route path="/manager/transactions">
        <ProtectedRoute component={ManagerTransactions} managerOnly />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin">
        <ProtectedRoute component={AdminDashboardPage} adminOnly />
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute component={AdminUsersPage} adminOnly />
      </Route>
      <Route path="/admin/users/:id">
        <ProtectedRoute component={AdminUserDetail} adminOnly />
      </Route>
      <Route path="/admin/transactions">
        <ProtectedRoute component={AdminTransactionsPage} adminOnly />
      </Route>
      <Route path="/admin/kyc">
        <ProtectedRoute component={AdminKycPage} adminOnly />
      </Route>
      <Route path="/admin/plans">
        <ProtectedRoute component={AdminPlansPage} adminOnly />
      </Route>
      <Route path="/admin/referrals">
        <ProtectedRoute component={AdminReferralsPage} adminOnly />
      </Route>
      <Route path="/admin/tickets">
        <ProtectedRoute component={AdminTicketsPage} adminOnly />
      </Route>
      <Route path="/admin/managers">
        <ProtectedRoute component={AdminManagersPage} adminOnly />
      </Route>
      <Route path="/admin/payment-gateways">
        <ProtectedRoute component={AdminPaymentGatewaysPage} adminOnly />
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute component={AdminSettingsPage} adminOnly />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

// ── Root ────────────────────────────────────────────────────────────────────
function ActiveRouter() {
  if (portal === "admin") return <AdminPortalRouter />;
  if (portal === "manager") return <ManagerPortalRouter />;
  if (portal === "support") return <SupportPortalRouter />;
  return <MainRouter />;
}

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <ActiveRouter />
            </WouterRouter>
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
