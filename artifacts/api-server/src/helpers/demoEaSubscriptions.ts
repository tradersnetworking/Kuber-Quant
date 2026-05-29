import { db, eaSubscriptionsTable, usersTable } from "@workspace/db";
import { buildDemoEaSubscriptionsForUser } from "../../../../lib/db/src/seed-data/ea-subscriptions.js";
import { eq } from "@workspace/db/orm";

/** Inserts demo EA subscriptions when the table is empty (local/demo environments). */
export async function ensureDemoEaSubscriptions(): Promise<void> {
  const existing = await db.select({ id: eaSubscriptionsTable.id }).from(eaSubscriptionsTable).limit(1);
  if (existing.length > 0) return;

  const [investor] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, "user@kuberquant.com"))
    .limit(1);

  if (!investor) return;

  await db.insert(eaSubscriptionsTable).values(buildDemoEaSubscriptionsForUser(investor.id));
}
