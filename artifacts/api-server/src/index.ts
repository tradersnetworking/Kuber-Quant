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

assertProductionSecrets();
warnDevSecrets();
warnProductionBootstrap();

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

let server: ReturnType<typeof app.listen>;

void (async () => {
  try {
    await ensureDatabaseSchemaPatches();
    await ensureStakingSchema();
    await seedDefaultStakingPlansIfEmpty();
  } catch (err) {
    logger.error({ err }, "Database schema patches failed — some dashboards may error until pnpm db:push is run");
  }

  server = app.listen(port, () => {
    logger.info({ port, env: process.env.NODE_ENV || "development" }, "Server listening");

    void ensureDefaultUsers().then(() => {
      if (process.env.BOOTSTRAP_USERS !== "false" && process.env.NODE_ENV !== "production") {
        void ensureSampleTransactionHistory();
      }
    });
    void ensureDefaultCryptoGateways().then(async () => {
      const { ensureAllPaymentGatewayQrsInDb } = await import("./helpers/qrCodeService");
      const updated = await ensureAllPaymentGatewayQrsInDb();
      if (updated > 0) logger.info({ updated }, "Regenerated stale payment gateway QR codes");
    });
    void ensureDefaultExchangeRates();
    void ensureRbacSeed();
    void refreshExchangeRates(true);
    void scheduleBackgroundJobs();
  });
})();

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
