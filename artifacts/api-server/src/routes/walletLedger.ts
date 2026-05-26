import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { getLedger, countLedger, mapLedgerEntry } from "../helpers/walletService";

const router = Router();

function mapLedgerResponse(entries: Awaited<ReturnType<typeof getLedger>>) {
  return entries.map(mapLedgerEntry);
}

router.get("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  const typeParam = req.query.type as string | undefined;
  const types = typeParam && typeParam !== "all"
    ? typeParam.split(",").filter(Boolean) as any[]
    : undefined;

  const [entries, total] = await Promise.all([
    getLedger(userId, { limit, offset, types }),
    countLedger(userId, types),
  ]);

  res.json({
    entries: mapLedgerResponse(entries),
    total,
    limit,
    offset,
  });
});

router.get("/deposits", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const entries = await getLedger(userId, { limit, types: ["deposit"] });
  res.json(mapLedgerResponse(entries));
});

router.get("/withdrawals", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const entries = await getLedger(userId, { limit, types: ["withdrawal"] });
  res.json(mapLedgerResponse(entries));
});

export default router;
