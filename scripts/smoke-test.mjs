#!/usr/bin/env node
/**
 * Post-deploy smoke test — public endpoints + authenticated role dashboards.
 * Usage: node scripts/smoke-test.mjs [baseUrl]
 *
 * Env:
 *   SMOKE_TEST_URL          — API base (default http://127.0.0.1:8080)
 *   SMOKE_TEST_TIMEOUT_MS   — per-request timeout (default 15000)
 *   SMOKE_TEST_SKIP_AUTH    — set "true" to skip login checks
 */
const baseUrl = (process.argv[2] || process.env.SMOKE_TEST_URL || "http://127.0.0.1:8080").replace(/\/+$/, "");
const timeoutMs = Number(process.env.SMOKE_TEST_TIMEOUT_MS || 15000);
const skipAuth = process.env.SMOKE_TEST_SKIP_AUTH === "true";

const DEMO_USERS = [
  { role: "superadmin", email: "superadmin@kuberquant.com", password: "superadmin123" },
  { role: "admin", email: "admin@kuberquant.com", password: "admin123" },
  { role: "manager", email: "manager@kuberquant.com", password: "manager123" },
  { role: "support", email: "support@kuberquant.com", password: "support123" },
  { role: "investor", email: "user@kuberquant.com", password: "user123" },
];

const publicChecks = [
  { name: "healthz", path: "/api/healthz", expectJson: true },
  { name: "branding", path: "/api/branding", expectJson: true },
  { name: "public-stats", path: "/api/public-stats", expectJson: true },
  { name: "maintenance", path: "/api/maintenance", expectJson: true },
  { name: "market-config", path: "/api/market/config", expectJson: true },
];

async function fetchJson(path, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl}${path}`, { ...init, signal: controller.signal });
    const body = await res.json().catch(() => null);
    return { res, body };
  } finally {
    clearTimeout(timer);
  }
}

async function login(email, password) {
  const { res, body } = await fetchJson("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`login ${email}: HTTP ${res.status} ${body?.error || ""}`);
  if (body?.requiresTwoFactor) throw new Error(`login ${email}: 2FA required (disable for smoke user or use trusted device)`);
  if (!body?.token) throw new Error(`login ${email}: no token in response`);
  return body.token;
}

async function authedGet(token, path) {
  const { res, body } = await fetchJson(path, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status} ${body?.error || ""}`);
  if (body == null || typeof body !== "object") throw new Error(`${path}: expected JSON object`);
  return body;
}

const ROLE_ENDPOINTS = {
  superadmin: [
    { name: "stats", path: "/api/super-admin/stats?period=present" },
    { name: "treasury", path: "/api/super-admin/treasury" },
    { name: "investments", path: "/api/super-admin/investments" },
  ],
  admin: [
    { name: "stats", path: "/api/admin/stats?period=present" },
    { name: "analytics", path: "/api/admin/analytics" },
    { name: "treasury", path: "/api/admin/treasury" },
  ],
  manager: [
    { name: "stats", path: "/api/manager/stats" },
    { name: "analytics", path: "/api/manager/analytics" },
    { name: "clients", path: "/api/manager/clients" },
  ],
  support: [
    { name: "stats", path: "/api/support-team/stats" },
    { name: "tickets", path: "/api/support-team/tickets" },
    { name: "kyc", path: "/api/support-team/kyc" },
  ],
  investor: [
    { name: "dashboard-summary", path: "/api/dashboard/summary" },
    { name: "wallet", path: "/api/wallet" },
    { name: "investments", path: "/api/investments" },
  ],
};

async function main() {
  console.log(`Smoke test against ${baseUrl}`);
  const results = [];

  for (const check of publicChecks) {
    try {
      const { res, body } = await fetchJson(check.path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (check.expectJson && (body == null || typeof body !== "object")) {
        throw new Error("expected JSON object");
      }
      results.push({ name: check.name, ok: true });
      console.log(`  ✓ ${check.name}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ name: check.name, ok: false, message });
      console.error(`  ✗ ${check.name}: ${message}`);
    }
  }

  if (!skipAuth) {
    for (const user of DEMO_USERS) {
      try {
        const token = await login(user.email, user.password);
        const endpoints = ROLE_ENDPOINTS[user.role] || [];
        for (const ep of endpoints) {
          await authedGet(token, ep.path);
          const label = `${user.role}:${ep.name}`;
          results.push({ name: label, ok: true });
          console.log(`  ✓ ${label}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({ name: `${user.role}:auth`, ok: false, message });
        console.error(`  ✗ ${user.role}: ${message}`);
      }
    }
  } else {
    console.log("  (skipping authenticated checks — SMOKE_TEST_SKIP_AUTH=true)");
  }

  const failed = results.filter(r => !r.ok);
  if (failed.length > 0) {
    console.error(`\nSmoke test failed (${failed.length}/${results.length})`);
    process.exit(1);
  }
  console.log(`\nSmoke test passed (${results.length}/${results.length})`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
