/**
 * Fix corrupted node_modules (e.g. missing vite/dist/node/chunks/dist.js on Windows).
 * Removes all node_modules folders and reinstalls dependencies.
 */
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: { ...process.env, CI: "true" }, cwd: root, shell: true });
}

function removeNodeModules(dir) {
  const nm = resolve(dir, "node_modules");
  if (existsSync(nm)) {
    console.log(`Removing ${nm}`);
    rmSync(nm, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  }
}

console.log("Cleaning node_modules…");
removeNodeModules(root);
for (const sub of ["artifacts/trading-platform", "artifacts/api-server", "lib/db", "lib/api-spec", "lib/api-zod", "lib/api-client-react", "scripts"]) {
  removeNodeModules(resolve(root, sub));
}

console.log("Reinstalling dependencies…");
run("pnpm install --no-frozen-lockfile");
console.log("Clean install complete. Run: pnpm dev");
