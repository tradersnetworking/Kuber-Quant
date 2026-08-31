/**
 * Run Drizzle schema push (and optional seed) when DATABASE_URL is available.
 * Used by Hostinger build and server.cjs startup.
 */
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensurePnpm, pnpm } from "./hostinger-pnpm.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function runHostingerDbInit({ seed = false } = {}) {
  if (!process.env.DATABASE_URL?.trim()) {
    console.log("[db-init] DATABASE_URL not set — skip");
    return false;
  }

  ensurePnpm();

  try {
    console.log("[db-init] Running db:push...");
    pnpm("run db:push");
  } catch (err) {
    console.error("[db-init] db:push failed:", err instanceof Error ? err.message : err);
    return false;
  }

  const shouldSeed =
    seed ||
    process.env.HOSTINGER_AUTO_SEED === "1" ||
    (process.env.HOSTINGER_AUTO_SEED !== "0" && process.env.BOOTSTRAP_USERS !== "false");

  if (shouldSeed) {
    try {
      console.log("[db-init] Running db:seed (ALLOW_SEED=true)...");
      execSync("node node_modules/pnpm/bin/pnpm.cjs exec tsx scripts/src/seed.ts", {
        cwd: root,
        stdio: "inherit",
        env: { ...process.env, ALLOW_SEED: "true" },
        shell: true,
      });
    } catch (err) {
      console.error("[db-init] db:seed failed:", err instanceof Error ? err.message : err);
      return false;
    }
  }

  console.log("[db-init] Complete");
  return true;
}

const isMain = process.argv[1]?.replace(/\\/g, "/").includes("hostinger-db-init");
if (isMain) {
  const seed = process.argv.includes("--seed");
  runHostingerDbInit({ seed });
}
