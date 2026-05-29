/** WebAuthn Relying Party configuration from environment. */
export function getWebauthnRpId(): string {
  const explicit = process.env.WEBAUTHN_RP_ID?.trim();
  if (explicit) return explicit;

  const appUrl = process.env.APP_URL?.trim() || process.env.API_URL?.trim();
  if (appUrl) {
    try {
      return new URL(appUrl).hostname;
    } catch {
      /* fall through */
    }
  }

  return process.env.NODE_ENV === "production" ? "localhost" : "localhost";
}

export function getWebauthnOrigin(): string {
  const explicit = process.env.WEBAUTHN_ORIGIN?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const appUrl = process.env.APP_URL?.trim() || process.env.API_URL?.trim();
  if (appUrl) return appUrl.replace(/\/+$/, "");

  return "http://localhost:5173";
}

export function getWebauthnRpName(): string {
  return process.env.WEBAUTHN_RP_NAME?.trim() || "Kuber Quant";
}

export function getWebauthnExpectedOrigins(): string[] {
  const origins = new Set<string>();
  origins.add(getWebauthnOrigin());

  const cors = process.env.CORS_ORIGINS?.split(",") ?? [];
  for (const o of cors) {
    const trimmed = o.trim().replace(/\/+$/, "");
    if (trimmed) origins.add(trimmed);
  }

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:5173");
    origins.add("http://127.0.0.1:5173");
    origins.add("http://localhost:8080");
  }

  return [...origins];
}
