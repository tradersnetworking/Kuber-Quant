/**
 * Hostinger dependency install — avoids Corepack (broken on alt-nodejs with dynamic import).
 * Use as the Install command in hPanel, or let hostinger-build.mjs call this first.
 *
 * hPanel: set Package manager to npm (not pnpm), then use this as Install command.
 */
import { ensurePnpm, makePackageBinsExecutable, pnpm, ROOT } from "./hostinger-pnpm.mjs";

console.log("Hostinger install starting…");
ensurePnpm();
// Skip lifecycle scripts until binaries are executable. Node 24 extracts them as mode 644.
pnpm("install --frozen-lockfile --config.minimumReleaseAge=0 --ignore-scripts");
makePackageBinsExecutable(ROOT);
pnpm("rebuild");
console.log("Hostinger install complete.");
