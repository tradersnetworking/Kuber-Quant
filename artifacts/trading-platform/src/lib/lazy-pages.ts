import { lazy } from "react";

export const LoginPage = lazy(() => import("@/pages/auth/login"));
export const RegisterPage = lazy(() => import("@/pages/auth/register"));
export const RegisterManagerPage = lazy(() => import("@/pages/auth/register-manager"));
export const StaffLoginPage = lazy(() => import("@/pages/auth/staff-login"));
export const ForgotPasswordPage = lazy(() => import("@/pages/auth/forgot-password"));

export const ManagerDashboard = lazy(() => import("@/pages/manager/index"));
export const ManagerClients = lazy(() => import("@/pages/manager/clients"));
export const ManagerClientDetail = lazy(() => import("@/pages/manager/client-detail"));
export const ManagerKyc = lazy(() => import("@/pages/manager/kyc"));
export const ManagerTransactions = lazy(() => import("@/pages/manager/transactions"));
export const ManagerUpcomingTransactions = lazy(() => import("@/pages/manager/upcoming-transactions"));
export const ManagerTickets = lazy(() => import("@/pages/manager/tickets"));
export const ManagerMail = lazy(() => import("@/pages/manager/mail"));
export const ManagerPlansPage = lazy(() => import("@/pages/manager/plans"));
export const ManagerStakingPlansPage = lazy(() => import("@/pages/manager/staking-plans"));
export const ManagerCopyTradingPage = lazy(() => import("@/pages/manager/copy-trading"));
export const ManagerAlgoStrategiesPage = lazy(() => import("@/pages/manager/algo-strategies"));
export const ManagerEaStrategiesPage = lazy(() => import("@/pages/manager/ea-strategies"));

export const SuperAdminDashboard = lazy(() => import("@/pages/super-admin/index"));
export const SupportTeamDashboard = lazy(() => import("@/pages/support-team/index"));
export const SupportTeamTickets = lazy(() => import("@/pages/support-team/tickets"));
export const SupportComplaintsPage = lazy(() => import("@/pages/support-team/complaints"));
export const SupportQueriesPage = lazy(() => import("@/pages/support-team/queries"));
export const SupportUserLookup = lazy(() => import("@/pages/support-team/users"));
export const SupportTeamManagers = lazy(() => import("@/pages/support-team/managers"));
export const SupportTeamKyc = lazy(() => import("@/pages/support-team/kyc"));
export const SupportTeamMail = lazy(() => import("@/pages/support-team/mail"));
export const SupportTransactionsPage = lazy(() => import("@/pages/support-team/transactions"));
export const SupportUpcomingTransactionsPage = lazy(() => import("@/pages/support-team/upcoming-transactions"));
export const SupportInvestmentsPage = lazy(() => import("@/pages/support-team/investments"));
export const SupportPlansPage = lazy(() => import("@/pages/support-team/plans"));
export const SupportStakingPlansPage = lazy(() => import("@/pages/support-team/staking-plans"));
export const SupportCopyTradingPage = lazy(() => import("@/pages/support-team/copy-trading"));
export const SupportAlgoStrategiesPage = lazy(() => import("@/pages/support-team/algo-strategies"));
export const SupportEaStrategiesPage = lazy(() => import("@/pages/support-team/ea-strategies"));
export const SupportSubscriptionsPage = lazy(() => import("@/pages/support-team/subscriptions"));
export const SupportProfitSharingPage = lazy(() => import("@/pages/support-team/profit-sharing"));
export const SupportExchangePage = lazy(() => import("@/pages/support-team/exchange"));

export const PrivacyPolicyPage = lazy(() => import("@/pages/legal/privacy-policy"));
export const TermsOfServicePage = lazy(() => import("@/pages/legal/terms-of-service"));
export const RiskDisclosurePage = lazy(() => import("@/pages/legal/risk-disclosure"));
export const CookiePolicyPage = lazy(() => import("@/pages/legal/cookie-policy"));
export const AmlPolicyPage = lazy(() => import("@/pages/legal/aml-policy"));
