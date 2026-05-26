#!/usr/bin/env node
/**
 * Deploy Kuber Quant to Hostinger VPS via Docker Manager API.
 *
 * Required env vars:
 *   HOSTINGER_API_KEY  — from hPanel → Profile → API
 *   HOSTINGER_VM_ID    — numeric ID from srv123456.hstgr.cloud → 123456
 *
 * Required production env (from .env or shell):
 *   DATABASE_URL, SESSION_SECRET, ENCRYPTION_KEY, APP_URL, API_URL, CORS_ORIGINS
 *   SMTP_USER, SMTP_PASS, SMTP_FROM (recommended)
 *
 * Usage:
 *   node --env-file=.env scripts/deploy-hostinger.mjs
 *   node --env-file=.env scripts/deploy-hostinger.mjs --project-name kuber-quant
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const API_BASE = "https://developers.hostinger.com/api/vps/v1";

const REQUIRED = [
  "HOSTINGER_API_KEY",
  "HOSTINGER_VM_ID",
  "DATABASE_URL",
  "SESSION_SECRET",
  "ENCRYPTION_KEY",
  "APP_URL",
  "API_URL",
  "CORS_ORIGINS",
];

const DEPLOY_ENV_KEYS = [
  "NODE_ENV",
  "PORT",
  "WEB_DIST",
  "UPLOAD_DIR",
  "DATABASE_URL",
  "SESSION_SECRET",
  "ENCRYPTION_KEY",
  "JWT_EXPIRES_IN",
  "JWT_REFRESH_EXPIRES_IN",
  "APP_URL",
  "API_URL",
  "CORS_ORIGINS",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "PHONEPE_MERCHANT_ID",
  "PHONEPE_SALT_KEY",
  "PHONEPE_SALT_INDEX",
  "PHONEPE_ENV",
  "PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
  "PAYPAL_MODE",
  "PAYU_MERCHANT_KEY",
  "PAYU_MERCHANT_SALT",
  "PAYU_ENV",
  "VITE_GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_ID",
];

function parseArgs() {
  const args = process.argv.slice(2);
  let projectName = "kuber-quant";
  let githubUrl = "";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--project-name" && args[i + 1]) projectName = args[++i];
    if (args[i] === "--github" && args[i + 1]) githubUrl = args[++i];
  }
  return { projectName, githubUrl };
}

function missingEnv() {
  return REQUIRED.filter(key => !process.env[key]?.trim());
}

function buildEnvironmentBlock() {
  const lines = DEPLOY_ENV_KEYS
    .filter(key => process.env[key]?.trim())
    .map(key => `${key}=${process.env[key].trim()}`);
  if (!lines.some(l => l.startsWith("NODE_ENV="))) {
    lines.unshift("NODE_ENV=production");
  }
  if (!lines.some(l => l.startsWith("PORT="))) {
    lines.push("PORT=8080");
  }
  return lines.join("\n");
}

async function deploy({ projectName, githubUrl }) {
  const missing = missingEnv();
  if (missing.length) {
    console.error("Missing required environment variables:");
    missing.forEach(k => console.error(`  - ${k}`));
    console.error("\nAdd them to .env, then run:");
    console.error("  node --env-file=.env scripts/deploy-hostinger.mjs");
    console.error("\nGet HOSTINGER_API_KEY from hPanel → Profile → API");
    console.error("Get HOSTINGER_VM_ID from your VPS hostname srv123456.hstgr.cloud → 123456");
    process.exit(1);
  }

  const vmId = process.env.HOSTINGER_VM_ID.trim();
  const apiKey = process.env.HOSTINGER_API_KEY.trim();
  const composePath = resolve(root, "docker-compose.yml");

  let content;
  if (githubUrl) {
    content = githubUrl.trim();
    console.log(`Deploying from GitHub: ${content}`);
  } else {
    content = readFileSync(composePath, "utf8");
    console.log(`Deploying docker-compose from ${composePath}`);
  }

  const body = {
    projectName,
    content,
    environment: buildEnvironmentBlock(),
  };

  const url = `${API_BASE}/virtual-machines/${encodeURIComponent(vmId)}/docker`;
  console.log(`POST ${url} (project: ${projectName})`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    console.error("Hostinger API deploy failed:", res.status, res.statusText);
    console.error(JSON.stringify(json, null, 2));
    process.exit(1);
  }

  console.log("Deploy accepted by Hostinger VPS Docker Manager.");
  console.log(JSON.stringify(json, null, 2));
  console.log("\nNext steps:");
  console.log("1. Open hPanel → VPS → Docker Manager and confirm the project is running.");
  console.log("2. Point your domain A record to the VPS IP.");
  console.log(`3. Visit ${process.env.APP_URL} after containers are healthy.`);
  console.log("4. Run database migrations once: pnpm db:push (via SSH) if tables are empty.");
}

const opts = parseArgs();
deploy(opts).catch(err => {
  console.error(err);
  process.exit(1);
});
