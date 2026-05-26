import { useQuery } from "@tanstack/react-query";

export type GoogleAuthConfig = {
  googleOAuthEnabled: boolean;
  googleClientId: string;
};

export function useGoogleAuthConfig() {
  return useQuery<GoogleAuthConfig>({
    queryKey: ["auth-config"],
    queryFn: async () => {
      const res = await fetch("/api/auth/config");
      if (!res.ok) throw new Error("Failed to load auth config");
      return res.json();
    },
    staleTime: 60_000,
    retry: 1,
  });
}
