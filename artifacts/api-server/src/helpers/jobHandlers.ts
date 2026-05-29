import { logger } from "../lib/logger";
import { runRoiEngineCycle } from "./roiEngine";
import { runStakingEngineCycle } from "./stakingEngine";
import { refreshExchangeRates } from "./exchangeRateService";
import { reconcileUserBalances } from "./ledgerReconciliation";
import { runDatabaseBackup } from "./databaseBackup";
import { syncSupportInboxFromImap } from "./supportMailService";
import { getSupportMailDeskConfig } from "./supportMailDeskSettings";
import { withDistributedLock } from "./distributedLock";
import { sendMail, type EmailPurpose } from "./mailer";
import { isAutoEmailEnabled, resolveEmailSubject, resolveFromAddress } from "./emailCommunicationSettings";

export type BackgroundJobName =
  | "fx-rates"
  | "roi-engine"
  | "staking-rewards"
  | "ledger-reconcile"
  | "db-backup"
  | "support-mail-sync"
  | "send-email"
  | "kyc-reverify";

export type SendEmailJobPayload = {
  to: string;
  purpose: EmailPurpose;
  subject: string;
  html: string;
  text?: string;
};

const LOCK_TTL: Record<BackgroundJobName, number> = {
  "fx-rates": 300,
  "roi-engine": 3300,
  "staking-rewards": 3300,
  "ledger-reconcile": 3600,
  "db-backup": 3600,
  "support-mail-sync": 240,
  "send-email": 60,
  "kyc-reverify": 3600,
};

export async function processBackgroundJob(name: BackgroundJobName, data: unknown): Promise<void> {
  switch (name) {
    case "fx-rates":
      await withDistributedLock("cron:fx-rates", LOCK_TTL[name], async () => {
        await refreshExchangeRates(true);
        logger.info("Daily FX rate refresh complete");
      });
      return;

    case "roi-engine":
      await withDistributedLock("cron:roi-engine", LOCK_TTL[name], async () => {
        logger.info("ROI automation: starting cycle");
        await runRoiEngineCycle();
      });
      return;

    case "staking-rewards":
      await withDistributedLock("cron:staking-rewards", LOCK_TTL[name], async () => {
        logger.info("Staking rewards: starting cycle");
        await runStakingEngineCycle();
      });
      return;

    case "ledger-reconcile":
      await withDistributedLock("cron:ledger-reconcile", LOCK_TTL[name], async () => {
        const report = await reconcileUserBalances({ autoFix: true });
        logger.info(
          { driftCount: report.driftCount, fixed: report.fixed },
          "Nightly ledger reconciliation complete",
        );
      });
      return;

    case "db-backup":
      await withDistributedLock("cron:db-backup", LOCK_TTL[name], async () => {
        const result = await runDatabaseBackup();
        if (result.ok) {
          logger.info({ file: result.file }, "Scheduled database backup complete");
        } else {
          logger.warn({ message: result.message }, "Scheduled database backup skipped or failed");
        }
      });
      return;

    case "support-mail-sync": {
      const desk = await getSupportMailDeskConfig();
      if (!desk.autoSyncEnabled) return;
      await withDistributedLock("cron:support-mail", LOCK_TTL[name], async () => {
        const result = await syncSupportInboxFromImap();
        if (result.synced > 0) {
          logger.info({ synced: result.synced }, "Support mail IMAP sync complete");
        }
      });
      return;
    }

    case "send-email": {
      const payload = data as SendEmailJobPayload;
      if (!(await isAutoEmailEnabled(payload.purpose))) return;
      const from = await resolveFromAddress(payload.purpose);
      const subject = await resolveEmailSubject(payload.purpose, payload.subject);
      await sendMail({ ...payload, subject, from });
      return;
    }

    case "kyc-reverify":
      await withDistributedLock("cron:kyc-reverify", LOCK_TTL[name], async () => {
        const { runKycReverificationSweep } = await import("./kycReverificationService");
        const count = await runKycReverificationSweep();
        if (count > 0) logger.info({ count }, "KYC re-verification sweep complete");
      });
      return;

    default:
      logger.warn({ name }, "Unknown background job");
  }
}
