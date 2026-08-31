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

const requiredEnv = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "ENCRYPTION_KEY",
  "APP_URL",
];
const missing = requiredEnv.filter((key) => !process.env[key]?.trim());
if (missing.length) {
  console.error(
    `[start] Missing required environment variables: ${missing.join(", ")}\n` +
      "Add them in hPanel → Node.js App → Environment Variables, then redeploy.\n" +
      "Import hostinger.env.example from the repo and set DATABASE_URL + SMTP.",
  );
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL?.trim() ?? "";
if (/USER:PASSWORD|REPLACE_WITH|postgresql:\/\/USER@|@HOST:/i.test(dbUrl)) {
  console.error(
    "[start] DATABASE_URL is still a placeholder.\n" +
      "Create free PostgreSQL at https://neon.tech and paste the connection string in hPanel env vars.",
  );
  process.exit(1);
}

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
