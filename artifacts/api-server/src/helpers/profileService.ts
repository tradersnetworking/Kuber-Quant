import { db, usersTable, userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getWalletFinancialSummary } from "./walletService";

async function mapUserBasic(user: typeof usersTable.$inferSelect) {
  const summary = await getWalletFinancialSummary(user.id);
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone || null,
    role: user.role,
    kycStatus: user.kycStatus,
    balanceFiat: summary.fiatBalance,
    balanceCrypto: summary.cryptoBalance,
    totalProfit: Number(user.totalProfit),
    referralCode: user.referralCode || null,
    referralCount: user.referralCount || 0,
    referralEarnings: Number(user.referralEarnings || 0),
    avatarUrl: user.avatarUrl || null,
    managerId: user.managerId || null,
    isActive: user.isActive,
    twoFactorEnabled: user.twoFactorEnabled || false,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function getUserProfile(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return null;

  const [profile] = await db.select().from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId)).limit(1);

  return {
    user: await mapUserBasic(user),
    profile: profile ? {
      username: profile.username || null,
      dateOfBirth: profile.dateOfBirth || null,
      gender: profile.gender || null,
      nationality: profile.nationality || null,
      country: profile.country || null,
      state: profile.state || null,
      city: profile.city || null,
      address: profile.address || null,
      postalCode: profile.postalCode || null,
      taxId: profile.taxId || null,
      occupation: profile.occupation || null,
      annualIncomeRange: profile.annualIncomeRange || null,
      investmentExperience: profile.investmentExperience || null,
      riskAppetite: profile.riskAppetite || null,
      preferredInvestmentType: profile.preferredInvestmentType || null,
      sourceOfFunds: profile.sourceOfFunds || null,
      investorId: profile.investorId || null,
      onboardingCompletedAt: profile.onboardingCompletedAt?.toISOString() || null,
    } : null,
  };
}

export async function updateUserProfile(userId: number, body: Record<string, unknown>) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return null;

  const userUpdates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.fullName !== undefined) userUpdates.fullName = String(body.fullName).trim();
  if (body.phone !== undefined) userUpdates.phone = body.phone ? String(body.phone).trim() : null;

  if (Object.keys(userUpdates).length > 1) {
    await db.update(usersTable).set(userUpdates).where(eq(usersTable.id, userId));
  }

  const profileFields = [
    "username", "dateOfBirth", "gender", "nationality", "country", "state",
    "city", "address", "postalCode", "taxId", "occupation", "annualIncomeRange",
    "investmentExperience", "riskAppetite", "preferredInvestmentType", "sourceOfFunds",
  ] as const;

  const profileUpdates: Record<string, unknown> = { updatedAt: new Date() };
  for (const f of profileFields) {
    if (body[f] !== undefined) {
      profileUpdates[f] = body[f] === "" ? null : body[f];
    }
  }

  if (body.username !== undefined && body.username) {
    const username = String(body.username).toLowerCase().trim();
    const [taken] = await db.select({ userId: userProfilesTable.userId })
      .from(userProfilesTable)
      .where(eq(userProfilesTable.username, username))
      .limit(1);
    if (taken && taken.userId !== userId) {
      throw new Error("Username is already taken");
    }
    profileUpdates.username = username;
  }

  const [existingProfile] = await db.select().from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId)).limit(1);

  if (existingProfile) {
    if (Object.keys(profileUpdates).length > 1) {
      await db.update(userProfilesTable).set(profileUpdates).where(eq(userProfilesTable.userId, userId));
    }
  } else if (Object.keys(profileUpdates).length > 1) {
    await db.insert(userProfilesTable).values({
      userId,
      ...profileUpdates,
    });
  }

  return getUserProfile(userId);
}
