import { logger } from "./logger";

const DEV_JWT = "kuberquant-dev-secret-key-min-32-chars!!";
const DEV_ENC = "kuber-quant-dev-key-change-me";

export function assertProductionSecrets() {
  if (process.env.NODE_ENV !== "production") return;

  const missing: string[] = [];
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === DEV_JWT) {
    missing.push("SESSION_SECRET");
  }
  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY === DEV_ENC) {
    missing.push("ENCRYPTION_KEY");
  }
  if (missing.length) {
    throw new Error(`Production requires secure values for: ${missing.join(", ")}`);
  }
}

export function warnDevSecrets() {
  if (process.env.NODE_ENV === "production") return;
  if (!process.env.SESSION_SECRET) {
    logger.warn("SESSION_SECRET not set — using development default");
  }
  if (!process.env.ENCRYPTION_KEY) {
    logger.warn("ENCRYPTION_KEY not set — using development default");
  }
}

export function warnProductionBootstrap() {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.BOOTSTRAP_USERS === "true") {
    logger.warn(
      "BOOTSTRAP_USERS=true in production — demo accounts will be created or reset. Set BOOTSTRAP_USERS=false after the first admin exists.",
    );
  }
  if (!process.env.REDIS_URL?.trim()) {
    logger.warn("REDIS_URL not set — distributed locks and captcha will use in-memory fallback (not safe for multi-instance)");
  }
}

export function getSessionSecret(): string {
  return process.env.SESSION_SECRET || DEV_JWT;
}

export function getEncryptionKey(): string {
  return process.env.ENCRYPTION_KEY || DEV_ENC;
}
