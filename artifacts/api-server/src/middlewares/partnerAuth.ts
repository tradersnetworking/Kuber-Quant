import { Request, Response, NextFunction } from "express";
import {
  verifyPartnerApiKey,
  partnerHasScope,
  type PartnerScope,
  type VerifiedPartnerKey,
} from "../helpers/partnerApiKeyService";

export type PartnerAuthRequest = Request & { partner?: VerifiedPartnerKey };

export async function requirePartnerApiKey(req: Request, res: Response, next: NextFunction) {
  const header = req.headers["x-partner-key"] || req.headers.authorization;
  let rawKey = "";

  if (typeof header === "string") {
    rawKey = header.startsWith("Bearer ") ? header.slice(7).trim() : header.trim();
  }

  if (!rawKey) {
    res.status(401).json({ error: "Partner API key required (X-Partner-Key header)" });
    return;
  }

  const partner = await verifyPartnerApiKey(rawKey);
  if (!partner) {
    res.status(401).json({ error: "Invalid or inactive partner API key" });
    return;
  }

  (req as PartnerAuthRequest).partner = partner;
  next();
}

export function requirePartnerScope(scope: PartnerScope) {
  return (req: Request, res: Response, next: NextFunction) => {
    const partner = (req as PartnerAuthRequest).partner;
    if (!partner || !partnerHasScope(partner, scope)) {
      res.status(403).json({ error: `Forbidden — scope '${scope}' required` });
      return;
    }
    next();
  };
}
