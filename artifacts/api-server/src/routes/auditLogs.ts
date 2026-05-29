import { Router } from "express";
import { db, dbRead, auditLogsTable, loginHistoryTable } from "@workspace/db";
import { eq, desc } from "@workspace/db/orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

// Admin: get audit logs
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  const limit = Math.min(parseInt(String(req.query.limit || "100")), 500);
  const logs = await dbRead.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(limit);
  res.json(logs);
});

// Admin: get login history for all users
router.get("/login-history", requireAuth, requireAdmin, async (req, res) => {
  const limit = Math.min(parseInt(String(req.query.limit || "100")), 500);
  const history = await dbRead.select().from(loginHistoryTable).orderBy(desc(loginHistoryTable.createdAt)).limit(limit);
  res.json(history);
});

// User: get their own login history
router.get("/my-login-history", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const history = await db.select().from(loginHistoryTable)
    .where(eq(loginHistoryTable.userId, userId))
    .orderBy(desc(loginHistoryTable.createdAt))
    .limit(30);
  res.json(history);
});

export default router;
