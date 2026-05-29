import { useCallback, useEffect, useState } from "react";
import {
  checkWebAuthnAvailable,
  fetchBiometricSettings,
  isWebAuthnSupported,
  loginWithPasskey,
  registerPasskey,
  verifyPasskey2fa,
  verifyPasskeyAction,
  type BiometricCredential,
  type BiometricPreferences,
} from "@/lib/webauthn-api";

export function useBiometricAuth() {
  const [supported, setSupported] = useState(false);
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState<BiometricCredential[]>([]);
  const [preferences, setPreferences] = useState<BiometricPreferences | null>(null);

  const refresh = useCallback(async () => {
    if (!isWebAuthnSupported()) {
      setSupported(false);
      setCredentials([]);
      setPreferences(null);
      setLoading(false);
      return;
    }
    try {
      const avail = await checkWebAuthnAvailable();
      setSupported(avail.supported);
    } catch {
      setSupported(false);
    }
    setLoading(false);
  }, []);

  const refreshSettings = useCallback(async () => {
    if (!isWebAuthnSupported()) return;
    try {
      const data = await fetchBiometricSettings();
      setCredentials(data.credentials);
      setPreferences(data.preferences);
    } catch {
      /* ignore when logged out */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    supported,
    loading,
    credentials,
    preferences,
    refresh,
    refreshSettings,
    registerPasskey,
    loginWithPasskey,
    verifyPasskey2fa,
    verifyPasskeyAction,
    hasPasskeys: credentials.some(c => c.isActive),
  };
}
