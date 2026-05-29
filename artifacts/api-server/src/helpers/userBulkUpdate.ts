import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, inArray } from "@workspace/db/orm";
import { demoteManagerToUser, releaseManagerClients } from "./userAccessControl";

export type BulkUserUpdates = {
  isActive?: boolean;
  suspendReason?: string | null;
  withdrawalsEnabled?: boolean;
  withdrawalBlockMessage?: string | null;
  depositsEnabled?: boolean;
  investmentsEnabled?: boolean;
  algoTradingEnabled?: boolean;
  copyTradingEnabled?: boolean;
  eaTradingEnabled?: boolean;
  mt5Enabled?: boolean;
  managerId?: number | null;
  kycStatus?: string;
  role?: string;
};

function buildUpdates(body: BulkUserUpdates): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  if (body.isActive !== undefined) updates.isActive = body.isActive;
  if (body.suspendReason !== undefined) updates.suspendReason = body.suspendReason || null;
  if (body.withdrawalsEnabled !== undefined) updates.withdrawalsEnabled = !!body.withdrawalsEnabled;
  if (body.withdrawalBlockMessage !== undefined) {
    updates.withdrawalBlockMessage = body.withdrawalBlockMessage?.trim() || null;
  }
  if (body.depositsEnabled !== undefined) updates.depositsEnabled = !!body.depositsEnabled;
  if (body.investmentsEnabled !== undefined) updates.investmentsEnabled = !!body.investmentsEnabled;
  if (body.algoTradingEnabled !== undefined) updates.algoTradingEnabled = !!body.algoTradingEnabled;
  if (body.copyTradingEnabled !== undefined) updates.copyTradingEnabled = !!body.copyTradingEnabled;
  if (body.eaTradingEnabled !== undefined) updates.eaTradingEnabled = !!body.eaTradingEnabled;
  if (body.mt5Enabled !== undefined) updates.mt5Enabled = !!body.mt5Enabled;
  if (body.managerId !== undefined) updates.managerId = body.managerId;
  if (body.kycStatus !== undefined) updates.kycStatus = body.kycStatus;
  if (body.role !== undefined) updates.role = body.role;
  return updates;
}

export async function bulkUpdateUsers(userIds: number[], body: BulkUserUpdates) {
  const uniqueIds = [...new Set(userIds.filter(id => Number.isFinite(id) && id > 0))];
  if (uniqueIds.length === 0) {
    throw new Error("No valid user ids provided");
  }

  const updates = buildUpdates(body);
  if (Object.keys(updates).length === 0) {
    throw new Error("No updates provided");
  }

  const existing = await db.select().from(usersTable).where(inArray(usersTable.id, uniqueIds));
  if (existing.length === 0) {
    throw new Error("No matching users found");
  }

  let clientsReleased = 0;
  if (updates.role === "user") {
    for (const u of existing) {
      if (u.role === "manager") {
        clientsReleased += await releaseManagerClients(u.id);
      }
    }
  }

  if (updates.role === "manager") {
    updates.managerId = null;
  }

  const updated = await db.update(usersTable)
    .set(updates)
    .where(inArray(usersTable.id, uniqueIds))
    .returning();

  return { updated: updated.length, clientsReleased, users: updated };
}

export async function applyUserPatch(id: number, body: Record<string, unknown>, existing: typeof usersTable.$inferSelect) {
  const updates: Record<string, unknown> = {};
  const {
    email, fullName, phone, role, kycStatus, balanceFiat, balanceCrypto,
    isActive, managerId, password, isPromoter, promoterCommissionType, suspendReason,
    withdrawalsEnabled, withdrawalBlockMessage,
    depositsEnabled, investmentsEnabled, algoTradingEnabled,
    copyTradingEnabled, eaTradingEnabled, mt5Enabled,
  } = body as BulkUserUpdates & {
    email?: string; fullName?: string; phone?: string;
    balanceFiat?: number; balanceCrypto?: number;
    password?: string; isPromoter?: boolean; promoterCommissionType?: string;
  };

  if (email !== undefined) updates.email = String(email).toLowerCase();
  if (fullName !== undefined) updates.fullName = fullName;
  if (phone !== undefined) updates.phone = phone || null;
  if (role !== undefined) {
    if (!["user", "manager", "support", "admin", "superadmin"].includes(String(role))) {
      throw new Error("Invalid role");
    }
    updates.role = role;
  }
  if (kycStatus !== undefined) updates.kycStatus = kycStatus;
  if (balanceFiat !== undefined) updates.balanceFiat = String(balanceFiat);
  if (balanceCrypto !== undefined) updates.balanceCrypto = String(balanceCrypto);
  if (isActive !== undefined) updates.isActive = isActive;
  if (isPromoter !== undefined) {
    updates.isPromoter = !!isPromoter;
    if (isPromoter && !existing.isPromoter) updates.promoterEnabledAt = new Date();
  }
  if (promoterCommissionType !== undefined) updates.promoterCommissionType = promoterCommissionType || null;
  if (suspendReason !== undefined) updates.suspendReason = suspendReason || null;
  if (withdrawalsEnabled !== undefined) updates.withdrawalsEnabled = !!withdrawalsEnabled;
  if (withdrawalBlockMessage !== undefined) {
    updates.withdrawalBlockMessage = withdrawalBlockMessage?.trim() || null;
  }
  if (depositsEnabled !== undefined) updates.depositsEnabled = !!depositsEnabled;
  if (investmentsEnabled !== undefined) updates.investmentsEnabled = !!investmentsEnabled;
  if (algoTradingEnabled !== undefined) updates.algoTradingEnabled = !!algoTradingEnabled;
  if (copyTradingEnabled !== undefined) updates.copyTradingEnabled = !!copyTradingEnabled;
  if (eaTradingEnabled !== undefined) updates.eaTradingEnabled = !!eaTradingEnabled;
  if (mt5Enabled !== undefined) updates.mt5Enabled = !!mt5Enabled;
  if (managerId !== undefined) updates.managerId = managerId;
  if (password) {
    if (password.length < 8) throw new Error("Password must be at least 8 characters");
    updates.passwordHash = await bcrypt.hash(password, 10);
  }

  let clientsReleased = 0;
  if (updates.role === "user" && existing.role === "manager") {
    clientsReleased = await releaseManagerClients(id);
  }
  if (updates.role === "manager") {
    updates.managerId = null;
  }

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  return { user: user!, clientsReleased };
}
