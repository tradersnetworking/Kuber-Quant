import { Router } from "express";
import { db, eaStrategiesTable, eaSubscriptionsTable, usersTable } from "@workspace/db";
import { eq, or, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { randomBytes } from "crypto";
import { linkMtTradingAccount, validateMtTradingCredentials } from "../helpers/mtAccountLink";
import { generateAgreement } from "../helpers/agreementEngine";

const router = Router();

function mapEA(s: any) {
  return {
    id: s.id,
    userId: s.userId,
    name: s.name,
    description: s.description,
    type: s.type,
    backtestRoi: s.backtestRoi ? Number(s.backtestRoi) : null,
    winRate: s.winRate ? Number(s.winRate) : null,
    status: s.status,
    isPublic: s.isPublic,
    createdAt: s.createdAt.toISOString(),
  };
}

export const EA_CATALOG = [
  { id: 1001, name: "Golden Scalper Pro", type: "scalping", description: "High-frequency scalping on XAUUSD with dynamic spread filter and session-based entries.", backtestRoi: 84.2, winRate: 73.5, pairs: "XAUUSD", timeframe: "M1/M5", platform: "mt5", priceMonthly: 49, priceQuarterly: 129, priceBiannual: 229, priceAnnual: 399, riskLevel: "High", category: "Gold" },
  { id: 1002, name: "FX Trend Hunter", type: "trend", description: "Multi-timeframe trend following strategy with ATR-based stops and trailing exits.", backtestRoi: 62.1, winRate: 68.2, pairs: "EURUSD, GBPUSD, USDJPY", timeframe: "H1/H4", platform: "mt5", priceMonthly: 39, priceQuarterly: 99, priceBiannual: 179, priceAnnual: 299, riskLevel: "Medium", category: "Forex" },
  { id: 1003, name: "Grid Master Elite", type: "grid", description: "Adaptive grid system with auto lot-sizing and drawdown protection for ranging markets.", backtestRoi: 71.8, winRate: 81.3, pairs: "EURUSD, GBPUSD", timeframe: "M15/H1", platform: "mt5", priceMonthly: 55, priceQuarterly: 145, priceBiannual: 259, priceAnnual: 449, riskLevel: "Medium", category: "Grid" },
  { id: 1004, name: "Breakout Momentum", type: "swing", description: "London and New York session breakout strategy with false-breakout filter and news avoidance.", backtestRoi: 55.4, winRate: 64.7, pairs: "GBPUSD, EURUSD, USDJPY", timeframe: "M30/H1", platform: "mt5", priceMonthly: 35, priceQuarterly: 89, priceBiannual: 159, priceAnnual: 259, riskLevel: "Medium", category: "Breakout" },
  { id: 1005, name: "Crypto Algo Trader", type: "trend", description: "Bitcoin and Ethereum trend following with volume confirmation and exchange arbitrage signals.", backtestRoi: 112.3, winRate: 61.2, pairs: "BTCUSD, ETHUSD", timeframe: "H1/H4", platform: "mt5", priceMonthly: 69, priceQuarterly: 179, priceBiannual: 319, priceAnnual: 549, riskLevel: "Very High", category: "Crypto" },
  { id: 1006, name: "Ichimoku Samurai", type: "swing", description: "Full Ichimoku system with cloud breakouts, Kijun/Tenkan crosses and Chikou confirmation.", backtestRoi: 48.9, winRate: 71.4, pairs: "USDJPY, EURJPY, GBPJPY", timeframe: "H4/D1", platform: "mt5", priceMonthly: 29, priceQuarterly: 75, priceBiannual: 135, priceAnnual: 219, riskLevel: "Low", category: "Forex" },
  { id: 1007, name: "News Trading Bot", type: "scalping", description: "Automatically detects high-impact news events and places bracket orders 30 seconds before release.", backtestRoi: 93.6, winRate: 58.1, pairs: "EURUSD, GBPUSD, USDJPY", timeframe: "M1", platform: "mt5", priceMonthly: 79, priceQuarterly: 209, priceBiannual: 369, priceAnnual: 639, riskLevel: "Very High", category: "News" },
  { id: 1008, name: "RSI Reversal Engine", type: "swing", description: "Mean-reversion strategy using divergence-filtered RSI signals with Fibonacci entry zones.", backtestRoi: 44.7, winRate: 74.8, pairs: "EURUSD, GBPUSD, AUDUSD", timeframe: "H1/H4", platform: "mt5", priceMonthly: 33, priceQuarterly: 85, priceBiannual: 149, priceAnnual: 239, riskLevel: "Low", category: "Reversal" },
  { id: 1009, name: "MACD Divergence Pro", type: "swing", description: "MACD hidden and regular divergence scanner with automated trade management.", backtestRoi: 51.2, winRate: 70.6, pairs: "EURUSD, USDJPY, GBPUSD", timeframe: "H1/H4", platform: "mt5", priceMonthly: 31, priceQuarterly: 79, priceBiannual: 139, priceAnnual: 229, riskLevel: "Low", category: "Indicator" },
  { id: 1010, name: "Fibonacci Sniper", type: "swing", description: "Automated Fibonacci retracement and extension trader with confluence zone detection.", backtestRoi: 58.3, winRate: 67.9, pairs: "All Major Pairs", timeframe: "H1/H4/D1", platform: "mt5", priceMonthly: 41, priceQuarterly: 105, priceBiannual: 189, priceAnnual: 319, riskLevel: "Medium", category: "Fibonacci" },
  { id: 1011, name: "Smart Money Tracker", type: "trend", description: "Tracks institutional order flow using market structure, breaker blocks and order blocks.", backtestRoi: 67.4, winRate: 69.3, pairs: "EURUSD, GBPUSD, XAUUSD", timeframe: "M15/H1", platform: "mt5", priceMonthly: 59, priceQuarterly: 155, priceBiannual: 279, priceAnnual: 479, riskLevel: "Medium", category: "ICT/SMC" },
  { id: 1012, name: "Volatility Harvester", type: "grid", description: "Captures profit from high-volatility pairs using dynamic grid spacing and volatility-adjusted lot sizes.", backtestRoi: 78.9, winRate: 79.1, pairs: "GBPJPY, GBPUSD, EURJPY", timeframe: "M15/H1", platform: "mt5", priceMonthly: 47, priceQuarterly: 119, priceBiannual: 215, priceAnnual: 369, riskLevel: "High", category: "Grid" },
  { id: 1013, name: "Carry Trade Optimizer", type: "swing", description: "Exploits interest rate differentials with carry trade positions and hedging filters.", backtestRoi: 32.4, winRate: 82.6, pairs: "AUD/JPY, NZD/JPY, USD/TRY", timeframe: "D1/W1", platform: "mt5", priceMonthly: 27, priceQuarterly: 69, priceBiannual: 125, priceAnnual: 199, riskLevel: "Low", category: "Carry Trade" },
  { id: 1014, name: "Harmonic Pattern Trader", type: "swing", description: "Detects Gartley, Bat, Butterfly, Crab and Cypher harmonic patterns automatically.", backtestRoi: 53.7, winRate: 66.2, pairs: "EURUSD, GBPUSD, AUDUSD, XAUUSD", timeframe: "H1/H4", platform: "mt5", priceMonthly: 45, priceQuarterly: 115, priceBiannual: 209, priceAnnual: 349, riskLevel: "Medium", category: "Harmonic" },
  { id: 1015, name: "Bollinger Band Sniper", type: "scalping", description: "Mean reversion scalper using Bollinger Band squeezes and dynamic support/resistance.", backtestRoi: 61.8, winRate: 72.4, pairs: "EURUSD, USDJPY", timeframe: "M5/M15", platform: "mt5", priceMonthly: 37, priceQuarterly: 95, priceBiannual: 169, priceAnnual: 279, riskLevel: "Medium", category: "Scalping" },
  { id: 1016, name: "US30 Index Scalper", type: "scalping", description: "Specialized Dow Jones scalper with session filters, VIX-based risk management.", backtestRoi: 89.1, winRate: 65.8, pairs: "US30", timeframe: "M1/M5", platform: "mt5", priceMonthly: 65, priceQuarterly: 169, priceBiannual: 299, priceAnnual: 519, riskLevel: "High", category: "Indices" },
  { id: 1017, name: "Multi-Currency Arbitrage", type: "arbitrage", description: "Triangular arbitrage system across correlated currency pairs with latency compensation.", backtestRoi: 28.6, winRate: 91.2, pairs: "EUR/USD/GBP triangles", timeframe: "M1", platform: "mt5", priceMonthly: 89, priceQuarterly: 239, priceBiannual: 429, priceAnnual: 749, riskLevel: "Low", category: "Arbitrage" },
  { id: 1018, name: "AI Pattern Recognition", type: "trend", description: "Machine learning-based candlestick pattern recognition with 47 pattern types.", backtestRoi: 74.3, winRate: 70.1, pairs: "All Majors + XAUUSD", timeframe: "H1/H4", platform: "mt5", priceMonthly: 75, priceQuarterly: 199, priceBiannual: 359, priceAnnual: 619, riskLevel: "Medium", category: "AI/ML" },
  { id: 1019, name: "Crude Oil Scalper", type: "scalping", description: "Energy commodity scalper optimized for USOIL with inventory data reaction and session timing.", backtestRoi: 81.5, winRate: 67.3, pairs: "USOIL, UKOIL", timeframe: "M5/M15", platform: "mt5", priceMonthly: 55, priceQuarterly: 145, priceBiannual: 259, priceAnnual: 449, riskLevel: "High", category: "Commodities" },
  { id: 1020, name: "NAS100 Momentum Rider", type: "trend", description: "NASDAQ 100 trend trader with earnings season filters and pre-market gap strategies.", backtestRoi: 98.7, winRate: 63.4, pairs: "NAS100", timeframe: "M15/H1", platform: "mt5", priceMonthly: 71, priceQuarterly: 189, priceBiannual: 339, priceAnnual: 589, riskLevel: "High", category: "Indices" },
  { id: 1021, name: "Silver & Gold Spread", type: "arbitrage", description: "Gold-Silver ratio arbitrage with mean reversion entries and spread normalization exits.", backtestRoi: 41.2, winRate: 85.7, pairs: "XAUUSD, XAGUSD", timeframe: "H1/H4", platform: "mt5", priceMonthly: 43, priceQuarterly: 109, priceBiannual: 199, priceAnnual: 329, riskLevel: "Low", category: "Precious Metals" },
  { id: 1022, name: "Asian Session Ranger", type: "grid", description: "Asian session range identification and breakout system for quiet market conditions.", backtestRoi: 49.3, winRate: 78.9, pairs: "USDJPY, AUDUSD, NZDUSD", timeframe: "H1/H4", platform: "mt5", priceMonthly: 33, priceQuarterly: 85, priceBiannual: 149, priceAnnual: 239, riskLevel: "Low", category: "Session" },
  { id: 1023, name: "London Open Sniper", type: "scalping", description: "London open momentum strategy targeting the first 2-hour breakout with tight stops.", backtestRoi: 69.8, winRate: 71.6, pairs: "GBPUSD, EURUSD, GBPJPY", timeframe: "M15/M30", platform: "mt5", priceMonthly: 45, priceQuarterly: 115, priceBiannual: 209, priceAnnual: 349, riskLevel: "Medium", category: "Session" },
  { id: 1024, name: "DXY Correlator", type: "trend", description: "Trades currency pairs inversely correlated to the US Dollar Index with macro filters.", backtestRoi: 57.9, winRate: 69.8, pairs: "EURUSD, XAUUSD, AUDUSD", timeframe: "H4/D1", platform: "mt5", priceMonthly: 37, priceQuarterly: 95, priceBiannual: 169, priceAnnual: 279, riskLevel: "Low", category: "Macro" },
  { id: 1025, name: "Night Owl Scalper", type: "scalping", description: "Low-volatility overnight scalper active during Sydney/Tokyo overlap with minimal drawdown.", backtestRoi: 38.4, winRate: 83.2, pairs: "AUDJPY, AUDUSD, NZDUSD", timeframe: "M15", platform: "mt5", priceMonthly: 29, priceQuarterly: 75, priceBiannual: 135, priceAnnual: 219, riskLevel: "Very Low", category: "Scalping" },
];

router.get("/catalog", requireAuth, async (_req, res) => {
  const { getEaCatalog } = await import("../helpers/eaCatalog");
  res.json(await getEaCatalog());
});

router.get("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const strategies = await db.select().from(eaStrategiesTable)
    .where(or(eq(eaStrategiesTable.isPublic, true), eq(eaStrategiesTable.userId, userId)));
  res.json(strategies.map(mapEA));
});

