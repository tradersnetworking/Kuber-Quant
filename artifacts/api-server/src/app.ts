import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";
import { getUploadRoot } from "./middlewares/upload";

const app: Express = express();

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

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again in 15 minutes." },
});

app.use("/api", generalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/verify-otp", authLimiter);

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
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
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

export default app;
