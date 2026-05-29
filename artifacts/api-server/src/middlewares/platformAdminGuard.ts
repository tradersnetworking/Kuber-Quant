import { Request, Response, NextFunction } from "express";
import type { AuthPayload } from "./auth";
import { isAdminWriteBlockedPath, isSuperAdmin } from "../helpers/credentialPolicy";

/** Block platform Admin from credential / password write routes on super-admin API. */
export function forbidAdminCredentialWrites(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as AuthPayload | undefined;
  if (!user || isSuperAdmin(user.role)) {
    next();
    return;
  }
  if (user.role === "admin" && isAdminWriteBlockedPath(req.method, req.path)) {
    res.status(403).json({
      error: "Forbidden — Super Admin required for credentials, passwords, and security settings",
      code: "SUPERADMIN_CREDENTIALS_ONLY",
    });
    return;
  }
  if (user.role === "admin" && req.method === "PATCH" && /^\/users\/\d+$/.test(req.path) && req.body?.password) {
    res.status(403).json({
      error: "Forbidden — only Super Admin can reset user passwords",
      code: "SUPERADMIN_PASSWORD_ONLY",
    });
    return;
  }
  next();
}