router.post("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { name, description, type, isPublic } = req.body;
  if (!name || !description || !type) {
    res.status(400).json({ error: "name, description, type are required" });
    return;
  }
  const [strategy] = await db.insert(eaStrategiesTable).values({
    userId,
    name,
    description,
    type,
    isPublic: isPublic ?? false,
    status: "inactive",
  }).returning();
  res.status(201).json(mapEA(strategy));
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [strategy] = await db.select().from(eaStrategiesTable).where(eq(eaStrategiesTable.id, id)).limit(1);
  if (!strategy) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapEA(strategy));
});

router.post("/:id/activate", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const id = parseInt(String(req.params.id));
  const [strategy] = await db.select().from(eaStrategiesTable).where(eq(eaStrategiesTable.id, id)).limit(1);
  if (!strategy) { res.status(404).json({ error: "Not found" }); return; }
  if (strategy.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.update(eaStrategiesTable)
    .set({ status: strategy.status === "active" ? "inactive" : "active" })
    .where(eq(eaStrategiesTable.id, id));
  res.json({ message: "EA strategy status toggled" });
});

router.get("/subscriptions/my", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const subs = await db.select().from(eaSubscriptionsTable).where(eq(eaSubscriptionsTable.userId, userId));
  res.json(subs.map(s => ({
    ...s,
    expiresAt: s.expiresAt.toISOString(),
    createdAt: s.createdAt.toISOString(),
    isExpired: new Date() > s.expiresAt,
  })));
});

