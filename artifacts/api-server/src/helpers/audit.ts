import { db, auditLogsTable } from "@workspace/db";
import type { Request } from "express";
import { siemFromAudit } from "./siemExportService";

export async function logAudit(opts: {
  req?: Request;
  userId?: number;
  role?: string;
  action: string;
  entity?: string;
  entityId?: number;
  details?: Record<string, any>;
}) {
  try {
    const ipAddress = opts.req
      ? (opts.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        opts.req.socket?.remoteAddress || "unknown"
      : "system";
    const userAgent = opts.req ? (opts.req.headers["user-agent"] || "unknown") : "system";

    await db.insert(auditLogsTable).values({
      userId: opts.userId,
      role: opts.role,
      action: opts.action,
      entity: opts.entity,
      entityId: opts.entityId,
      details: opts.details as any,
      ipAddress,
      userAgent,
    });

    siemFromAudit({
      action: opts.action,
      userId: opts.userId,
      role: opts.role,
      entity: opts.entity,
      entityId: opts.entityId,
      ipAddress,
      details: opts.details,
    });
  } catch {
    // never let audit failure break the main flow
  }
}
