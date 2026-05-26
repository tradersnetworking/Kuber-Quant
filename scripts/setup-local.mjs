/**
 * First-time local setup: ensure .env exists and print next steps.
 */
import { copyFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const examplePath = resolve(root, ".env.example");

if (!existsSync(envPath)) {
  copyFileSync(examplePath, envPath);
  console.log("Created .env from .env.example");
} else {
  console.log(".env already exists");
}

console.log(`
Local setup next steps:

  1. Edit .env — confirm DATABASE_URL points to your PostgreSQL database
  2. pnpm db:push
  3. pnpm db:seed        (optional demo data)
  4. pnpm dev            API http://127.0.0.1:8080  Web http://127.0.0.1:3000

Production-style run (after build):

  pnpm build
  pnpm start
`);
