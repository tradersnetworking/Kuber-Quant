#!/usr/bin/env node
/**
 * Route smoke test — validates registry + nav-config paths appear in App route definitions.
 * Run: node scripts/validate-routes.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const appSrc = readFileSync(join(root, "src/App.tsx"), "utf8");
const investorSrc = readFileSync(join(root, "src/routes/investor-routes.tsx"), "utf8");
const registrySrc = readFileSync(join(root, "src/routes/registry.ts"), "utf8");
const navSrc = readFileSync(join(root, "src/lib/nav-config.ts"), "utf8");

const pathPattern = /path:\s*"([^"]+)"/g;
const registryPaths = [];
let m;
while ((m = pathPattern.exec(registrySrc))) {
  const p = m[1];
  if (!p.includes(":") && !p.includes("*")) registryPaths.push(p);
}

const routeSources = appSrc + investorSrc;

function routeExists(p) {
  if (p === "/super-admin/:tab") return routeSources.includes('path="/super-admin/:tab"');
  if (p === "/admin/:rest*") return routeSources.includes('path="/admin/:rest*');
  if (p.startsWith("/super-admin/")) {
    const tab = p.replace("/super-admin/", "");
    return routeSources.includes('path="/super-admin/:tab"') && navSrc.includes(`"${tab}"`);
  }
  if (p === "/super-admin") {
    return routeSources.includes('path="/super-admin"');
  }
  return routeSources.includes(`path="${p}"`);
}

const missingRegistry = registryPaths.filter((p) => !routeExists(p));

const navHrefPattern = /href:\s*"(\/[^"]+)"/g;
const navHrefs = new Set();
while ((m = navHrefPattern.exec(navSrc))) {
  const href = m[1];
  if (!href.includes("#")) navHrefs.add(href);
}

const missingNav = [...navHrefs].filter((href) => !routeExists(href));

let failed = false;

if (missingRegistry.length) {
  failed = true;
  console.error("Route registry paths missing from App/investor routes:");
  for (const p of missingRegistry) console.error("  -", p);
}

if (missingNav.length) {
  failed = true;
  console.error("Nav-config hrefs missing from App/investor routes:");
  for (const p of missingNav) console.error("  -", p);
}

if (failed) process.exit(1);

console.log(
  `OK — ${registryPaths.length} registry paths + ${navHrefs.size} nav hrefs verified`,
);
