import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { authFetchJson, publicFetchJson } from "@/lib/api-fetch";
import { apiPath } from "@/lib/token-store";
import { saveTrustedDeviceToken } from "@/lib/trusted-device";

export type BiometricCredential = {
  id: number;
  deviceName: string;
  deviceType: string | null;
  backedUp: boolean | null;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

export type BiometricPreferences = {
  quickLoginEnabled: boolean;
  biometricWithdrawalsEnabled: boolean;
  withdrawalThresholdInr: string | number;
};

export function isWebAuthnSupported(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential !== "undefined";
}

export async function checkWebAuthnAvailable(): Promise<{ supported: boolean; rpId?: string }> {
  if (!isWebAuthnSupported()) return { supported: false };
  try {
    return await publicFetchJson("/auth/webauthn/available");
  } catch {
    return { supported: false };
  }
}

export async function fetchBiometricSettings(): Promise<{
  credentials: BiometricCredential[];
  preferences: BiometricPreferences;
}> {
  return authFetchJson("/auth/webauthn/credentials");
}

export async function registerPasskey(deviceName?: string): Promise<{ ok: boolean; message?: string }> {
  const { options, challengeKey } = await authFetchJson<{ options: any; challengeKey: string }>(
    "/auth/webauthn/register/begin",
    { method: "POST" },
  );
  const attestation = await startRegistration({ optionsJSON: options });
  return authFetchJson("/auth/webauthn/register/finish", {
    method: "POST",
    body: JSON.stringify({ response: attestation, challengeKey, deviceName }),
  });
}

export async function loginWithPasskey(email: string): Promise<{
  token: string;
  refreshToken?: string;
  user: any;
}> {
  const begin = await publicFetchJson<{ options: any; challengeKey: string; userId: number }>(
    "/auth/webauthn/login/begin",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    },
  );
  const assertion = await startAuthentication({ optionsJSON: begin.options });
  const res = await fetch(apiPath("/auth/webauthn/login/finish"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify({
      email,
      response: assertion,
      challengeKey: begin.challengeKey,
      userId: begin.userId,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Passkey login failed");
  return data;
}

export async function verifyPasskey2fa(payload: {
  tempToken: string;
  trustDevice?: boolean;
}): Promise<{ token: string; refreshToken?: string; user: any; trustedDeviceToken?: string }> {
  const begin = await publicFetchJson<{ options: any; challengeKey: string }>(
    "/auth/webauthn/2fa/begin",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tempToken: payload.tempToken }),
    },
  );
  const assertion = await startAuthentication({ optionsJSON: begin.options });
  const res = await fetch(apiPath("/auth/webauthn/2fa/finish"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify({
      tempToken: payload.tempToken,
      response: assertion,
      challengeKey: begin.challengeKey,
      trustDevice: payload.trustDevice,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Passkey verification failed");
  if (data.trustedDeviceToken) saveTrustedDeviceToken(data.trustedDeviceToken);
  return data;
}

export async function verifyPasskeyAction(): Promise<string> {
  const begin = await authFetchJson<{ options: any; challengeKey: string }>(
    "/auth/webauthn/action/begin",
    { method: "POST" },
  );
  const assertion = await startAuthentication({ optionsJSON: begin.options });
  const data = await authFetchJson<{ verified: boolean; actionToken: string }>(
    "/auth/webauthn/action/verify",
    {
      method: "POST",
      body: JSON.stringify({ response: assertion, challengeKey: begin.challengeKey }),
    },
  );
  return data.actionToken;
}

export async function updateBiometricPreferences(prefs: Partial<BiometricPreferences>) {
  return authFetchJson("/auth/webauthn/preferences", {
    method: "PATCH",
    body: JSON.stringify(prefs),
  });
}

export async function renamePasskey(id: number, deviceName: string) {
  return authFetchJson(`/auth/webauthn/credentials/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ deviceName }),
  });
}

export async function removePasskey(id: number) {
  return authFetchJson(`/auth/webauthn/credentials/${id}`, { method: "DELETE" });
}

export async function fetchBiometricLoginHistory() {
  return authFetchJson<Array<{
    id: number;
    eventType: string;
    success: boolean;
    failReason: string | null;
    deviceLabel: string | null;
    ipAddress: string | null;
    createdAt: string;
  }>>("/auth/webauthn/login-history");
}