router.post("/catalog/:catalogId/subscribe", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const catalogId = parseInt(String(req.params.catalogId));
  const {
    mtAccountNumber,
    accountNumber,
    brokerName,
    serverName,
    tradingPassword,
    mtPlatform,
    platform,
    plan,
    profitSharingPercent,
    amount,
    currency,
  } = req.body;

  const acctNum = String(accountNumber || mtAccountNumber || "").trim();
  const profitShareMode = profitSharingPercent != null;

  if (profitShareMode) {
    const mtCreds = {
      accountNumber: acctNum,
      broker: String(brokerName || "").trim(),
      serverName: String(serverName || "").trim(),
      platform: (platform || mtPlatform) === "mt4" ? "mt4" : "mt5",
      tradingPassword: String(tradingPassword || ""),
    };
    const mtErr = validateMtTradingCredentials(mtCreds);
    if (mtErr) { res.status(400).json({ error: mtErr }); return; }
    const pct = Number(profitSharingPercent);
    if (!Number.isFinite(pct) || pct < 10 || pct > 40) {
      res.status(400).json({ error: "Profit sharing must be between 10% and 40%" }); return;
    }
    if (!amount || Number(amount) <= 0) {
      res.status(400).json({ error: "Investment amount is required" }); return;
    }
    try {
      await linkMtTradingAccount(userId, mtCreds);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to link MT account" });
      return;
    }
  } else {
    if (!acctNum || !plan) {
      res.status(400).json({ error: "mtAccountNumber and plan are required" }); return;
    }
    if (brokerName && serverName && tradingPassword) {
      try {
        await linkMtTradingAccount(userId, {
          accountNumber: acctNum,
          broker: String(brokerName).trim(),
          serverName: String(serverName).trim(),
          platform: (platform || mtPlatform) === "mt4" ? "mt4" : "mt5",
          tradingPassword: String(tradingPassword),
        });
      } catch (err: any) {
        res.status(400).json({ error: err.message || "Failed to link MT account" });
        return;
      }
    }
  }

  const { findCatalogStrategy } = await import("../helpers/eaCatalog");
  const strategy = await findCatalogStrategy(catalogId);
  if (!strategy) { res.status(404).json({ error: "Strategy not found in catalog" }); return; }

  const existing = await db.select().from(eaSubscriptionsTable)
    .where(and(
      eq(eaSubscriptionsTable.userId, userId),
      eq(eaSubscriptionsTable.strategyId, catalogId),
      eq(eaSubscriptionsTable.mtAccountNumber, acctNum),
    )).limit(1);

  if (existing.length > 0 && existing[0].status === "active" && new Date() < existing[0].expiresAt) {
    res.status(400).json({ error: "You already have an active subscription for this strategy on this account." }); return;
  }

  const planDays: Record<string, number> = { monthly: 30, quarterly: 90, biannual: 180, annual: 365 };
  const selectedPlan = profitShareMode ? "annual" : plan;
  const days = planDays[String(selectedPlan)] || 30;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const licenseKey = `KQ-${randomBytes(4).toString("hex").toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;

  const [sub] = await db.insert(eaSubscriptionsTable).values({
    userId,
    strategyId: catalogId,
    mtAccountNumber: acctNum,
    mtPlatform: (platform || mtPlatform || "mt5") as string,
    plan: selectedPlan as any,
    profitSharingPercent: profitShareMode ? Math.round(Number(profitSharingPercent)) : null,
    amount: profitShareMode ? String(amount) : null,
    currency: currency || "USD",
    licenseKey,
    expiresAt,
    status: "active",
  } as any).returning();

  if (profitShareMode) {
    generateAgreement({
      userId,
      type: "algo_trading",
      triggerEvent: "ea_strategy_subscribed",
      triggerEntityId: sub.id,
      ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket?.remoteAddress || undefined,
      userAgent: req.headers["user-agent"] || "",
      extraData: {
        EA_NAME: String(strategy.name),
        MT_ACCOUNT: acctNum,
        MT_PLATFORM: String(platform || mtPlatform || "mt5").toUpperCase(),
        PROFIT_SHARE: String(profitSharingPercent),
      },
    }).catch(() => {});
  }

  res.status(201).json({
    ...sub,
    expiresAt: sub.expiresAt.toISOString(),
    createdAt: sub.createdAt.toISOString(),
    strategyName: strategy.name,
    profitSharingPercent: (sub as any).profitSharingPercent,
    amount: (sub as any).amount ? Number((sub as any).amount) : null,
  });
});

router.get("/subscriptions/:id/download", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const subId = parseInt(String(req.params.id));
  const [sub] = await db.select().from(eaSubscriptionsTable).where(eq(eaSubscriptionsTable.id, subId)).limit(1);

  if (!sub) { res.status(404).json({ error: "Subscription not found" }); return; }
  if (sub.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (new Date() > sub.expiresAt) {
    res.status(403).json({ error: "Subscription expired. Please renew at kuberquant.com" }); return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const { findCatalogStrategy } = await import("../helpers/eaCatalog");
  const strategy = await findCatalogStrategy(sub.strategyId) || { name: "Kuber Quant EA", pairs: "All", timeframe: "H1", platform: "mt5" };

  const mq5Content = `//+------------------------------------------------------------------+
//| ${(strategy as any).name}
//| Generated by Kuber Quant — kuberquant.com
//| License: ${sub.licenseKey}
//| Account: ${sub.mtAccountNumber}
//| Platform: ${sub.mtPlatform.toUpperCase()}
//| Expires: ${sub.expiresAt.toISOString().split("T")[0]}
//| Plan: ${sub.plan}
//+------------------------------------------------------------------+
#property copyright "Kuber Quant — kuberquant.com"
#property link      "https://kuberquant.com"
#property version   "1.00"
#property strict

input string  LicenseKey       = "${sub.licenseKey}";
input string  LicensedAccount  = "${sub.mtAccountNumber}";
input string  SupportURL       = "https://kuberquant.com/ea-strategies";
input datetime ExpiryTimestamp = ${Math.floor(sub.expiresAt.getTime() / 1000)};

input double  RiskPercent  = 1.0;
input double  LotSize      = 0.01;
input int     MagicNumber  = ${10000 + subId};
input int     Slippage     = 3;

bool ValidateLicense() {
   datetime now = TimeCurrent();
   long acc = AccountInfoInteger(ACCOUNT_LOGIN);
   if(now > (datetime)ExpiryTimestamp) {
      MessageBox(
         "License Expired. Renew at: " + SupportURL,
         "Kuber Quant License", MB_ICONWARNING|MB_OK
      );
      return false;
   }
   if((string)acc != LicensedAccount) {
      MessageBox(
         "Account mismatch. Licensed for: " + LicensedAccount + ". Visit: " + SupportURL,
         "Kuber Quant License", MB_ICONSTOP|MB_OK
      );
      return false;
   }
   return true;
}

int OnInit() {
   if(!ValidateLicense()) return INIT_FAILED;
   Print("Kuber Quant EA Active | License: ", LicenseKey);
   Print("Expires: ", TimeToString((datetime)ExpiryTimestamp, TIME_DATE));
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) {}

void OnTick() {
   if(!ValidateLicense()) { ExpertRemove(); return; }
}
//+------------------------------------------------------------------+`;

  await db.update(eaSubscriptionsTable)
    .set({ downloadCount: (sub.downloadCount || 0) + 1 })
    .where(eq(eaSubscriptionsTable.id, subId));

  const safeName = ((strategy as any).name || "KuberQuant_EA").replace(/[^a-zA-Z0-9_]/g, "_");
  const filename = `${safeName}_${sub.mtAccountNumber}.ex5`;
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(Buffer.from(mq5Content, "utf-8"));
});

export default router;
