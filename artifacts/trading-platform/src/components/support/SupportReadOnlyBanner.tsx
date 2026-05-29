import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export function SupportReadOnlyBanner({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-amber-500/25 bg-amber-500/5">
      <CardContent className="pt-4 text-sm text-muted-foreground flex items-start gap-2">
        <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p>{children}</p>
      </CardContent>
    </Card>
  );
}
