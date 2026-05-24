import { Router } from "express";
import { db, usersTable, mt5RequestsTable, eaSubscriptionsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, requireSuperAdmin } from "../middlewares/auth";
import { siteSettingsTable } from "@workspace/db";

const router = Router();

router.use(requireAuth, requireSuperAdmin);

// ── Dashboard Stats ──────────────────────────────────────────────────────────
router.get("/stats", async (_req, res) => {
  const [users, mt5Requests, eaSubs] = await Promise.all([
    db.select().from(usersTable),
    db.select().from(mt5RequestsTable).orderBy(desc(mt5RequestsTable.createdAt)),
    db.select().from(eaSubscriptionsTable),
  ]);

  const admins    = users.filter(u => u.role === "admin").length;
  const managers  = users.filter(u => u.role === "manager").length;
  const investors = users.filter(u => u.role === "user").length;
  const pending   = mt5Requests.filter(r => r.status === "pending").length;
  const forwarded = mt5Requests.filter(r => r.status === "forwarded").length;
  const activeEA  = eaSubs.filter(s => s.status === "active").length;

  res.json({ totalUsers: users.length, admins, managers, investors, pendingMt5Requests: pending, forwardedMt5Requests: forwarded, activeEASubscriptions: activeEA });
});

// ── Manage All Users ─────────────────────────────────────────────────────────
router.get("/users", async (_req, res) => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(users.map(u => ({
    id: u.id, email: u.email, fullName: u.fullName, role: u.role,
    kycStatus: u.kycStatus, isActive: u.isActive, createdAt: u.createdAt,
  })));
});

router.patch("/users/:id/role", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { role } = req.body;
  if (!["user","manager","admin","superadmin"].includes(role)) {
    res.status(400).json({ error: "Invalid role" }); return;
  }
  await db.update(usersTable).set({ role }).where(eq(usersTable.id, id));
  res.json({ message: "Role updated" });
});

// ── MT5 Relay Requests ───────────────────────────────────────────────────────
router.get("/mt5-requests", async (_req, res) => {
  const requests = await db.select().from(mt5RequestsTable).orderBy(desc(mt5RequestsTable.createdAt));
  res.json(requests);
});

router.post("/mt5-requests/:id/forward", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [request] = await db.select().from(mt5RequestsTable).where(eq(mt5RequestsTable.id, id)).limit(1);
  if (!request) { res.status(404).json({ error: "Not found" }); return; }

  // Get configured external endpoint from site settings
  const [setting] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, "mt5_external_endpoint")).limit(1);
  const externalUrl = setting?.value;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, request.userId)).limit(1);

  // ── Call Trade Copier API for copy_trading requests ──────────────────────
  if (request.type === "copy_trading") {
    try {
      const { registerSlave } = await import("../helpers/tradeCopier");
      const platform = request.details?.match(/Platform:\s*(MT[45])/i)?.[1]?.toLowerCase() || "mt5";
      await registerSlave({
        slaveLogin: String(request.mt5AccountId || request.userId),
        slaveName: user?.fullName || `User #${request.userId}`,
        profitSharingPercent: request.profitSharingPercent ?? 20,
        platform,
        details: request.details || "",
      });
    } catch { /* Trade Copier API unavailable — continue */ }
  }

  // ── Forward to external relay endpoint if configured ─────────────────────
  if (externalUrl) {
    try {
      const payload = {
        requestId: request.id,
        type: request.type,
        userId: request.userId,
        userEmail: user?.email,
        userName: user?.fullName,
        mt5AccountId: request.mt5AccountId,
        profitSharingPercent: request.profitSharingPercent,
        details: request.details,
        timestamp: new Date().toISOString(),
      };
      await fetch(externalUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch { /* External endpoint unreachable — still mark as forwarded */ }
  }

  await db.update(mt5RequestsTable)
    .set({ status: "forwarded", forwardedAt: new Date() })
    .where(eq(mt5RequestsTable.id, id));
  res.json({ message: "Request forwarded" });
});

router.patch("/mt5-requests/:id/status", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { status, externalResponse } = req.body;
  await db.update(mt5RequestsTable)
    .set({ status, externalResponse: externalResponse || null })
    .where(eq(mt5RequestsTable.id, id));
  res.json({ message: "Status updated" });
});

// ── External MT5 Endpoint Config ─────────────────────────────────────────────
router.get("/settings/mt5-endpoint", async (_req, res) => {
  const [setting] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, "mt5_external_endpoint")).limit(1);
  res.json({ endpoint: setting?.value || "" });
});

router.post("/settings/mt5-endpoint", async (req, res) => {
  const endpoint = String(req.body.endpoint ?? "");
  const existing = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, "mt5_external_endpoint")).limit(1);
  if (existing.length > 0) {
    await db.update(siteSettingsTable).set({ value: endpoint }).where(eq(siteSettingsTable.key, "mt5_external_endpoint"));
  } else {
    await db.insert(siteSettingsTable).values({ key: "mt5_external_endpoint", value: endpoint, label: "MT5 External Endpoint", category: "mt5" });
  }
  res.json({ message: "MT5 external endpoint updated" });
});

// ── Trade Copier API Settings ─────────────────────────────────────────────────
router.get("/settings/trade-copier", async (_req, res) => {
  const { getTradeCopierConfig } = await import("../helpers/tradeCopier");
  const cfg = await getTradeCopierConfig();
  res.json({ ...cfg, password: cfg.password ? "••••••••" : "", apiKey: cfg.apiKey ? "••••••••" : "" });
});

router.post("/settings/trade-copier", async (req, res) => {
  const { saveTradeCopierConfig, getTradeCopierConfig } = await import("../helpers/tradeCopier");
  const existing = await getTradeCopierConfig();
  const { baseUrl, authType, apiKey, username, password, masterAccountId } = req.body;
  await saveTradeCopierConfig({
    baseUrl: baseUrl ?? existing.baseUrl,
    authType: authType ?? existing.authType,
    apiKey: (apiKey && apiKey !== "••••••••") ? apiKey : existing.apiKey,
    username: username ?? existing.username,
    password: (password && password !== "••••••••") ? password : existing.password,
    masterAccountId: masterAccountId ?? existing.masterAccountId,
  });
  res.json({ message: "Trade Copier API settings saved" });
});

router.post("/settings/trade-copier/test", async (_req, res) => {
  const { testTradeCopierConnection } = await import("../helpers/tradeCopier");
  const result = await testTradeCopierConnection();
  res.json(result);
});

router.get("/settings/trade-copier/slaves", async (_req, res) => {
  const { listSlaves } = await import("../helpers/tradeCopier");
  const result = await listSlaves();
  res.json(result);
});

// ── EA Subscriptions Overview ────────────────────────────────────────────────
router.get("/ea-subscriptions", async (_req, res) => {
  const subs = await db.select().from(eaSubscriptionsTable).orderBy(desc(eaSubscriptionsTable.createdAt));
  res.json(subs);
});

export default router;
