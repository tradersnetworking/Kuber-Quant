import { SiteSettingsContent } from "@/pages/admin/settings/index";
import { MaintenanceModePanel } from "@/components/super-admin/MaintenanceModePanel";
import { ScreenshotProtectionPanel } from "@/components/super-admin/ScreenshotProtectionPanel";
import { STAFF_HEADER_ROW, STAFF_PAGE_STACK } from "@/lib/staff-dashboard-ui";

export function SiteSettingsPanel() {
  return (
    <div className={STAFF_PAGE_STACK}>
      <div className={STAFF_HEADER_ROW}>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">System settings</h2>
          <p className="text-sm text-muted-foreground">Maintenance mode, security, and platform configuration.</p>
        </div>
      </div>
      <MaintenanceModePanel />
      <ScreenshotProtectionPanel />
      <SiteSettingsContent />
    </div>
  );
}
