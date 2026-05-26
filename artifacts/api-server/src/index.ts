import app from "./app";
import { logger } from "./lib/logger";
import { assertProductionSecrets, warnDevSecrets } from "./lib/env";
import cron from "node-cron";
import { processMaturedInvestments } from "./helpers/roiEngine";
import { syncSupportInboxFromImap } from "./helpers/supportMailService";
import { getSupportMailDeskConfig } from "./helpers/supportMailDeskSettings";
import { ensureDefaultUsers } from "./helpers/bootstrapUsers";

assertProductionSecrets();
warnDevSecrets();

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, () => {
  logger.info({ port, env: process.env.NODE_ENV || "development" }, "Server listening");

  void ensureDefaultUsers();

  cron.schedule("0 * * * *", async () => {
    logger.info("ROI automation: starting cycle");
    try {
      const result = await processMaturedInvestments();
      if (result.processed > 0 || result.errors > 0) {
        logger.info({ ...result }, "ROI automation: cycle complete");
      }
    } catch (err) {
      logger.error({ err }, "ROI automation failed");
    }
  });
  logger.info("ROI automation engine scheduled (every hour)");

  cron.schedule("*/5 * * * *", async () => {
    try {
      const desk = await getSupportMailDeskConfig();
      if (!desk.autoSyncEnabled) return;
      const result = await syncSupportInboxFromImap();
      if (result.synced > 0) {
        logger.info({ synced: result.synced }, "Support mail IMAP sync complete");
      }
    } catch (err) {
      logger.error({ err }, "Support mail IMAP sync failed");
    }
  });
  logger.info("Support mail IMAP sync scheduled (every 5 minutes when enabled)");
});

function shutdown(signal: string) {
  logger.info({ signal }, "Graceful shutdown initiated");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
