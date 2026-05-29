import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Award, Home, LayoutList } from "lucide-react";
import { PartnersManagementPanel } from "@/components/super-admin/PartnersManagementPanel";
import { AboutCompanyPanel } from "@/components/super-admin/AboutCompanyPanel";
import { ServiceVisibilityPanel } from "@/components/super-admin/ServiceVisibilityPanel";
import { STAFF_HEADER_ROW, STAFF_PAGE_STACK } from "@/lib/staff-dashboard-ui";

export function HomepageContentPanel() {
  return (
    <div className={STAFF_PAGE_STACK}>
      <div className={STAFF_HEADER_ROW}>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Home className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            Homepage Content
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage what visitors see on the public home page — services, institutional partners, and company credentials.
          </p>
        </div>
      </div>

      <Tabs defaultValue="services" className="space-y-4 sm:space-y-6 min-w-0">
        <TabsList className="bg-muted/60 dark:bg-white/5 border border-border dark:border-white/10 flex-wrap h-auto w-full justify-start">
          <TabsTrigger value="services" className="gap-2">
            <LayoutList className="h-4 w-4 shrink-0" />
            Services & Order
          </TabsTrigger>
          <TabsTrigger value="partners" className="gap-2">
            <Building2 className="h-4 w-4 shrink-0" />
            Partners & Brokers
          </TabsTrigger>
          <TabsTrigger value="about" className="gap-2">
            <Award className="h-4 w-4 shrink-0" />
            About Kuber Quant
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-0 min-w-0">
          <ServiceVisibilityPanel />
        </TabsContent>

        <TabsContent value="partners" className="mt-0 min-w-0">
          <PartnersManagementPanel />
        </TabsContent>

        <TabsContent value="about" className="mt-0 min-w-0">
          <AboutCompanyPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
