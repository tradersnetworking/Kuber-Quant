/**
 * Hostinger production build.
 * Runs install (Corepack-safe) then builds web + API bundles.
 */
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: process.env, cwd: root, shell: true });
}

process.env.HOSTINGER_DEPLOY = "1";
process.env.CI = "true";

// Install deps unless Hostinger already ran hostinger-install.mjs
if (process.env.HOSTINGER_SKIP_INSTALL !== "1") {
  run("node scripts/hostinger-install.mjs");
} else {
  console.log("Skipping install (HOSTINGER_SKIP_INSTALL=1)");
}

run("pnpm run build:prod");
console.log("Hostinger build complete.");
