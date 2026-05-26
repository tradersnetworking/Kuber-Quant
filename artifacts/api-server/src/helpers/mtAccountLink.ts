import { db, mt5AccountsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { encryptSensitive, decryptSensitive } from "./encryption";
import { validateMtTradingCredentials, type MtTradingCredentials } from "./mtCredentialsValidation";

export { validateMtTradingCredentials, type MtTradingCredentials } from "./mtCredentialsValidation";

/** Create or update linked MT4/MT5 account with encrypted trading password */
export async function linkMtTradingAccount(userId: number, creds: MtTradingCredentials) {
  const err = validateMtTradingCredentials(creds);
  if (err) throw new Error(err);

  const accountNumber = String(creds.accountNumber).trim();
  const platform = creds.platform === "mt4" ? "mt4" as const : "mt5" as const;

  const [existing] = await db.select().from(mt5AccountsTable)
    .where(and(
      eq(mt5AccountsTable.userId, userId),
      eq(mt5AccountsTable.accountNumber, accountNumber),
    ))
    .limit(1);

  const values = {
    broker: String(creds.broker).trim(),
    serverName: String(creds.serverName).trim(),
    platform,
    passwordEnc: encryptSensitive(String(creds.tradingPassword)),
    status: "pending_review" as const,
  };

  if (existing) {
    const [updated] = await db.update(mt5AccountsTable)
      .set(values)
      .where(eq(mt5AccountsTable.id, existing.id))
      .returning();
    return updated;
  }

  const [account] = await db.insert(mt5AccountsTable).values({
    userId,
    accountNumber,
    ...values,
  }).returning();

  return account;
}

export async function getLatestMtAccountForUser(userId: number, accountNumber?: string) {
  if (accountNumber) {
    const [account] = await db.select().from(mt5AccountsTable)
      .where(and(eq(mt5AccountsTable.userId, userId), eq(mt5AccountsTable.accountNumber, accountNumber)))
      .limit(1);
    return account ?? null;
  }
  const [account] = await db.select().from(mt5AccountsTable)
    .where(eq(mt5AccountsTable.userId, userId))
    .orderBy(desc(mt5AccountsTable.updatedAt))
    .limit(1);
  return account ?? null;
}

export function getMtTradingPassword(account: { passwordEnc?: string | null }): string | null {
  if (!account.passwordEnc) return null;
  try {
    return decryptSensitive(account.passwordEnc);
  } catch {
    return null;
  }
}
