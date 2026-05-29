import type { ComponentType, ReactElement } from "react";
import { Route } from "wouter";
import EarnHubPage from "@/pages/earn/index";
import StakingPage from "@/pages/earn/staking/index";
import StakeDetailPage from "@/pages/earn/staking/detail";
import DashboardPage from "@/pages/dashboard";
import WalletPage from "@/pages/wallet/index";
import PlansPage from "@/pages/plans/index";
import KycPage from "@/pages/kyc/index";
import ReferralPage from "@/pages/referral/index";
import Mt5Page from "@/pages/mt5/index";
import SupportPage from "@/pages/support/index";
import NotificationsPage from "@/pages/notifications/index";
import InvestmentsPage from "@/pages/investments/index";
import InvestmentDetail from "@/pages/investments/detail";
import TradesPage from "@/pages/trades/index";
import AlgoTradingPage from "@/pages/algo-trading/index";
import CopyTradingPage from "@/pages/copy-trading/index";
import EAStrategiesPage from "@/pages/ea-strategies/index";
import EAStrategyDetailPage from "@/pages/ea-strategies/[id]";
import ExchangePage from "@/pages/exchange/index";
import MoneyHubPage from "@/pages/money/index";
import TransactionsPage from "@/pages/transactions/index";
import SettingsPage from "@/pages/settings/index";
import Mt5RelayPage from "@/pages/mt5-relay/index";
import AgreementsPage from "@/pages/agreements/index";
import PromoterDashboard from "@/pages/promoter/index";

type RouteWrap = ComponentType<{ component: ComponentType<any> }>;

/** Personal investor account routes — must be spread into <Switch>, not used as a wrapper element. */
export function InvestorAccountRoutes({
  Wrap,
  PromoterWrap = Wrap,
}: {
  Wrap: RouteWrap;
  PromoterWrap?: RouteWrap;
}): ReactElement[] {
  return [
    <Route key="/earn" path="/earn"><Wrap component={EarnHubPage} /></Route>,
    <Route key="/earn/staking" path="/earn/staking"><Wrap component={StakingPage} /></Route>,
    <Route key="/earn/staking/:id" path="/earn/staking/:id"><Wrap component={StakeDetailPage} /></Route>,
    <Route key="/dashboard" path="/dashboard"><Wrap component={DashboardPage} /></Route>,
    <Route key="/money" path="/money"><Wrap component={MoneyHubPage} /></Route>,
    <Route key="/wallet" path="/wallet"><Wrap component={WalletPage} /></Route>,
    <Route key="/exchange" path="/exchange"><Wrap component={ExchangePage} /></Route>,
    <Route key="/plans" path="/plans"><Wrap component={PlansPage} /></Route>,
    <Route key="/kyc" path="/kyc"><Wrap component={KycPage} /></Route>,
    <Route key="/referral" path="/referral"><Wrap component={ReferralPage} /></Route>,
    <Route key="/mt5-accounts" path="/mt5-accounts"><Wrap component={Mt5Page} /></Route>,
    <Route key="/support" path="/support"><Wrap component={SupportPage} /></Route>,
    <Route key="/notifications" path="/notifications"><Wrap component={NotificationsPage} /></Route>,
    <Route key="/investments" path="/investments"><Wrap component={InvestmentsPage} /></Route>,
    <Route key="/investments/:id" path="/investments/:id"><Wrap component={InvestmentDetail} /></Route>,
    <Route key="/trades" path="/trades"><Wrap component={TradesPage} /></Route>,
    <Route key="/algo-trading" path="/algo-trading"><Wrap component={AlgoTradingPage} /></Route>,
    <Route key="/copy-trading" path="/copy-trading"><Wrap component={CopyTradingPage} /></Route>,
    <Route key="/ea-strategies" path="/ea-strategies"><Wrap component={EAStrategiesPage} /></Route>,
    <Route key="/ea-strategies/:id" path="/ea-strategies/:id"><Wrap component={EAStrategyDetailPage} /></Route>,
    <Route key="/transactions" path="/transactions"><Wrap component={TransactionsPage} /></Route>,
    <Route key="/settings" path="/settings"><Wrap component={SettingsPage} /></Route>,
    <Route key="/account" path="/account"><Wrap component={SettingsPage} /></Route>,
    <Route key="/mt5-relay" path="/mt5-relay"><Wrap component={Mt5RelayPage} /></Route>,
    <Route key="/agreements" path="/agreements"><Wrap component={AgreementsPage} /></Route>,
    <Route key="/promoter" path="/promoter"><PromoterWrap component={PromoterDashboard} /></Route>,
  ];
}
