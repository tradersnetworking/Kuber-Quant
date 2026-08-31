/**
 * Hostinger production build.
 * Runs install (Corepack-safe) then builds web + API bundles.
 */
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ensurePnpm, pnpm, workspaceReady } from "./hostinger-pnpm.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: process.env, cwd: root, shell: true });
}

process.env.HOSTINGER_DEPLOY = "1";
process.env.CI = "true";

if (process.env.HOSTINGER_SKIP_INSTALL === "1" || workspaceReady()) {
  if (workspaceReady()) {
    console.log("Skipping install — workspace deps already present (postinstall)");
  } else {
    console.log("Skipping install (HOSTINGER_SKIP_INSTALL=1)");
  }
  ensurePnpm();
} else {
  run("node scripts/hostinger-install.mjs");
}

pnpm("run build:prod");

if (process.env.HOSTINGER_SKIP_DB_INIT !== "1") {
  const { runHostingerDbInit } = await import("./hostinger-db-init.mjs");
  const shouldSeed =
    process.argv.includes("--seed") ||
    process.env.HOSTINGER_AUTO_SEED === "1" ||
    (process.env.HOSTINGER_AUTO_SEED !== "0" && process.env.BOOTSTRAP_USERS !== "false");
  runHostingerDbInit({ seed: shouldSeed });
}

console.log("Hostinger build complete.");
