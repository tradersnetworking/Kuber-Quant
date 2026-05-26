import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { migrateLegacyEmails, upsertDefaultUsers } from "./defaultUsers";

/**
 * Ensures demo/platform accounts exist on startup.
 * - Development: upserts users and resets passwords to known demo values.
 * - Production: creates missing accounts only (set BOOTSTRAP_USERS=true to reset passwords).
 */
export async function ensureDefaultUsers(): Promise<void> {
  if (process.env.BOOTSTRAP_USERS === "false") return;

  try {
    await migrateLegacyEmails();

    const isProd = process.env.NODE_ENV === "production";
    const forceReset = process.env.BOOTSTRAP_USERS === "true";

    if (!isProd || forceReset) {
      await upsertDefaultUsers({ resetPasswords: true });
      logger.info("Default platform users upserted (passwords synced to demo values)");
      return;
    }

    const [superAdmin] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.role, "superadmin"))
      .limit(1);

    if (!superAdmin) {
      await upsertDefaultUsers({ resetPasswords: true });
      logger.info("No super admin found — created default platform users");
      return;
    }

    await upsertDefaultUsers({ resetPasswords: false });
    logger.info("Default platform users verified (existing accounts left unchanged)");
  } catch (err) {
    logger.error({ err }, "Default user bootstrap failed — run db:push and db:seed if login fails");
  }
}
