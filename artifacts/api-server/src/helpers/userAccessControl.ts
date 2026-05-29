import { db, usersTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";

export type UserServiceKey =
  | "deposits"
  | "investments"
  | "withdrawals"
  | "algo"
  | "copy"
  | "ea"
  | "mt5";

export class UserAccessError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

const SERVICE_MESSAGES: Record<UserServiceKey, string> = {
  deposits: "Deposits are currently disabled for your account. Please contact support.",
  investments: "Investments are currently disabled for your account. Please contact support.",
  withdrawals: "Withdrawals are currently disabled for your account. Please contact support.",
  algo: "Algo trading is currently disabled for your account. Please contact support.",
  copy: "Copy trading is currently disabled for your account. Please contact support.",
  ea: "EA strategies are currently disabled for your account. Please contact support.",
  mt5: "MT4/MT5 services are currently disabled for your account. Please contact support.",
};

export function mapUserServiceFlags(user: typeof usersTable.$inferSelect) {
  return {
    depositsEnabled: user.depositsEnabled !== false,
    investmentsEnabled: user.investmentsEnabled !== false,
    algoTradingEnabled: user.algoTradingEnabled !== false,
    copyTradingEnabled: user.copyTradingEnabled !== false,
    eaTradingEnabled: user.eaTradingEnabled !== false,
    mt5Enabled: user.mt5Enabled !== false,
    withdrawalsEnabled: user.withdrawalsEnabled !== false,
    withdrawalBlockMessage: user.withdrawalBlockMessage || null,
    suspendReason: user.suspendReason || null,
    isActive: user.isActive,
  };
}

export async function getUserAccess(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return user ?? null;
}

export async function assertUserServiceEnabled(userId: number, service: UserServiceKey) {
  const user = await getUserAccess(userId);
  if (!user) throw new UserAccessError("User not found", "USER_NOT_FOUND");
  if (!user.isActive) {
    const msg = user.suspendReason?.trim()
      || "Account is suspended. Please contact support.";
    throw new UserAccessError(msg, "ACCOUNT_SUSPENDED");
  }

  const enabled = {
    deposits: user.depositsEnabled !== false,
    investments: user.investmentsEnabled !== false,
    withdrawals: user.withdrawalsEnabled !== false,
    algo: user.algoTradingEnabled !== false,
    copy: user.copyTradingEnabled !== false,
    ea: user.eaTradingEnabled !== false,
    mt5: user.mt5Enabled !== false,
  }[service];

  if (!enabled) {
    const custom = service === "withdrawals" ? user.withdrawalBlockMessage?.trim() : null;
    throw new UserAccessError(custom || SERVICE_MESSAGES[service], `${service.toUpperCase()}_DISABLED`);
  }
}

export async function respondIfServiceBlocked(
  userId: number,
  service: UserServiceKey,
  res: { status: (code: number) => { json: (body: unknown) => void } },
): Promise<boolean> {
  try {
    await assertUserServiceEnabled(userId, service);
    return false;
  } catch (err) {
    if (err instanceof UserAccessError) {
      res.status(403).json({ error: err.message, code: err.code });
      return true;
    }
    throw err;
  }
}

/** When a manager is demoted, their clients fall under super admin (unassigned pool). */
export async function releaseManagerClients(managerId: number) {
  const released = await db.update(usersTable)
    .set({ managerId: null })
    .where(eq(usersTable.managerId, managerId))
    .returning({ id: usersTable.id });
  return released.length;
}

export async function promoteUserToManager(userId: number) {
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!existing) throw new UserAccessError("User not found", "USER_NOT_FOUND");
  if (existing.role === "superadmin") {
    throw new UserAccessError("Super admin accounts cannot be promoted to manager", "INVALID_ROLE");
  }
  if (existing.role === "support") {
    throw new UserAccessError("Support agents must be demoted before promoting to manager", "INVALID_ROLE");
  }
  const [user] = await db.update(usersTable).set({
    role: "manager",
    managerId: null,
    kycStatus: existing.kycStatus === "pending" ? "verified" : existing.kycStatus,
  }).where(eq(usersTable.id, userId)).returning();
  return user!;
}

export async function demoteManagerToUser(managerId: number) {
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, managerId)).limit(1);
  if (!existing || existing.role !== "manager") {
    throw new UserAccessError("Manager not found", "MANAGER_NOT_FOUND");
  }
  const clientsReleased = await releaseManagerClients(managerId);
  const [user] = await db.update(usersTable).set({ role: "user" }).where(eq(usersTable.id, managerId)).returning();
  return { user: user!, clientsReleased };
}
