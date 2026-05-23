import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings & Profile</h1>
          <p className="text-muted-foreground">Manage your account preferences and view your status.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your basic account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Full Name</p>
                <p className="text-lg font-medium">{user?.fullName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Email Address</p>
                <p className="text-lg font-medium">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Role</p>
                <p className="text-lg font-medium capitalize">{user?.role}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">KYC Status</p>
                <Badge variant={
                  user?.kycStatus === "verified" ? "default" :
                  user?.kycStatus === "rejected" ? "destructive" : "secondary"
                } className="text-sm">
                  {user?.kycStatus?.toUpperCase()}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Update your password and security settings</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Password changes are currently disabled in this environment.</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
