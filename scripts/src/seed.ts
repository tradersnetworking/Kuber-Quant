import { db, investmentPlansTable, usersTable, notificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding investment plans...");
  await db.insert(investmentPlansTable).values([
    { name: "Starter Plan", description: "Perfect for new investors. Low risk, steady returns.", minAmount: "500", maxAmount: "5000", roiPercent: "8.5", durationDays: 30, currency: "USD", isActive: true, totalInvestors: 1247, category: "starter" },
    { name: "Growth Plan", description: "Balanced portfolio for consistent wealth growth.", minAmount: "5000", maxAmount: "25000", roiPercent: "15.0", durationDays: 60, currency: "USD", isActive: true, totalInvestors: 834, category: "growth" },
    { name: "Premium Plan", description: "Advanced strategies for seasoned investors.", minAmount: "25000", maxAmount: "100000", roiPercent: "24.0", durationDays: 90, currency: "USD", isActive: true, totalInvestors: 312, category: "premium" },
    { name: "Elite Plan", description: "Exclusive hedge fund strategies. Maximum returns.", minAmount: "100000", maxAmount: "1000000", roiPercent: "36.0", durationDays: 180, currency: "USD", isActive: true, totalInvestors: 89, category: "elite" },
    { name: "Crypto Starter", description: "Entry level crypto investment plan.", minAmount: "0.05", maxAmount: "0.5", roiPercent: "12.0", durationDays: 30, currency: "BTC", isActive: true, totalInvestors: 567, category: "starter" },
    { name: "DeFi Growth", description: "Decentralized finance yield strategies.", minAmount: "1000", maxAmount: "10000", roiPercent: "18.0", durationDays: 45, currency: "USDT", isActive: true, totalInvestors: 423, category: "growth" },
  ]).onConflictDoNothing();
  console.log("Plans seeded.");

  console.log("Adding manager user...");
  const hash = await bcrypt.hash("manager123", 10);
  await db.insert(usersTable).values({
    email: "manager@kubercapital.com",
    passwordHash: hash,
    fullName: "Ravi Sharma",
    role: "manager",
    kycStatus: "verified",
    balanceFiat: "0",
    balanceCrypto: "0",
    totalProfit: "0",
    referralCode: "KCMGR01",
    isActive: true,
  }).onConflictDoNothing();
  console.log("Manager added.");

  console.log("Updating existing users...");
  await db.update(usersTable)
    .set({ referralCode: "KCADMIN1", phone: "+91-9876543210" })
    .where(eq(usersTable.email, "admin@tradepro.com"));
  await db.update(usersTable)
    .set({ referralCode: "KCUSER01", phone: "+91-9123456789", balanceFiat: "12450.00", balanceCrypto: "0.45", totalProfit: "2340.00" })
    .where(eq(usersTable.email, "john.doe@example.com"));
  console.log("Users updated.");

  console.log("Seeding notifications...");
  const users = await db.select({ id: usersTable.id }).from(usersTable).limit(5);
  for (const u of users) {
    await db.insert(notificationsTable).values([
      { userId: u.id, title: "Welcome to Kuber Capital!", message: "Complete KYC to unlock all features and higher investment limits.", type: "info", isRead: false },
      { userId: u.id, title: "Elite Plan Available", message: "New Elite Plan offering up to 36% ROI is now available. Limited slots!", type: "success", isRead: false },
      { userId: u.id, title: "Market Alert", message: "BTC surged 8% in the last 24 hours. Check your crypto portfolio.", type: "warning", isRead: false },
    ]).onConflictDoNothing();
  }
  console.log("Notifications seeded.");
  console.log("All done!");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
