/**
 * Run pnpm on Hostinger without Corepack (alt-nodejs breaks Corepack's pnpm shim).
 * Bootstraps pnpm via npm, then invokes pnpm.cjs directly with node.
 */
import { execSync } from "node:child_process";
import { chmodSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, "..");
export const PNPM_VERSION = "10.33.4";

export function run(cmd, cwd = ROOT) {
  console.log(`> ${cmd}`);
  execSync(cmd, {
    stdio: "inherit",
    env: process.env,
    cwd,
    shell: true,
  });
}

function pnpmBinPath() {
  return resolve(ROOT, "node_modules/pnpm/bin/pnpm.cjs");
}

/** True when pnpm install has already linked the monorepo (pnpm uses root .pnpm store). */
export function workspaceReady() {
  const bin = pnpmBinPath();
  const store = resolve(ROOT, "node_modules/.pnpm");
  if (!existsSync(bin) || !existsSync(store)) {
    return false;
  }
  // Fast path: full install leaves 800+ packages in the store (Hostinger log shows +815).
  try {
    const entries = readdirSync(store);
    if (entries.length > 100) return true;
  } catch {
    return false;
  }
  try {
    execSync(`node "${bin}" list --filter @workspace/api-server --depth -1`, {
      cwd: ROOT,
      stdio: "pipe",
      encoding: "utf8",
    });
    return true;
  } catch {
    return false;
  }
}

export function ensurePnpm() {
  process.env.HOSTINGER_DEPLOY = "1";
  process.env.CI = "true";
  // Relax minimum-release-age on deploy (local dev keeps the 1-day guard in pnpm-workspace.yaml).
  process.env.npm_config_minimum_release_age = "0";

  const onHostinger =
    process.env.HOSTINGER_DEPLOY === "1" ||
    /hostinger|hstgr\.cloud|^\/home\/u\d+/i.test(ROOT);

  // Hostinger alt-nodejs root is read-only — corepack disable throws EROFS (harmless but noisy).
  if (!onHostinger) {
    try {
      run("corepack disable", ROOT);
    } catch {
      console.log("(corepack disable skipped — not enabled or not available)");
    }
  }

  if (!existsSync(pnpmBinPath())) {
    console.log(`Bootstrapping pnpm@${PNPM_VERSION} via npm (no Corepack)…`);
    run(`npm install pnpm@${PNPM_VERSION} --no-save --no-package-lock --legacy-peer-deps`, ROOT);
  }

  if (!existsSync(pnpmBinPath())) {
    console.error("ERROR: pnpm could not be bootstrapped. Check npm install output above.");
    process.exit(1);
  }

  const version = execSync(`node "${pnpmBinPath()}" --version`, {
    encoding: "utf8",
    cwd: ROOT,
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  console.log(`Using pnpm ${version} at ${pnpmBinPath()}`);
}

/**
 * Node.js 24 on Hostinger extracts npm binaries without the executable bit.
 * esbuild's postinstall then fails with EACCES when it spawns bin/esbuild.
 * Mark package bins executable after a script-less install and before rebuild.
 */
export function makePackageBinsExecutable(root = ROOT) {
  const start = join(root, "node_modules", ".pnpm");
  let count = 0;
  const walk = (dir, depth) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (depth < 9) walk(full, depth + 1);
        continue;
      }
      if (!entry.isFile() && !entry.isSymbolicLink()) continue;
      const parent = dir.split(sep).at(-1);
      const shouldExec =
        parent === "bin" ||
        entry.name === "esbuild" ||
        entry.name.endsWith(".node");
      if (!shouldExec) continue;
      try {
        chmodSync(full, 0o755);
        count += 1;
      } catch {
        // A missing or locked file should not abort the install.
      }
    }
  };
  walk(start, 0);
  console.log(`Marked ${count} package binaries executable`);
}

export function pnpm(args) {
  const bin = pnpmBinPath();
  run(`node "${bin}" ${args}`);
}
