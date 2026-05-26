/**
 * Hostinger production build.
 * Runs install (Corepack-safe) then builds web + API bundles.
 */
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ensurePnpm, pnpm } from "./hostinger-pnpm.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: process.env, cwd: root, shell: true });
}

process.env.HOSTINGER_DEPLOY = "1";
process.env.CI = "true";

if (process.env.HOSTINGER_SKIP_INSTALL !== "1") {
  run("node scripts/hostinger-install.mjs");
} else {
  console.log("Skipping install (HOSTINGER_SKIP_INSTALL=1)");
  ensurePnpm();
}

pnpm("run build:prod");
console.log("Hostinger build complete.");
