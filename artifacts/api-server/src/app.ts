import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";
import pinoHttp from "pino-http";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import router from "./routes";
import { geoBlockGate } from "./middlewares/geoBlock";
import { logger } from "./lib/logger";
import { getUploadRoot } from "./middlewares/upload";
import { createRateLimitStore } from "./helpers/redisRateLimitStore";
import { captureException } from "./lib/sentry";

const app: Express = express();

if (process.env.TRUST_PROXY !== "false") {
  app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS || 1));
}

const allowedOrigins = (process.env.CORS_ORIGINS || process.env.APP_URL || "http://127.0.0.1:3000")
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
}));

app.use(cors({
  origin: allowedOrigins.includes("*") ? true : allowedOrigins,
  credentials: true,
}));

app.use(cookieParser());

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Public static assets only (branding, QR codes, profile images)
app.use("/uploads/branding", express.static(path.join(getUploadRoot(), "branding"), { maxAge: "1d" }));
app.use("/uploads/qr_codes", express.static(path.join(getUploadRoot(), "qr_codes"), { maxAge: "1d" }));
app.use("/uploads/profile_images", express.static(path.join(getUploadRoot(), "profile_images"), { maxAge: "1d" }));
// KYC and payment proofs served via /api/uploads-secure (authenticated)

const isDev = process.env.NODE_ENV !== "production";
const rateLimitWindowMs = 15 * 60 * 1000;

const generalLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: Number(process.env.RATE_LIMIT_MAX || (isDev ? 5000 : 1500)),
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore("rl:general:"),
  keyGenerator: (req) => ipKeyGenerator(req.ip || "unknown"),
  skip: (req) => {
    if (isDev && process.env.RATE_LIMIT_ENABLE !== "true") return true;
    const path = (req.path || req.url?.split("?")[0] || "").replace(/\/+$/, "");
    return path === "/api/maintenance" || path.startsWith("/api/branding") || path.startsWith("/api/payments/qr") || path === "/api/health" || path === "/api/healthz" || path === "/api/market/config" || path === "/api/public-stats" || path === "/api/notifications/stream";
  },
  message: { error: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore("rl:auth:"),
  keyGenerator: (req) => ipKeyGenerator(req.ip || "unknown"),
  message: { error: "Too many login attempts, please try again in 15 minutes." },
});

app.use("/api", generalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/verify-otp", authLimiter);

app.use("/api", geoBlockGate);
app.use("/api", router);

if (process.env.NODE_ENV !== "production" && process.env.SERVE_SPA !== "true") {
  app.get("/", (_req, res) => {
    const webPort = process.env.WEB_PORT || "3000";
    const webUrl = `http://127.0.0.1:${webPort}/`;
    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0;url=${webUrl}" />
  <title>Kuber Quant — local dev</title>
</head>
<body style="font-family:system-ui,sans-serif;background:#050A14;color:#e2e8f0;padding:2rem;">
  <h1>API server running</h1>
  <p>Open the web app at <a href="${webUrl}" style="color:#38bdf8;">${webUrl}</a></p>
  <p style="color:#94a3b8;font-size:0.9rem;">Port ${process.env.PORT || "8080"} is API-only in development. Use <code>pnpm dev</code> for local work.</p>
</body>
</html>`);
  });
}

if (process.env.NODE_ENV === "production" && process.env.SERVE_SPA !== "false") {
  const webDist = process.env.WEB_DIST || path.resolve(process.cwd(), "../trading-platform/dist/public");
  app.use(express.static(webDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) return next();
    res.sendFile(path.join(webDist, "index.html"), (err) => {
      if (err) next();
    });
  });
}

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, "Unhandled error");
  captureException(err);
  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === "production";
  const message =
    status < 500
      ? err.message || "Request failed"
      : isProd
        ? "Internal server error"
        : err.message || "Internal server error";
  res.status(status).json({ error: message });
});

export default app;
