import { Queue, Worker, type ConnectionOptions, type JobsOptions } from "bullmq";
import { logger } from "../lib/logger";
import {
  processBackgroundJob,
  type BackgroundJobName,
  type SendEmailJobPayload,
} from "./jobHandlers";

const QUEUE_NAME = "kuber-background";

let queue: Queue | null = null;
let worker: Worker | null = null;

function getRedisUrl(): string | null {
  const url = process.env.REDIS_URL?.trim();
  return url || null;
}

export function isJobQueueEnabled(): boolean {
  return !!getRedisUrl() && process.env.RUN_JOBS_INLINE !== "true";
}

function getConnection(): ConnectionOptions {
  const url = getRedisUrl();
  if (!url) throw new Error("REDIS_URL is required for BullMQ");
  return { url, maxRetriesPerRequest: null };
}

export function getBackgroundQueue(): Queue | null {
  if (!isJobQueueEnabled()) return null;
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: getConnection() });
  }
  return queue;
}

export async function enqueueBackgroundJob(
  name: BackgroundJobName,
  data: Record<string, unknown> = {},
  opts?: JobsOptions,
): Promise<void> {
  const q = getBackgroundQueue();
  if (!q) return;
  await q.add(name, data, {
    removeOnComplete: 100,
    removeOnFail: 200,
    ...opts,
  });
}

export async function enqueueEmailJob(payload: SendEmailJobPayload): Promise<boolean> {
  const q = getBackgroundQueue();
  if (!q) return false;
  await q.add("send-email", payload, {
    removeOnComplete: 50,
    removeOnFail: 100,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  });
  return true;
}

const REPEATABLE_JOBS: Array<{ name: BackgroundJobName; pattern: string }> = [
  { name: "fx-rates", pattern: "0 6 * * *" },
  { name: "roi-engine", pattern: "0 * * * *" },
  { name: "ledger-reconcile", pattern: "30 2 * * *" },
  { name: "db-backup", pattern: "0 3 * * *" },
  { name: "support-mail-sync", pattern: "*/5 * * * *" },
  { name: "kyc-reverify", pattern: "0 4 * * *" },
];

export async function registerRepeatableJobs(): Promise<void> {
  const q = getBackgroundQueue();
  if (!q) return;

  const existing = await q.getRepeatableJobs();
  for (const job of REPEATABLE_JOBS) {
    for (const repeat of existing) {
      if (repeat.name === job.name) {
        await q.removeRepeatableByKey(repeat.key);
      }
    }
  }

  for (const job of REPEATABLE_JOBS) {
    await q.add(
      job.name,
      {},
      {
        repeat: { pattern: job.pattern },
        jobId: `repeat:${job.name}`,
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    );
    logger.info({ job: job.name, pattern: job.pattern }, "BullMQ repeatable job registered");
  }
}

export async function startBackgroundWorker(): Promise<Worker> {
  if (worker) return worker;

  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      await processBackgroundJob(job.name as BackgroundJobName, job.data);
    },
    {
      connection: getConnection(),
      concurrency: Number(process.env.WORKER_CONCURRENCY || 2),
    },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, name: job?.name, err }, "Background job failed");
  });

  worker.on("completed", (job) => {
    logger.debug({ jobId: job.id, name: job.name }, "Background job completed");
  });

  logger.info({ queue: QUEUE_NAME }, "BullMQ worker started");
  return worker;
}

export async function closeJobQueue(): Promise<void> {
  await worker?.close();
  await queue?.close();
  worker = null;
  queue = null;
}
