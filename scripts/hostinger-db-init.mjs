/**
 * Run Drizzle schema push (and optional seed) when DATABASE_URL is available.
 * Used by Hostinger build and server.cjs startup.
 */
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensurePnpm, pnpm } from "./hostinger-pnpm.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dbDir = resolve(root, "lib/db");

function runSeed() {
  const tsxCandidates = [
    resolve(root, "node_modules/tsx/dist/cli.mjs"),
    resolve(root, "node_modules/tsx/dist/cli.js"),
  ];
  const tsxCli = tsxCandidates.find((p) => existsSync(p));
  const seedScript = resolve(root, "scripts/src/seed.ts");
  const env = { ...process.env, ALLOW_SEED: "true" };

  if (tsxCli) {
    execSync(`node "${tsxCli}" "${seedScript}"`, {
      cwd: root,
      stdio: "inherit",
      env,
      shell: true,
    });
    return;
  }

  ensurePnpm();
  execSync("node node_modules/pnpm/bin/pnpm.cjs exec tsx scripts/src/seed.ts", {
    cwd: root,
    stdio: "inherit",
    env,
    shell: true,
  });
}

/** Push schema via drizzle-kit directly (no pnpm) when available. */
function resolveDrizzleKitBin() {
  const requireFromDb = createRequire(resolve(dbDir, "package.json"));
  const requireFromRoot = createRequire(resolve(root, "package.json"));
  const candidates = [
    () => requireFromDb.resolve("drizzle-kit/bin.cjs"),
    () => requireFromRoot.resolve("drizzle-kit/bin.cjs"),
    () => resolve(root, "node_modules/drizzle-kit/bin.cjs"),
    () => resolve(dbDir, "node_modules/drizzle-kit/bin.cjs"),
  ];
  for (const pick of candidates) {
    try {
      const bin = pick();
      if (existsSync(bin)) return bin;
    } catch {
      /* try next */
    }
  }
  return null;
}

function runDbPushDirect() {
  const drizzleBin = resolveDrizzleKitBin();
  if (!drizzleBin) return false;

  execSync(
    `node "${drizzleBin}" push --force --config "${resolve(dbDir, "drizzle.config.ts")}"`,
    {
      cwd: dbDir,
      stdio: "inherit",
      env: process.env,
      shell: true,
      timeout: 120_000,
    },
  );
  return true;
}

function runDbPush() {
  if (runDbPushDirect()) {
    console.log("[db-init] db:push success (drizzle-kit direct)");
    return;
  }

  console.log("[db-init] drizzle-kit not found — falling back to pnpm db:push");
  ensurePnpm();
  pnpm("run db:push");
  console.log("[db-init] db:push success (pnpm)");
}

export function runHostingerDbInit({ seed = false } = {}) {
  console.log("[db-init] Starting...");
  const hasDb = Boolean(process.env.DATABASE_URL?.trim());
  console.log(`[db-init] DATABASE_URL present: ${hasDb ? "yes" : "no"}`);
  if (!hasDb) {
    console.log("[db-init] DATABASE_URL not set — skip");
    return false;
  }

  try {
    console.log("[db-init] Running db:push...");
    runDbPush();
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(`[db-init] db:push failed: ${reason}`);
    console.warn(
      "[db-init] Hostinger shared hosting often blocks outbound Postgres. Run once from your PC:",
    );
    console.warn("  DATABASE_URL='your-url' pnpm db:push && ALLOW_SEED=true pnpm db:seed");
    return false;
  }

  const shouldSeed =
    seed ||
    process.env.HOSTINGER_AUTO_SEED === "1" ||
    (process.env.HOSTINGER_AUTO_SEED !== "0" && process.env.BOOTSTRAP_USERS !== "false");

  if (shouldSeed) {
    try {
      console.log("[db-init] Running db:seed (ALLOW_SEED=true)...");
      runSeed();
      console.log("[db-init] db:seed success");
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error(`[db-init] db:seed failed: ${reason}`);
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
