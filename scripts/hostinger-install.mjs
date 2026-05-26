/**
 * Hostinger dependency install — avoids Corepack (broken on alt-nodejs with dynamic import).
 * Use as the Install command in hPanel, or let hostinger-build.mjs call this first.
 *
 * hPanel: set Package manager to npm (not pnpm), then use this as Install command.
 */
import { ensurePnpm, pnpm } from "./hostinger-pnpm.mjs";

console.log("Hostinger install starting…");
ensurePnpm();
pnpm("install --frozen-lockfile --config.minimumReleaseAge=0");
console.log("Hostinger install complete.");
