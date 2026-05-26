import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { pingRedis } from "../helpers/redis";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
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

  const code = checks.postgres === "error" ? 503 : 200;
  res.status(code).json(checks);
});

export default router;
