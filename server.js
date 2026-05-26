/**
 * Hostinger Node.js entry file.
 * Starts the bundled Express API, which also serves the built React SPA.
 */
import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

process.env.WEB_DIST =
  process.env.WEB_DIST ||
  resolve(__dirname, "artifacts/trading-platform/dist/public");

const entry = resolve(__dirname, "artifacts/api-server/dist/index.mjs");
await import(pathToFileURL(entry).href);
