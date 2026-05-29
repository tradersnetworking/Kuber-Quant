import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

const BLOCKED = new Set(
  (process.env.BLOCKED_COUNTRY_CODES || "")
    .split(",")
    .map(c => c.trim().toUpperCase())
    .filter(Boolean),
);

function detectCountry(req: Request): string | undefined {
  const cf = req.headers["cf-ipcountry"];
  if (typeof cf === "string" && cf.length === 2 && cf !== "XX") return cf.toUpperCase();

  const custom = req.headers["x-country-code"];
  if (typeof custom === "string" && custom.length === 2) return custom.toUpperCase();

  return undefined;
}

/** Block requests from configured high-risk country codes (Cloudflare CF-IPCountry). */
export function geoBlockGate(req: Request, res: Response, next: NextFunction) {
  if (BLOCKED.size === 0) {
    next();
    return;
  }

  const path = (req.path || req.url?.split("?")[0] || "").replace(/\/+$/, "");
  if (path === "/api/health" || path === "/api/healthz" || path === "/api/branding") {
    next();
    return;
  }

  const country = detectCountry(req);
  if (country && BLOCKED.has(country)) {
    logger.warn({ country, path, ip: req.ip }, "Geo-blocked request");
    res.status(451).json({
      error: "Service unavailable in your region.",
      code: "GEO_BLOCKED",
    });
    return;
  }

  next();
}
