import type { Request, Response } from "express";
import { logger } from "../lib/logger";
import { logAudit } from "./audit";
import { getTreasurySnapshot, reconcileUserBalances } from "./ledgerReconciliation";

function actorId(req: Request): number | undefined {
  return (req as { user?: { id?: number } }).user?.id;
}

function actorRole(req: Request): string | undefined {
  return (req as { user?: { role?: string } }).user?.role;
}

function sendRouteError(res: Response, err: unknown, context: string) {
  logger.error({ err, context }, "Treasury route failed");
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({
    error: message,
    code: "TREASURY_OPERATION_FAILED",
    context,
  });
}

export async function handleGetTreasury(req: Request, res: Response) {
  try {
    const investorIds = Array.isArray(res.locals.treasuryInvestorIds)
      ? (res.locals.treasuryInvestorIds as number[])
      : undefined;
    res.json(await getTreasurySnapshot({ investorIds }));
  } catch (err) {
    sendRouteError(res, err, "treasury_snapshot");
  }
}

export async function handleGetReconciliation(req: Request, res: Response) {
  try {
    const userIds = Array.isArray(res.locals.treasuryUserIds)
      ? (res.locals.treasuryUserIds as number[])
      : undefined;
    const report = await reconcileUserBalances({ autoFix: false, userIds });
    res.json(report);
  } catch (err) {
    sendRouteError(res, err, "reconciliation_scan");
  }
}

export async function handlePostReconciliationRun(req: Request, res: Response) {
  try {
    const autoFix = req.body?.autoFix === true;
    const userIds = Array.isArray(res.locals.treasuryUserIds)
      ? (res.locals.treasuryUserIds as number[])
      : undefined;
    const report = await reconcileUserBalances({ autoFix, userIds });

    if (autoFix && report.fixed > 0) {
      await logAudit({
        req,
        userId: actorId(req),
        role: actorRole(req),
        action: "ledger_reconciliation_autofix",
        entity: "platform",
        entityId: 0,
        details: {
          fixed: report.fixed,
          driftCount: report.driftCount,
          scanned: report.scanned,
        },
      }).catch((auditErr) => {
        logger.warn({ auditErr }, "Reconciliation audit log failed");
      });
    }

    res.json(report);
  } catch (err) {
    sendRouteError(res, err, req.body?.autoFix === true ? "reconciliation_autofix" : "reconciliation_scan");
  }
}
