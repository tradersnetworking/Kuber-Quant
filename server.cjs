"use strict";
/**
 * Hostinger Node.js entry file (CommonJS).
 * lsnode require() cannot load ESM — use this file in hPanel.
 * Starts the bundled Express API, which also serves the built React SPA.
 */
const { existsSync } = require("node:fs");
const { pathToFileURL } = require("node:url");
const { resolve } = require("node:path");

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
      "Set your Supabase PostgreSQL connection string in hPanel env vars (see hostinger.env.example).",
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

if (process.env.HOSTINGER_SKIP_DB_INIT !== "1") {
  const { execSync } = require("node:child_process");
  try {
    const seedFlag =
      process.env.HOSTINGER_AUTO_SEED === "1" ||
      (process.env.HOSTINGER_AUTO_SEED !== "0" && process.env.BOOTSTRAP_USERS !== "false")
        ? " --seed"
        : "";
    execSync(`node scripts/hostinger-db-init.mjs${seedFlag}`, {
      cwd: __dirname,
      stdio: "inherit",
      env: process.env,
    });
  } catch (err) {
    console.error(
      "[start] Database init failed — run manually: pnpm db:push && ALLOW_SEED=true pnpm exec tsx scripts/src/seed.ts",
    );
    console.error(err instanceof Error ? err.message : err);
  }
}

import(pathToFileURL(apiEntry).href).catch((err) => {
  console.error("[start] Failed to load API:", err);
  process.exit(1);
});
