import { Router } from "express";
import { db, mt5RequestsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { getMt5RelayFormConfig } from "../helpers/mt5RelayFormSettings";
import { buildMt5RelayDetails, validateMt5RelayPayload } from "../lib/mt5RelayFormConfig";
import { generateAgreement } from "../helpers/agreementEngine";
import { linkMtTradingAccount, getLatestMtAccountForUser, getMtTradingPassword } from "../helpers/mtAccountLink";

const router = Router();

router.get("/form-config", requireAuth, async (_req, res) => {
  res.json(await getMt5RelayFormConfig());
});

// Submit a copy-trading or account-handling request
router.post("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const config = await getMt5RelayFormConfig();
  const {
    type,
    mt5AccountId,
    accountNumber,
    platform,
    brokerName,
    serverName,
    profitSharingPercent,
    details,
    tradingPassword,
  } = req.body;

  if (!type || !["copy_trading", "account_handling"].includes(type)) {
    res.status(400).json({ error: "type must be copy_trading or account_handling" }); return;
  }

  const validationError = validateMt5RelayPayload(req.body, config);
  if (validationError) {
    res.status(400).json({ error: validationError }); return;
  }

  const accountRaw = accountNumber ?? mt5AccountId;
  let linkedAccountId: number | null = null;

  if (accountRaw != null && String(accountRaw).trim() && brokerName && serverName && tradingPassword) {
    try {
      const linked = await linkMtTradingAccount(userId, {
        accountNumber: String(accountRaw).trim(),
        broker: String(brokerName).trim(),
        serverName: String(serverName).trim(),
        platform: platform === "mt4" ? "mt4" : "mt5",
        tradingPassword: String(tradingPassword),
      });
      linkedAccountId = linked.id;
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to link MT account" });
      return;
    }
  } else if (mt5AccountId != null && String(mt5AccountId).trim()) {
    const parsedId = parseInt(String(mt5AccountId), 10);
    if (!Number.isNaN(parsedId)) linkedAccountId = parsedId;
  }

  const [request] = await db.insert(mt5RequestsTable).values({
    userId,
    mt5AccountId: linkedAccountId,
    type,
    profitSharingPercent: profitSharingPercent ?? config.profitSharing.default,
    details: buildMt5RelayDetails({ platform, brokerName, serverName, details }) || null,
    status: "pending",
  }).returning();

  generateAgreement({
    userId,
    type: type === "account_handling" ? "account_handling" : "copy_trading",
    triggerEvent: "mt5_relay_submitted",
    triggerEntityId: request.id,
    ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket?.remoteAddress || undefined,
    userAgent: req.headers["user-agent"] || "",
  }).catch(() => {});

  res.status(201).json({ ...request, createdAt: request.createdAt.toISOString() });
});

// Get user's own requests
router.get("/my", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const requests = await db.select().from(mt5RequestsTable)
    .where(eq(mt5RequestsTable.userId, userId))
    .orderBy(desc(mt5RequestsTable.createdAt));
  res.json(requests.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

export default router;
