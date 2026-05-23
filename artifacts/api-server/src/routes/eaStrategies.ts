import { Router } from "express";
import { db, eaStrategiesTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function mapEA(s: any) {
  return {
    id: s.id,
    userId: s.userId,
    name: s.name,
    description: s.description,
    type: s.type,
    backtestRoi: s.backtestRoi ? Number(s.backtestRoi) : null,
    winRate: s.winRate ? Number(s.winRate) : null,
    status: s.status,
    isPublic: s.isPublic,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const strategies = await db.select().from(eaStrategiesTable)
    .where(or(eq(eaStrategiesTable.isPublic, true), eq(eaStrategiesTable.userId, userId)));
  res.json(strategies.map(mapEA));
});

router.post("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { name, description, type, isPublic } = req.body;
  if (!name || !description || !type) {
    res.status(400).json({ error: "name, description, type are required" });
    return;
  }
  const [strategy] = await db.insert(eaStrategiesTable).values({
    userId,
    name,
    description,
    type,
    isPublic: isPublic ?? false,
    status: "inactive",
  }).returning();
  res.status(201).json(mapEA(strategy));
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [strategy] = await db.select().from(eaStrategiesTable).where(eq(eaStrategiesTable.id, id)).limit(1);
  if (!strategy) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapEA(strategy));
});

router.post("/:id/activate", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const id = parseInt(String(req.params.id));
  const [strategy] = await db.select().from(eaStrategiesTable).where(eq(eaStrategiesTable.id, id)).limit(1);
  if (!strategy) { res.status(404).json({ error: "Not found" }); return; }
  if (strategy.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.update(eaStrategiesTable)
    .set({ status: strategy.status === "active" ? "inactive" : "active" })
    .where(eq(eaStrategiesTable.id, id));
  res.json({ message: "EA strategy status toggled" });
});

export default router;
