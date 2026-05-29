import { initSentry } from "./lib/sentry";

initSentry();

import { logger } from "./lib/logger";
import { assertProductionSecrets, warnDevSecrets } from "./lib/env";
import { startBackgroundWorker, closeJobQueue } from "./helpers/jobQueue";

assertProductionSecrets();
warnDevSecrets();

async function main() {
  if (!process.env.REDIS_URL?.trim()) {
    throw new Error("REDIS_URL is required for the background worker");
  }

  await startBackgroundWorker();
  logger.info("Background worker process ready");
}

void main();

async function shutdown(signal: string) {
  logger.info({ signal }, "Worker shutdown initiated");
  await closeJobQueue();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
