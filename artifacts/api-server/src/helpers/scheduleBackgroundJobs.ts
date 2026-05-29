import cron from "node-cron";
import { logger } from "../lib/logger";
import { withDistributedLock } from "./distributedLock";
import { isJobQueueEnabled, registerRepeatableJobs } from "./jobQueue";
import { processBackgroundJob } from "./jobHandlers";

function scheduleInlineCron(
  label: string,
  pattern: string,
  lockKey: string,
  lockTtl: number,
  jobName: Parameters<typeof processBackgroundJob>[0],
): void {
  cron.schedule(pattern, async () => {
    try {
      await withDistributedLock(lockKey, lockTtl, async () => {
        await processBackgroundJob(jobName, {});
      });
    } catch (err) {
      logger.error({ err, job: jobName }, `${label} failed`);
    }
  });
  logger.info({ pattern }, `${label} scheduled (inline)`);
}

export async function scheduleBackgroundJobs(): Promise<void> {
  if (isJobQueueEnabled()) {
    await registerRepeatableJobs();
    logger.info("Background jobs delegated to BullMQ worker (set WORKER_MODE=true on worker process)");
    return;
  }

  scheduleInlineCron("Daily FX rate refresh", "0 6 * * *", "cron:fx-rates", 300, "fx-rates");
  scheduleInlineCron("ROI automation engine", "0 * * * *", "cron:roi-engine", 3300, "roi-engine");
  scheduleInlineCron("Ledger reconciliation", "30 2 * * *", "cron:ledger-reconcile", 3600, "ledger-reconcile");
  scheduleInlineCron("Database backup", "0 3 * * *", "cron:db-backup", 3600, "db-backup");
  scheduleInlineCron("Support mail IMAP sync", "*/5 * * * *", "cron:support-mail", 240, "support-mail-sync");
  scheduleInlineCron("KYC re-verification sweep", "0 4 * * *", "cron:kyc-reverify", 3600, "kyc-reverify");
}
