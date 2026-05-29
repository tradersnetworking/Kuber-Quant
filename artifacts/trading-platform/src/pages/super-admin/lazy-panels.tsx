import { lazy, Suspense, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function lazyNamed<T extends Record<string, unknown>, K extends keyof T>(
  loader: () => Promise<T>,
  name: K,
) {
  return lazy(() => loader().then(m => ({ default: m[name] as React.ComponentType<Record<string, unknown>> })));
}

export const InvestmentPlansPanel = lazyNamed(() => import("@/components/super-admin/InvestmentPlansPanel"), "InvestmentPlansPanel");
export const EAStrategiesPanel = lazyNamed(() => import("@/components/super-admin/EAStrategiesPanel"), "EAStrategiesPanel");
export const CopyTradersPanel = lazyNamed(() => import("@/components/super-admin/CopyTradersPanel"), "CopyTradersPanel");
export const WalletOperationsPanel = lazyNamed(() => import("@/components/super-admin/WalletOperationsPanel"), "WalletOperationsPanel");
export const UsersManagementPanel = lazyNamed(() => import("@/components/super-admin/UsersManagementPanel"), "UsersManagementPanel");
export const ManagersManagementPanel = lazyNamed(() => import("@/components/super-admin/ManagersManagementPanel"), "ManagersManagementPanel");
export const SupportTeamManagementPanel = lazyNamed(() => import("@/components/super-admin/SupportTeamManagementPanel"), "SupportTeamManagementPanel");
export const ManagerApplicationsPanel = lazyNamed(() => import("@/components/super-admin/ManagerApplicationsPanel"), "ManagerApplicationsPanel");
export const KycManagementPanel = lazyNamed(() => import("@/components/super-admin/KycManagementPanel"), "KycManagementPanel");
export const PaymentGatewaysPanel = lazyNamed(() => import("@/components/super-admin/PaymentGatewaysPanel"), "PaymentGatewaysPanel");
export const SupportTicketsPanel = lazyNamed(() => import("@/components/super-admin/SupportTicketsPanel"), "SupportTicketsPanel");
export const SiteSettingsPanel = lazyNamed(() => import("@/components/super-admin/SiteSettingsPanel"), "SiteSettingsPanel");
export const HomepageContentPanel = lazyNamed(() => import("@/components/super-admin/HomepageContentPanel"), "HomepageContentPanel");
export const PlatformInvestmentsPanel = lazyNamed(() => import("@/components/super-admin/PlatformInvestmentsPanel"), "PlatformInvestmentsPanel");
export const FinanceLedgerPanel = lazyNamed(() => import("@/components/super-admin/FinanceLedgerPanel"), "FinanceLedgerPanel");
export const ExchangeControlPanel = lazyNamed(() => import("@/components/super-admin/ExchangeControlPanel"), "ExchangeControlPanel");
export const NotificationManagementPanel = lazyNamed(() => import("@/components/super-admin/NotificationManagementPanel"), "NotificationManagementPanel");
export const PlatformAlgoTradingPanel = lazyNamed(() => import("@/components/super-admin/PlatformAlgoTradingPanel"), "PlatformAlgoTradingPanel");
export const PlatformReferralsPanel = lazyNamed(() => import("@/components/super-admin/PlatformReferralsPanel"), "PlatformReferralsPanel");
export const MtLinkedAccountsWorkspacePanel = lazyNamed(() => import("@/components/super-admin/MtLinkedAccountsWorkspacePanel"), "MtLinkedAccountsWorkspacePanel");
export const VpsBridgeSettingsPanel = lazyNamed(() => import("@/components/super-admin/VpsBridgeSettingsPanel"), "VpsBridgeSettingsPanel");
export const MarketDataSettingsPanel = lazyNamed(() => import("@/components/super-admin/MarketDataSettingsPanel"), "MarketDataSettingsPanel");
export const CommunicationSettingsPanel = lazyNamed(() => import("@/components/super-admin/CommunicationSettingsPanel"), "CommunicationSettingsPanel");
export const LegalAgreementsPanel = lazyNamed(() => import("@/components/super-admin/LegalAgreementsPanel"), "LegalAgreementsPanel");
export const WindowsServerServicesPanel = lazyNamed(() => import("@/components/super-admin/WindowsServerServicesPanel"), "WindowsServerServicesPanel");
export const BackupExportPanel = lazyNamed(() => import("@/components/super-admin/BackupExportPanel"), "BackupExportPanel");
export const StakingAdminPanel = lazyNamed(() => import("@/components/super-admin/StakingAdminPanel"), "StakingAdminPanel");

export function LazyTabPanel({ active, children }: { active: boolean; children: ReactNode }) {
  if (!active) return null;
  return (
    <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
      {children}
    </Suspense>
  );
}
