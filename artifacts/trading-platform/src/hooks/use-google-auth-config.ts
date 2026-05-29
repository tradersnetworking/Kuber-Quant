import { useQuery } from "@tanstack/react-query";
import { publicFetchJson } from "@/lib/api-fetch";

export type GoogleAuthConfig = {
  googleOAuthEnabled: boolean;
  googleClientId: string;
};

export function useGoogleAuthConfig() {
  return useQuery<GoogleAuthConfig>({
    queryKey: ["auth-config"],
    queryFn: () => publicFetchJson<GoogleAuthConfig>("/auth/config"),
    staleTime: 60_000,
    retry: 1,
  });
}
