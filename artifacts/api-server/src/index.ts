import { initSentry } from "./lib/sentry";

initSentry();

import app from "./app";
import { logger } from "./lib/logger";
import { assertProductionSecrets, warnDevSecrets, warnProductionBootstrap } from "./lib/env";
import { ensureDefaultUsers } from "./helpers/bootstrapUsers";
import { ensureDefaultCryptoGateways } from "./helpers/defaultPaymentGateways";
import { refreshExchangeRates } from "./helpers/exchangeRateService";
import { ensureDefaultExchangeRates } from "./helpers/exchangeService";
import { scheduleBackgroundJobs } from "./helpers/scheduleBackgroundJobs";
import { closeJobQueue } from "./helpers/jobQueue";
import { ensureRbacSeed } from "./helpers/rbacService";
import { ensureSampleTransactionHistory } from "./helpers/sampleTransactionHistory";
import { ensureDatabaseSchemaPatches } from "./helpers/ensureDatabaseSchemaPatches";
import { ensureStakingSchema, seedDefaultStakingPlansIfEmpty } from "./helpers/ensureStakingSchema";
import { ensureWebauthnSchema } from "./helpers/ensureWebauthnSchema";

assertProductionSecrets();
warnDevSecrets();
warnProductionBootstrap();

function resolvePort(): number {
  const candidates = [
    process.env.PORT,
    process.env.PASSENGER_PORT,
    process.env.NODE_PORT,
  ];
  for (const raw of candidates) {
    if (!raw?.trim()) continue;
    const n = Number(raw);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  if (process.env.NODE_ENV === "production") {
    logger.warn("PORT not set by host — falling back to 8080");
    return 8080;
  }
  return 8080;
}

const port = resolvePort();
process.env.PORT = String(port);

let server: ReturnType<typeof app.listen>;

server = app.listen(port, () => {
  logger.info({ port, env: process.env.NODE_ENV || "development" }, "Server listening");

  void (async () => {
    try {
      await ensureDatabaseSchemaPatches();
      await ensureStakingSchema();
      await ensureWebauthnSchema();
      await seedDefaultStakingPlansIfEmpty();
    } catch (err) {
      logger.warn({ err }, "Database schema patches incomplete — run pnpm db:push if dashboards error");
    }
  })();

  void ensureDefaultUsers()
    .then(() => {
      if (process.env.BOOTSTRAP_USERS !== "false" && process.env.NODE_ENV !== "production") {
        void ensureSampleTransactionHistory();
      }
    })
    .catch((err) => logger.error({ err }, "Default user bootstrap failed"));
  void ensureDefaultCryptoGateways()
    .then(async () => {
      const { ensureAllPaymentGatewayQrsInDb } = await import("./helpers/qrCodeService");
      const updated = await ensureAllPaymentGatewayQrsInDb();
      if (updated > 0) logger.info({ updated }, "Regenerated stale payment gateway QR codes");
    })
    .catch((err) => logger.warn({ err }, "Crypto payment gateway bootstrap failed"));
  void ensureDefaultExchangeRates();
  void ensureRbacSeed().catch((err) => logger.warn({ err }, "RBAC seed failed"));
  void refreshExchangeRates(false).catch((err) => logger.warn({ err }, "FX rate refresh failed"));
  void scheduleBackgroundJobs();
});

async function shutdown(signal: string) {
  logger.info({ signal }, "Graceful shutdown initiated");
  if (!server) {
    process.exit(0);
    return;
  }
  server.close(async () => {
    await closeJobQueue();
    logger.info("Server closed");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
