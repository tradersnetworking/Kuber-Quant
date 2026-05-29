import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db, withdrawalConfirmationsTable } from "@workspace/db";
import { eq, and, isNull, gt } from "@workspace/db/orm";
import { hashToken } from "./authHelpers";

const CONFIRM_TTL_MINUTES = 15;

export type PendingWithdrawalPayload = {
  userId: number;
  paymentAccountId: number;
  amount: number;
  currency: string;
  paymentMethod: string;
  notes?: string;
  clientIp?: string;
};

export async function createWithdrawalConfirmation(payload: PendingWithdrawalPayload) {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + CONFIRM_TTL_MINUTES * 60 * 1000);

  const [row] = await db.insert(withdrawalConfirmationsTable).values({
    userId: payload.userId,
    tokenHash,
    paymentAccountId: payload.paymentAccountId,
    amount: String(payload.amount),
    currency: payload.currency,
    paymentMethod: payload.paymentMethod,
    notes: payload.notes ?? null,
    clientIp: payload.clientIp ?? null,
    totpVerifiedAt: new Date(),
    expiresAt,
  }).returning();

  return { confirmationToken: rawToken, confirmationId: row!.id, expiresAt };
}

export async function loadPendingWithdrawal(rawToken: string, userId: number) {
  const now = new Date();
  const [row] = await db.select().from(withdrawalConfirmationsTable)
    .where(and(
      eq(withdrawalConfirmationsTable.tokenHash, hashToken(rawToken)),
      eq(withdrawalConfirmationsTable.userId, userId),
      isNull(withdrawalConfirmationsTable.confirmedAt),
      gt(withdrawalConfirmationsTable.expiresAt, now),
    ))
    .limit(1);
  return row ?? null;
}

export async function markWithdrawalConfirmed(id: number) {
  await db.update(withdrawalConfirmationsTable)
    .set({ confirmedAt: new Date() })
    .where(eq(withdrawalConfirmationsTable.id, id));
}

export async function verifyWithdrawalPassword(userId: number, password: string): Promise<boolean> {
  const { usersTable } = await import("@workspace/db");
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return false;
  return bcrypt.compare(password, user.passwordHash);
}
