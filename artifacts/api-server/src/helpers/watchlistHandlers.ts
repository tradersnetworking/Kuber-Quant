import type { Request, Response } from "express";
import { getUserWatchlist, saveUserWatchlist, AVAILABLE_PAIRS } from "../helpers/marketData";

export async function handleGetWatchlist(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId as number;
    const pairs = await getUserWatchlist(userId);
    res.json({ pairs, maxPairs: 10, availablePairs: AVAILABLE_PAIRS });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to load watchlist" });
  }
}

export async function handleSaveWatchlist(req: Request, res: Response, onSaved?: () => void) {
  try {
    const userId = (req as any).user.userId as number;
    const pairs = req.body?.pairs;
    if (!Array.isArray(pairs)) {
      res.status(400).json({ error: "pairs must be an array of symbol strings" });
      return;
    }
    const saved = await saveUserWatchlist(userId, pairs);
    onSaved?.();
    res.json({ pairs: saved, maxPairs: 10, message: "Watchlist saved" });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to save watchlist" });
  }
}
