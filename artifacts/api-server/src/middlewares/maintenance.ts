import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getSiteSettings } from "../helpers/siteSettings";
import { JWT_SECRET } from "../lib/jwtSecret";

const SKIP_PREFIXES = [
  "/health",
  "/branding",
  "/maintenance",
  "/payments/qr",
  "/auth/login",
  "/auth/refresh",
  "/auth/2fa",
  "/auth/config",
  "/auth/forgot-password",
  "/auth/verify-otp",
];

function isSuperAdminRole(role?: string): boolean {
  return role === "superadmin" || role === "admin";
}

function getUserFromRequest(req: Request): { role?: string } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(authHeader.slice(7), JWT_SECRET) as { role?: string };
  } catch {
    return null;
  }
}

/** Blocks non–super-admin API access when maintenance mode is enabled. */
export async function maintenanceGate(req: Request, res: Response, next: NextFunction) {
  const path = req.path || "";
  if (SKIP_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    next();
    return;
  }

  const settings = await getSiteSettings(["maintenance_mode"]);
  if (settings.maintenance_mode !== "true") {
    next();
    return;
  }

  const payload = getUserFromRequest(req);
  if (isSuperAdminRole(payload?.role)) {
    next();
    return;
  }

  res.status(503).json({
    error: "The platform is currently under maintenance. Please try again later.",
    code: "MAINTENANCE_MODE",
  });
}
