import app from "./app";
import { logger } from "./lib/logger";
import cron from "node-cron";
import { processMaturedInvestments } from "./helpers/roiEngine";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // ── ROI Automation Engine — runs every hour ─────────────────────────────
  cron.schedule("0 * * * *", async () => {
    logger.info("ROI automation: starting cycle");
    const result = await processMaturedInvestments();
    if (result.processed > 0 || result.errors > 0) {
      logger.info({ ...result }, "ROI automation: cycle complete");
    }
  });
  logger.info("ROI automation engine scheduled (every hour)");
});
