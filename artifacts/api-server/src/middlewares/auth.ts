import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";

import { JWT_SECRET } from "../lib/jwtSecret";
import { hasPermission, type PermissionKey } from "../helpers/roleHierarchy";
import { userHasPermission } from "../helpers/rbacService";
import { isPlatformAdmin, isSuperAdmin } from "../helpers/credentialPolicy";

const SECRET = JWT_SECRET;

export interface AuthPayload {
  userId: number;
  role: string;
  sessionVersion?: number;
}

async function loadUserSession(userId: number) {
  const [row] = await db.select({
    role: usersTable.role,
    sessionVersion: usersTable.sessionVersion,
    isActive: usersTable.isActive,
  })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return row;
}

async function assertSessionValid(payload: AuthPayload, res: Response): Promise<{ role: string } | null> {
  const row = await loadUserSession(payload.userId);
  if (!row?.isActive) {
    res.status(403).json({ error: "Account is suspended. Please contact support." });
    return null;
  }
  if (!isSuperAdmin(row.role)) {
    if ((payload.sessionVersion ?? 1) !== (row.sessionVersion ?? 1)) {
      res.status(401).json({
        error: "Your account was signed in on another device. Please sign in again.",
        code: "SESSION_REPLACED",
      });
      return null;
    }
  }
  return { role: row.role };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const queryToken = typeof req.query.access_token === "string" ? req.query.access_token : undefined;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : queryToken;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = jwt.verify(token, SECRET) as AuthPayload;
    const session = await assertSessionValid(payload, res);
    if (!session) return;
    (req as any).user = { ...payload, role: session.role };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, SECRET) as AuthPayload;
    const row = await loadUserSession(payload.userId);
    if (row?.isActive) {
      (req as any).user = { ...payload, role: row.role };
    }
  } catch { /* unauthenticated */ }
  next();
}

/** Super Admin + Platform Admin (operations / approvals, no credentials). */
export function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as AuthPayload | undefined;
  if (!user || !isPlatformAdmin(user.role)) {
    res.status(403).json({ error: "Forbidden — Platform Admin access required" });
    return;
  }
  next();
}

/** @deprecated use requirePlatformAdmin — kept as alias for admin + superadmin routes */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requirePlatformAdmin(req, res, next);
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as AuthPayload | undefined;
  if (!user || !isSuperAdmin(user.role)) {
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
  if (!user || !["support", "superadmin", "admin"].includes(user.role)) {
    res.status(403).json({ error: "Forbidden — Support access only" });
    return;
  }
  next();
}

export function requireMailDesk(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as AuthPayload | undefined;
  if (!user || !["support", "superadmin", "admin", "manager"].includes(user.role)) {
    res.status(403).json({ error: "Forbidden — Mail desk access only" });
    return;
  }
  next();
}

export function requirePermission(permission: PermissionKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      res.status(403).json({ error: "Forbidden — insufficient permissions" });
      return;
    }
    const allowed = await userHasPermission(user.role, permission).catch(() => hasPermission(user.role, permission));
    if (!allowed) {
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
  return {
    userId: payload.userId,
    role: payload.role,
    sessionVersion: payload.sessionVersion,
  };
}

export function getRequestRole(req: Request): string {
  return ((req as any).user as AuthPayload | undefined)?.role ?? "";
}
