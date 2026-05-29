import { defineConfig } from "drizzle-kit";
import path from "path";
import { readFileSync, existsSync } from "fs";

const rootEnv = path.resolve(__dirname, "../../.env");
if (!process.env.DATABASE_URL && existsSync(rootEnv)) {
  for (const line of readFileSync(rootEnv, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!process.env[key]) {
      process.env[key] = trimmed.slice(eq + 1).trim();
    }
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: "./src/schema/*.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
