import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "@workspace/db/orm";
import { pingRedis } from "../helpers/redis";

const router: IRouter = Router();

async function healthHandler(_req: Request, res: Response) {
  const checks: Record<string, string> = {
    status: "ok",
    postgres: "ok",
    redis: "skipped",
  };

  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    checks.status = "degraded";
    checks.postgres = "error";
  }

  const redisStatus = await pingRedis();
  checks.redis = redisStatus;
  if (redisStatus === "error") {
    checks.status = "degraded";
  }

  // Always 200 when the Node process is alive — shared hosts probe /health and
  // restart the app on 503 even when only Postgres is unreachable.
  res.status(200).json(checks);
}

router.get("/healthz", healthHandler);
router.get("/health", healthHandler);

export default router;
