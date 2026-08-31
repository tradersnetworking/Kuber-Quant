/**
 * Runs after npm install on Hostinger / CI. Bootstraps pnpm without Corepack.
 * Skipped when pnpm workspace is already linked (local dev via pnpm install).
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { workspaceReady } from "./hostinger-pnpm.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

if (workspaceReady()) {
  console.log("postinstall: workspace deps present — skip Hostinger bootstrap");
  process.exit(0);
}

const cwd = process.cwd();
const onHostinger =
  process.env.CI === "true" ||
  process.env.HOSTINGER_DEPLOY === "1" ||
  /hostinger|hstgr\.cloud|^\/home\/u\d+/i.test(cwd);

if (!onHostinger) {
  console.log("postinstall: not Hostinger/CI — skip (use pnpm install locally)");
  process.exit(0);
}

console.log("postinstall: Hostinger/CI bootstrap — installing monorepo deps…");
execSync("node scripts/hostinger-install.mjs", { stdio: "inherit", cwd: root, shell: true });
