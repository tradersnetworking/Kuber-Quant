import { db, transactionsTable, usersTable, siteSettingsTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";
import { approveTransaction } from "./transactionLedgerService";
import { logger } from "../lib/logger";

async function getSetting(key: string, fallback: string): Promise<string> {
  const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  return row?.value ?? fallback;
}

async function resolveSystemReviewerId(): Promise<number> {
  const configured = await getSetting("system_reviewer_user_id", "");
  if (configured) {
    const id = Number(configured);
    if (id > 0) return id;
  }
  const [admin] = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.role, "superadmin"))
    .limit(1);
  return admin?.id ?? 1;
}

/**
 * Auto-approve verified gateway deposits when enabled in site settings.
 */
export async function tryAutoApproveGatewayDeposit(transactionId: number): Promise<boolean> {
  const enabled = (await getSetting("auto_approve_gateway_deposits", "false")) === "true";
  if (!enabled) return false;

  const [txn] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, transactionId)).limit(1);
  if (!txn || txn.type !== "deposit" || txn.status !== "pending") return false;
  if (!txn.gatewayProvider) return false;

  try {
    const reviewerUserId = await resolveSystemReviewerId();
    const dualThreshold = Number(await getSetting("dual_approval_threshold_usd", "10000"));

    const { convertToUsd } = await import("./exchangeRateService");
    const CRYPTO = new Set(["BTC", "ETH", "USDT"]);
    const amountUsd = CRYPTO.has(txn.currency.toUpperCase())
      ? Number(txn.amount)
      : await convertToUsd(Number(txn.amount), txn.currency);
    const skipDual = amountUsd < dualThreshold;

    await approveTransaction({
      transactionId,
      reviewerUserId,
      adminNotes: `Auto-approved ${txn.gatewayProvider} deposit`,
      skipDualApproval: skipDual,
    });
    logger.info({ transactionId, provider: txn.gatewayProvider }, "Gateway deposit auto-approved");
    return true;
  } catch (err) {
    logger.error({ err, transactionId }, "Gateway deposit auto-approve failed");
    return false;
  }
}
