/**
 * Hostinger dependency install — avoids Corepack (broken on alt-nodejs with dynamic import).
 * Use as the Install command in hPanel, or let hostinger-build.mjs call this first.
 */
import { execSync } from "node:child_process";

const PNPM_VERSION = "9.15.0";

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: process.env, shell: true });
}

function pnpmWorks() {
  try {
    const out = execSync("pnpm --version", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    console.log(`pnpm available: ${out}`);
    return true;
  } catch {
    return false;
  }
}

process.env.HOSTINGER_DEPLOY = "1";
process.env.CI = "true";
// Relax minimum-release-age on deploy hosts (supply-chain guard stays on for local dev).
process.env.npm_config_minimum_release_age = "0";

console.log("Hostinger install: bypassing Corepack, using npm-global pnpm…");

try {
  run("corepack disable");
} catch {
  console.log("(corepack disable skipped — not enabled or not available)");
}

if (!pnpmWorks()) {
  run(`npm install -g pnpm@${PNPM_VERSION}`);
}

if (!pnpmWorks()) {
  console.error("ERROR: pnpm is still unavailable after global install.");
  process.exit(1);
}

run("pnpm install --frozen-lockfile");
console.log("Hostinger install complete.");
