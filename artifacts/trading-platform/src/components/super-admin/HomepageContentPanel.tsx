import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Award, Home } from "lucide-react";
import { PartnersManagementPanel } from "@/components/super-admin/PartnersManagementPanel";
import { AboutCompanyPanel } from "@/components/super-admin/AboutCompanyPanel";

export function HomepageContentPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Home className="h-5 w-5 text-amber-400" />
          Homepage Content
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage what visitors see on the public home page — institutional partners and company credentials.
        </p>
      </div>

      <Tabs defaultValue="partners" className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="partners" className="gap-2">
            <Building2 className="h-4 w-4" />
            Partners & Brokers
          </TabsTrigger>
          <TabsTrigger value="about" className="gap-2">
            <Award className="h-4 w-4" />
            About Kuber Quant
          </TabsTrigger>
        </TabsList>

        <TabsContent value="partners" className="mt-0">
          <PartnersManagementPanel />
        </TabsContent>

        <TabsContent value="about" className="mt-0">
          <AboutCompanyPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
