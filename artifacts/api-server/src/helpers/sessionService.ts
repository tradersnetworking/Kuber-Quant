import { db, usersTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";
import { revokeAllRefreshTokensForUser } from "./authHelpers";
import { isSuperAdmin } from "./credentialPolicy";

/** Revoke refresh tokens and bump session version — invalidates all access tokens. */
export async function invalidateUserSessions(userId: number): Promise<void> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return;
  if (isSuperAdmin(user.role)) return;

  await revokeAllRefreshTokensForUser(userId);
  const next = (user.sessionVersion ?? 1) + 1;
  await db.update(usersTable)
    .set({ sessionVersion: next, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));
}
