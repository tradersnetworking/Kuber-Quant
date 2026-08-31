/**
 * Runs after npm install on Hostinger (CI). Bootstraps pnpm without Corepack.
 * Skipped when pnpm workspace is already linked (local dev via pnpm install).
 */
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const pnpmBin = resolve(root, "node_modules/pnpm/bin/pnpm.cjs");
const apiDeps = resolve(root, "artifacts/api-server/node_modules");

if (existsSync(pnpmBin) && existsSync(apiDeps)) {
  console.log("postinstall: workspace deps present — skip Hostinger bootstrap");
  process.exit(0);
}

const onHostinger =
  process.env.CI === "true" ||
  process.env.HOSTINGER_DEPLOY === "1" ||
  /hostinger|hstgr\.cloud|^\/home\/u\d+/i.test(process.cwd());

if (!onHostinger) {
  console.log("postinstall: not Hostinger/CI — skip (use pnpm install locally)");
  process.exit(0);
}

console.log("postinstall: Hostinger bootstrap — installing monorepo deps…");
execSync("node scripts/hostinger-install.mjs", { stdio: "inherit", cwd: root, shell: true });
