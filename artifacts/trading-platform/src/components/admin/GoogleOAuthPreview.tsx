import { GoogleLogin } from "@react-oauth/google";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";

type Props = {
  enabled: boolean;
  clientId: string;
  envClientId?: string;
};

export function GoogleOAuthPreview({ enabled, clientId, envClientId }: Props) {
  const effectiveId = clientId.trim() || envClientId?.trim() || "";
  const configured = Boolean(effectiveId);

  return (
    <Card className="border-amber-500/20 bg-gradient-to-br from-black/40 to-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-white flex items-center gap-2">
          Google Sign-In Preview
          {enabled && configured ? (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
          ) : (
            <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">Inactive</Badge>
          )}
        </CardTitle>
        <CardDescription>
          When enabled, investors see this button on the login page. Client ID must match your Google Cloud OAuth credentials.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!configured && (
          <div className="flex items-start gap-2 text-amber-400 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Set a Client ID below or configure <code className="text-xs">VITE_GOOGLE_CLIENT_ID</code> / <code className="text-xs">GOOGLE_CLIENT_ID</code> in server environment.</span>
          </div>
        )}
        {enabled && configured ? (
          <div className="max-w-sm [&>div]:w-full">
            <GoogleOAuthProvider clientId={effectiveId}>
              <GoogleLogin
                onSuccess={() => {}}
                onError={() => {}}
                theme="filled_black"
                size="large"
                text="continue_with"
                shape="rectangular"
                width="320"
              />
            </GoogleOAuthProvider>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Turn on Google OAuth and provide a Client ID to preview the sign-in button.
          </p>
        )}
        {envClientId && !clientId.trim() && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            Using Client ID from environment variable.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
