import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { JWT_SECRET } from "../lib/jwtSecret";
import { hasPermission, type PermissionKey } from "../helpers/roleHierarchy";

const SECRET = JWT_SECRET;

export interface AuthPayload {
  userId: number;
  role: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, SECRET) as AuthPayload;
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, SECRET) as AuthPayload;
    (req as any).user = payload;
  } catch { /* unauthenticated */ }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as AuthPayload | undefined;
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as AuthPayload | undefined;
  if (!user || user.role !== "superadmin") {
    res.status(403).json({ error: "Forbidden — Super Admin only" });
    return;
  }
  next();
}

export function requireManagerOrAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as AuthPayload | undefined;
  if (!user || !["admin", "superadmin", "manager", "support"].includes(user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

export function requireSupport(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as AuthPayload | undefined;
  if (!user || !["support", "admin", "superadmin"].includes(user.role)) {
    res.status(403).json({ error: "Forbidden — Support access only" });
    return;
  }
  next();
}

export function requirePermission(permission: PermissionKey) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user || !hasPermission(user.role, permission)) {
      res.status(403).json({ error: "Forbidden — insufficient permissions" });
      return;
    }
    next();
  };
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: (process.env.JWT_EXPIRES_IN || "1h") as jwt.SignOptions["expiresIn"] });
}

export function signRefreshToken(payload: AuthPayload): string {
  return jwt.sign({ ...payload, type: "refresh" }, SECRET + "-refresh", { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || "30d") as jwt.SignOptions["expiresIn"] });
}

export function verifyRefreshToken(token: string): AuthPayload {
  const payload = jwt.verify(token, SECRET + "-refresh") as AuthPayload & { type?: string };
  if (payload.type !== "refresh") throw new Error("Invalid token type");
  return { userId: payload.userId, role: payload.role };
}
