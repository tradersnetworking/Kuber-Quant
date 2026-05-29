/**
 * Hostinger Node.js entry file.
 * Starts the bundled Express API, which also serves the built React SPA.
 */
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

process.env.NODE_ENV = process.env.NODE_ENV || "production";

const webDist =
  process.env.WEB_DIST ||
  resolve(__dirname, "artifacts/trading-platform/dist/public");
process.env.WEB_DIST = webDist;

const indexHtml = resolve(webDist, "index.html");
if (!existsSync(indexHtml)) {
  console.error(
    `[start] Missing frontend build at ${indexHtml}\n` +
      "Run: pnpm build:prod\n" +
      "For local development use: pnpm dev  (open http://127.0.0.1:3000)",
  );
  process.exit(1);
}

const apiEntry = resolve(__dirname, "artifacts/api-server/dist/index.mjs");
if (!existsSync(apiEntry)) {
  console.error(
    `[start] Missing API build at ${apiEntry}\nRun: pnpm build:api`,
  );
  process.exit(1);
}

await import(pathToFileURL(apiEntry).href);
