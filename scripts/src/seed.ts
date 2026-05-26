import {
  db, investmentPlansTable, usersTable, notificationsTable,
  mt5RequestsTable, mt5AccountsTable, copyTradersTable, siteSettingsTable,
  paymentGatewaysTable, supportInboxTable, supportMailTemplatesTable,
  userPaymentAccountsTable, userProfilesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "true") {
    console.error("Refusing to seed in production. Set ALLOW_SEED=true to override.");
    process.exit(1);
  }
  console.log("Migrating legacy @kubercapital.com emails to @kuberquant.com...");
  const emailMigrations: [string, string][] = [
    ["superadmin@kubercapital.com", "superadmin@kuberquant.com"],
    ["admin@kubercapital.com", "admin@kuberquant.com"],
    ["manager@kubercapital.com", "manager@kuberquant.com"],
    ["user@kubercapital.com", "user@kuberquant.com"],
  ];
  for (const [oldEmail, newEmail] of emailMigrations) {
    const [existingNew] = await db.select().from(usersTable).where(eq(usersTable.email, newEmail)).limit(1);
    const [existingOld] = await db.select().from(usersTable).where(eq(usersTable.email, oldEmail)).limit(1);
    if (existingOld) {
      if (existingNew) {
        await db.delete(usersTable).where(eq(usersTable.email, oldEmail));
      } else {
        await db.update(usersTable).set({ email: newEmail }).where(eq(usersTable.email, oldEmail));
      }
    }
  }
  console.log("Email migration complete.");

  console.log("Seeding default users...");
  const defaultUsers = [
    { email: "superadmin@kuberquant.com", password: "superadmin123", fullName: "Super Admin", role: "superadmin" as const, referralCode: "KCSUPER1" },
    { email: "admin@kuberquant.com", password: "admin123", fullName: "Platform Admin", role: "admin" as const, referralCode: "KCADMIN1" },
    { email: "manager@kuberquant.com", password: "manager123", fullName: "Ravi Sharma", role: "manager" as const, referralCode: "KCMGR01", isPromoter: true, promoterCommissionType: "revenue_share" as const },
    { email: "support@kuberquant.com", password: "support123", fullName: "Support Agent", role: "support" as const, referralCode: "KCSUP01" },
    { email: "user@kuberquant.com", password: "user123", fullName: "John Investor", role: "user" as const, referralCode: "KCUSER01", balanceFiat: "12450.00", kycStatus: "verified" as const },
  ];
  for (const u of defaultUsers) {
    const hash = await bcrypt.hash(u.password, 10);
    await db.insert(usersTable).values({
      email: u.email,
      passwordHash: hash,
      fullName: u.fullName,
      role: u.role,
      kycStatus: u.kycStatus ?? "verified",
      balanceFiat: u.balanceFiat ?? "0",
      balanceCrypto: "0",
      totalProfit: "0",
      referralCode: u.referralCode,
      isActive: true,
      ...(u.isPromoter ? { isPromoter: true, promoterCommissionType: u.promoterCommissionType, promoterEnabledAt: new Date() } : {}),
    }).onConflictDoUpdate({
      target: usersTable.email,
      set: {
        passwordHash: hash,
        fullName: u.fullName,
        role: u.role,
        kycStatus: u.kycStatus ?? "verified",
        isActive: true,
        ...(u.balanceFiat ? { balanceFiat: u.balanceFiat } : {}),
        ...(u.isPromoter ? { isPromoter: true, promoterCommissionType: u.promoterCommissionType, promoterEnabledAt: new Date() } : {}),
      },
    });
  }
  console.log("Default users seeded.");

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

  console.log("Seeding payment gateways (UPI, bank, crypto)...");
  const existingGw = await db.select().from(paymentGatewaysTable).limit(1);
  if (existingGw.length === 0) {
    await db.insert(paymentGatewaysTable).values([
      {
        name: "Kuber Quant UPI — Paytm",
        type: "upi",
        description: "Primary UPI for deposits",
        upiId: "kuberquant@paytm",
        minAmount: "100",
        isEnabled: true,
        sortOrder: 1,
        extraConfig: { badge: "Recommended" },
      },
      {
        name: "Kuber Quant UPI — PhonePe",
        type: "upi",
        description: "Secondary UPI account",
        upiId: "kuberquant@ybl",
        minAmount: "100",
        isEnabled: true,
        sortOrder: 2,
      },
      {
        name: "Kuber Quant UPI — GPay",
        type: "upi",
        description: "Google Pay UPI",
        upiId: "kuberquant@okaxis",
        minAmount: "100",
        isEnabled: true,
        sortOrder: 3,
      },
      {
        name: "UPI Account 4 — Baroda MPay",
        type: "upi",
        description: "Bank of Baroda UPI",
        upiId: "kuberquant@barodampay",
        minAmount: "100",
        isEnabled: true,
        sortOrder: 4,
      },
      {
        name: "UPI Account 5 — BHIM",
        type: "upi",
        description: "BHIM / NPCI UPI",
        upiId: "kuberquant@upi",
        minAmount: "100",
        isEnabled: true,
        sortOrder: 5,
      },
      {
        name: "HDFC Bank — Kuber Quant",
        type: "bank",
        description: "NEFT / IMPS / RTGS",
        minAmount: "500",
        isEnabled: true,
        sortOrder: 10,
        extraConfig: {
          accountHolderName: "Kuber Quant Pvt Ltd",
          bankName: "HDFC Bank",
          accountNumber: "50200012345678",
          ifscCode: "HDFC0001234",
          branchName: "Mumbai Main Branch",
          accountType: "Current",
        },
      },
      {
        name: "ICICI Bank — Kuber Quant",
        type: "bank",
        description: "Corporate current account",
        minAmount: "500",
        isEnabled: true,
        sortOrder: 11,
        extraConfig: {
          accountHolderName: "Kuber Quant Pvt Ltd",
          bankName: "ICICI Bank",
          accountNumber: "123456789012",
          ifscCode: "ICIC0001234",
          branchName: "Delhi Branch",
          accountType: "Current",
        },
      },
      {
        name: "SBI Bank Account 3",
        type: "bank",
        description: "State Bank of India — NEFT/IMPS",
        minAmount: "500",
        isEnabled: true,
        sortOrder: 12,
        extraConfig: {
          accountHolderName: "Kuber Quant Pvt Ltd",
          bankName: "State Bank of India",
          accountNumber: "38012345678",
          ifscCode: "SBIN0001234",
          branchName: "Bangalore Main",
          accountType: "Current",
        },
      },
      {
        name: "Axis Bank Account 4",
        type: "bank",
        description: "Axis Bank corporate account",
        minAmount: "500",
        isEnabled: true,
        sortOrder: 13,
        extraConfig: {
          accountHolderName: "Kuber Quant Pvt Ltd",
          bankName: "Axis Bank",
          accountNumber: "912345678901234",
          ifscCode: "UTIB0001234",
          branchName: "Hyderabad",
          accountType: "Current",
        },
      },
      {
        name: "Kotak Bank Account 5",
        type: "bank",
        description: "Kotak Mahindra Bank",
        minAmount: "500",
        isEnabled: true,
        sortOrder: 14,
        extraConfig: {
          accountHolderName: "Kuber Quant Pvt Ltd",
          bankName: "Kotak Mahindra Bank",
          accountNumber: "4412345678",
          ifscCode: "KKBK0001234",
          branchName: "Pune Branch",
          accountType: "Current",
        },
      },
      {
        name: "Bitcoin (BTC)",
        type: "crypto",
        symbol: "BTC",
        network: "Bitcoin",
        walletAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        minAmount: "50",
        isEnabled: true,
        sortOrder: 10,
      },
      {
        name: "Ethereum (ETH)",
        type: "crypto",
        symbol: "ETH",
        network: "ERC20",
        walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        minAmount: "50",
        isEnabled: true,
        sortOrder: 11,
      },
      {
        name: "USDT (TRC20)",
        type: "crypto",
        symbol: "USDT",
        network: "TRC20",
        walletAddress: "TXYZabcdefghijklmnopqrstuvwxyz123456",
        minAmount: "20",
        isEnabled: true,
        sortOrder: 12,
      },
      {
        name: "USDT (ERC20)",
        type: "crypto",
        symbol: "USDT",
        network: "ERC20",
        walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        minAmount: "20",
        isEnabled: true,
        sortOrder: 13,
      },
      {
        name: "USDT (BEP20)",
        type: "crypto",
        symbol: "USDT",
        network: "BEP20",
        walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        minAmount: "20",
        isEnabled: true,
        sortOrder: 14,
      },
      {
        name: "Tron (TRX)",
        type: "crypto",
        symbol: "TRX",
        network: "TRON",
        walletAddress: "TXYZabcdefghijklmnopqrstuvwxyz123456",
        minAmount: "20",
        isEnabled: true,
        sortOrder: 15,
      },
      {
        name: "BNB (BEP20)",
        type: "crypto",
        symbol: "BNB",
        network: "BEP20",
        walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        minAmount: "20",
        isEnabled: true,
        sortOrder: 16,
      },
      {
        name: "Dogecoin (DOGE)",
        type: "crypto",
        symbol: "DOGE",
        network: "Dogecoin",
        walletAddress: "DDogepartyxxxxxxxxxxxxxxxxxxw1dfn",
        minAmount: "20",
        isEnabled: true,
        sortOrder: 17,
      },
      {
        name: "Litecoin (LTC)",
        type: "crypto",
        symbol: "LTC",
        network: "Litecoin",
        walletAddress: "ltc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        minAmount: "20",
        isEnabled: true,
        sortOrder: 18,
      },
      {
        name: "Ripple (XRP)",
        type: "crypto",
        symbol: "XRP",
        network: "XRP Ledger",
        walletAddress: "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH",
        minAmount: "20",
        isEnabled: true,
        sortOrder: 19,
        extraConfig: { note: "Include destination tag if provided by support" },
      },
      { name: "Razorpay", type: "razorpay", description: "Cards, UPI, netbanking", minAmount: "100", isEnabled: true, sortOrder: 20 },
      { name: "PhonePe", type: "phonepe", description: "PhonePe checkout", minAmount: "100", isEnabled: true, sortOrder: 21 },
      { name: "Paytm", type: "paytm", description: "Paytm wallet checkout", minAmount: "100", isEnabled: false, sortOrder: 22 },
      { name: "PayU", type: "payu", description: "PayU gateway", minAmount: "100", isEnabled: true, sortOrder: 23 },
      { name: "Cashfree", type: "cashfree", description: "Cashfree payments", minAmount: "100", isEnabled: false, sortOrder: 24 },
      { name: "Stripe", type: "stripe", description: "International cards", minAmount: "10", isEnabled: false, sortOrder: 25 },
      { name: "Instamojo", type: "instamojo", description: "Payment links", minAmount: "100", isEnabled: false, sortOrder: 26 },
      { name: "Pine Labs", type: "pinelabs", description: "Pine Labs POS/online", minAmount: "100", isEnabled: false, sortOrder: 27 },
      { name: "Easebuzz", type: "easebuzz", description: "Easebuzz checkout", minAmount: "100", isEnabled: false, sortOrder: 28 },
      { name: "PayPal", type: "paypal", description: "International PayPal", minAmount: "10", isEnabled: false, sortOrder: 29 },
    ]);
    console.log("Payment gateways seeded.");
  }

  // Ensure at least 5 UPI, 5 bank, and full crypto set (for existing DBs)
  const allGw = await db.select().from(paymentGatewaysTable);
  const upiCount = allGw.filter(g => g.type === "upi").length;
  const bankCount = allGw.filter(g => ["bank", "fiat"].includes(g.type)).length;
  const hasDoge = allGw.some(g => g.type === "crypto" && g.symbol === "DOGE");

  const backfill: typeof paymentGatewaysTable.$inferInsert[] = [];

  const defaultUpi = [
    { name: "UPI Account 1 — Paytm", upiId: "kuberquant@paytm", sortOrder: 1, badge: "Recommended" },
    { name: "UPI Account 2 — PhonePe", upiId: "kuberquant@ybl", sortOrder: 2 },
    { name: "UPI Account 3 — GPay", upiId: "kuberquant@okaxis", sortOrder: 3 },
    { name: "UPI Account 4 — Baroda MPay", upiId: "kuberquant@barodampay", sortOrder: 4 },
    { name: "UPI Account 5 — BHIM", upiId: "kuberquant@upi", sortOrder: 5 },
  ];
  if (upiCount < 5) {
    for (let i = upiCount; i < 5; i++) {
      const u = defaultUpi[i];
      backfill.push({
        name: u.name, type: "upi", upiId: u.upiId, minAmount: "100", isEnabled: true, sortOrder: u.sortOrder,
        extraConfig: u.badge ? { badge: u.badge } : {},
      });
    }
  }

  const defaultBanks = [
    { name: "Bank Account 1 — HDFC", bankName: "HDFC Bank", accountNumber: "50200012345678", ifscCode: "HDFC0001234", sortOrder: 10 },
    { name: "Bank Account 2 — ICICI", bankName: "ICICI Bank", accountNumber: "123456789012", ifscCode: "ICIC0001234", sortOrder: 11 },
    { name: "Bank Account 3 — SBI", bankName: "State Bank of India", accountNumber: "38012345678", ifscCode: "SBIN0001234", sortOrder: 12 },
    { name: "Bank Account 4 — Axis", bankName: "Axis Bank", accountNumber: "912345678901234", ifscCode: "UTIB0001234", sortOrder: 13 },
    { name: "Bank Account 5 — Kotak", bankName: "Kotak Mahindra Bank", accountNumber: "4412345678", ifscCode: "KKBK0001234", sortOrder: 14 },
  ];
  if (bankCount < 5) {
    for (let i = bankCount; i < 5; i++) {
      const b = defaultBanks[i];
      backfill.push({
        name: b.name, type: "bank", minAmount: "500", isEnabled: true, sortOrder: b.sortOrder,
        extraConfig: {
          accountHolderName: "Kuber Quant Pvt Ltd",
          bankName: b.bankName,
          accountNumber: b.accountNumber,
          ifscCode: b.ifscCode,
          branchName: "Main Branch",
          accountType: "Current",
        },
      });
    }
  }

  if (!hasDoge) {
    backfill.push(
      { name: "Dogecoin (DOGE)", type: "crypto", symbol: "DOGE", network: "Dogecoin", walletAddress: "DDogepartyxxxxxxxxxxxxxxxxxxw1dfn", minAmount: "20", isEnabled: true, sortOrder: 17 },
      { name: "Litecoin (LTC)", type: "crypto", symbol: "LTC", network: "Litecoin", walletAddress: "ltc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", minAmount: "20", isEnabled: true, sortOrder: 18 },
      { name: "Ripple (XRP)", type: "crypto", symbol: "XRP", network: "XRP Ledger", walletAddress: "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH", minAmount: "20", isEnabled: true, sortOrder: 19 },
    );
  }

  const onlineCount = allGw.filter(g =>
    ["razorpay", "phonepe", "paytm", "payu", "cashfree", "stripe", "instamojo", "pinelabs", "easebuzz", "paypal"].includes(g.type),
  ).length;

  if (onlineCount === 0) {
    backfill.push(
      { name: "Razorpay", type: "razorpay", description: "Cards, UPI, netbanking", minAmount: "100", isEnabled: true, sortOrder: 20 },
      { name: "PhonePe", type: "phonepe", description: "PhonePe checkout", minAmount: "100", isEnabled: true, sortOrder: 21 },
      { name: "Paytm", type: "paytm", description: "Paytm wallet checkout", minAmount: "100", isEnabled: true, sortOrder: 22 },
      { name: "PayU", type: "payu", description: "PayU gateway", minAmount: "100", isEnabled: true, sortOrder: 23 },
      { name: "Cashfree", type: "cashfree", description: "Cashfree payments", minAmount: "100", isEnabled: false, sortOrder: 24 },
      { name: "Stripe", type: "stripe", description: "International cards", minAmount: "10", isEnabled: false, sortOrder: 25 },
      { name: "Instamojo", type: "instamojo", description: "Payment links", minAmount: "100", isEnabled: false, sortOrder: 26 },
      { name: "Pine Labs", type: "pinelabs", description: "Pine Labs POS/online", minAmount: "100", isEnabled: false, sortOrder: 27 },
      { name: "Easebuzz", type: "easebuzz", description: "Easebuzz checkout", minAmount: "100", isEnabled: false, sortOrder: 28 },
      { name: "PayPal", type: "paypal", description: "International PayPal", minAmount: "10", isEnabled: false, sortOrder: 29 },
    );
  }

  if (backfill.length) {
    await db.insert(paymentGatewaysTable).values(backfill);
    console.log(`Backfilled ${backfill.length} deposit account(s).`);
  }

  const [investor] = await db.select().from(usersTable).where(eq(usersTable.email, "user@kuberquant.com")).limit(1);
  const [manager] = await db.select().from(usersTable).where(eq(usersTable.email, "manager@kuberquant.com")).limit(1);

  if (investor) {
    const [existingProfile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, investor.id)).limit(1);
    if (!existingProfile) {
      await db.insert(userProfilesTable).values({
        userId: investor.id,
        username: "johninvestor",
        country: "India",
        city: "Mumbai",
        address: "123 Marine Drive",
        occupation: "Software Engineer",
        investorId: `KQ-INV-${String(investor.id).padStart(5, "0")}`,
        onboardingCompletedAt: new Date(),
      });
    }
    const [existingPayout] = await db.select().from(userPaymentAccountsTable).where(eq(userPaymentAccountsTable.userId, investor.id)).limit(1);
    if (!existingPayout) {
      await db.insert(userPaymentAccountsTable).values([
        {
          userId: investor.id,
          label: "Primary Bank",
          accountType: "bank",
          accountHolderName: "John Investor",
          bankName: "HDFC Bank",
          accountNumber: "501234567890",
          ifscCode: "HDFC0001234",
          isDefault: true,
        },
        {
          userId: investor.id,
          label: "UPI",
          accountType: "upi",
          upiId: "johninvestor@hdfcbank",
          accountHolderName: "John Investor",
          isDefault: false,
        },
        {
          userId: investor.id,
          label: "USDT TRC20",
          accountType: "crypto",
          cryptoSymbol: "USDT",
          cryptoNetwork: "TRC20",
          walletAddress: "TXyzDemoWalletAddress123456789",
          isDefault: false,
        },
      ]);
      console.log("Demo payout accounts seeded for investor.");
    }
  }

  console.log("Seeding sample MT5 accounts...");
  const existingMt5Acc = await db.select().from(mt5AccountsTable).limit(1);
  if (existingMt5Acc.length === 0 && investor) {
    await db.insert(mt5AccountsTable).values([
      { userId: investor.id, accountNumber: "50123456", broker: "IC Markets", serverName: "ICMarkets-Demo", balance: "12450.00", equity: "12890.50", profit: "440.50", status: "active", managerId: manager?.id ?? null },
      { userId: investor.id, accountNumber: "60987654", broker: "Exness", serverName: "Exness-MT5Real", balance: "8500.00", equity: "8320.00", profit: "-180.00", status: "active", managerId: manager?.id ?? null },
      { userId: investor.id, accountNumber: "77001234", broker: "XM Global", serverName: "XMGlobal-MT5", balance: "3200.00", equity: "3200.00", profit: "0", status: "pending_review", managerId: null },
    ]);
    console.log("MT5 accounts seeded.");
  }

  console.log("Seeding sample MT5 relay requests...");
  const existingMt5Req = await db.select().from(mt5RequestsTable).limit(1);
  if (existingMt5Req.length === 0 && investor) {
    await db.insert(mt5RequestsTable).values([
      { userId: investor.id, type: "copy_trading", profitSharingPercent: 25, status: "pending", details: "Platform: MT5 | Login: 50123456 | Server: ICMarkets-Demo | Master: Golden Scalper Pro" },
      { userId: investor.id, type: "account_handling", profitSharingPercent: 30, status: "forwarded", details: "Full account management — Balance $12,450 | Risk profile: Medium | Manager: Ravi Sharma" },
      { userId: investor.id, type: "copy_trading", profitSharingPercent: 20, status: "accepted", details: "Platform: MT5 | Login: 60987654 | Server: Exness-MT5Real | Master: FX Trend Hunter" },
      { userId: investor.id, type: "account_handling", profitSharingPercent: 35, status: "completed", details: "Account handling completed — Final profit share settled | Account: 60987654" },
      { userId: investor.id, type: "copy_trading", profitSharingPercent: 22, status: "rejected", details: "Platform: MT5 | Login: 77001234 | Reason: KYC pending verification" },
    ]);
    console.log("MT5 relay requests seeded.");
  }

  console.log("Seeding copy traders...");
  const existingCopy = await db.select().from(copyTradersTable).limit(1);
  if (existingCopy.length === 0) {
    await db.insert(copyTradersTable).values([
      { name: "Alex Mercer", bio: "Gold & indices specialist — 5yr verified track record", roi: "142.5", monthlyRoi: "11.8", followers: 384, winRate: "74.2", totalTrades: 1284, status: "active", minInvestment: "500", riskLevel: "medium" },
      { name: "Priya Nair", bio: "Forex swing trader focused on major pairs", roi: "98.3", monthlyRoi: "8.4", followers: 256, winRate: "69.5", totalTrades: 892, status: "active", minInvestment: "250", riskLevel: "low" },
      { name: "Marcus Chen", bio: "High-frequency crypto & NAS100 momentum", roi: "210.7", monthlyRoi: "15.2", followers: 512, winRate: "61.8", totalTrades: 2340, status: "active", minInvestment: "1000", riskLevel: "high" },
    ]);
    console.log("Copy traders seeded.");
  }

  console.log("Seeding EA strategy catalog preview...");
  const [eaSetting] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, "ea_catalog_json")).limit(1);
  if (!eaSetting) {
    const eaPreview = [
      { id: 1001, name: "Golden Scalper Pro", type: "scalping", description: "High-frequency scalping on XAUUSD.", backtestRoi: 84.2, winRate: 73.5, pairs: "XAUUSD", platform: "mt5", priceMonthly: 49, riskLevel: "High", category: "Gold" },
      { id: 1002, name: "FX Trend Hunter", type: "trend", description: "Multi-timeframe trend following on majors.", backtestRoi: 62.1, winRate: 68.2, pairs: "EURUSD, GBPUSD", platform: "mt5", priceMonthly: 39, riskLevel: "Medium", category: "Forex" },
      { id: 1003, name: "Grid Master Elite", type: "grid", description: "Adaptive grid for ranging markets.", backtestRoi: 71.8, winRate: 81.3, pairs: "EURUSD, GBPUSD", platform: "mt5", priceMonthly: 55, riskLevel: "Medium", category: "Grid" },
      { id: 1005, name: "Crypto Algo Trader", type: "trend", description: "BTC/ETH trend following with volume confirmation.", backtestRoi: 112.3, winRate: 61.2, pairs: "BTCUSD, ETHUSD", platform: "mt5", priceMonthly: 69, riskLevel: "Very High", category: "Crypto" },
    ];
    await db.insert(siteSettingsTable).values({
      key: "ea_catalog_json",
      value: JSON.stringify(eaPreview),
      label: "EA Strategy Catalog",
      category: "trading",
      description: "JSON catalog of EA strategies for the platform",
    });
    console.log("EA catalog seeded.");
  }

  console.log("Updating existing users...");
  await db.update(usersTable)
    .set({ referralCode: "KCADMIN1", phone: "+91-9876543210" })
    .where(eq(usersTable.email, "admin@kuberquant.com"));
  await db.update(usersTable)
    .set({ referralCode: "KCUSER01", phone: "+91-9123456789", balanceFiat: "12450.00", balanceCrypto: "0.45", totalProfit: "2340.00" })
    .where(eq(usersTable.email, "user@kuberquant.com"));
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

  console.log("Seeding support inbox demo messages...");
  const now = new Date();
  const demoMessages = [
    {
      externalMessageId: "demo-query-001",
      threadId: "demo-thread-query-001",
      direction: "inbound",
      fromEmail: "user@kuberquant.com",
      fromName: "John Investor",
      toEmail: "support@kuberquant.com",
      subject: "How do I link my MT5 account?",
      bodyText: "Hi, I registered yesterday and need help linking my MT5 account to start copy trading. Can you guide me through the steps?",
      category: "query",
      status: "unread",
      priority: "medium",
      slaDueAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      userId: investor?.id ?? null,
    },
    {
      externalMessageId: "demo-complaint-001",
      threadId: "demo-thread-complaint-001",
      direction: "inbound",
      fromEmail: "client@example.com",
      fromName: "Sarah Mitchell",
      toEmail: "support@kuberquant.com",
      subject: "Complaint — delayed withdrawal",
      bodyText: "My withdrawal has been pending for 5 days. I am very unhappy with the delay and need this resolved urgently.",
      category: "complaint",
      status: "unread",
      priority: "high",
      slaDueAt: new Date(now.getTime() + 8 * 60 * 60 * 1000),
    },
    {
      externalMessageId: "demo-dispute-001",
      threadId: "demo-thread-dispute-001",
      direction: "inbound",
      fromEmail: "dispute.client@example.com",
      fromName: "Alex Chen",
      toEmail: "support@kuberquant.com",
      subject: "Dispute — unauthorized deposit charge",
      bodyText: "I did not authorize a $500 deposit on my account. Please investigate this immediately as I suspect fraud.",
      category: "dispute",
      status: "read",
      priority: "urgent",
      slaDueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    },
  ];
  for (const msg of demoMessages) {
    await db.insert(supportInboxTable).values(msg).onConflictDoNothing();
  }
  console.log("Support inbox demo messages seeded.");

  console.log("Seeding support mail templates...");
  await db.insert(supportMailTemplatesTable).values([
    {
      name: "Welcome & Acknowledgement",
      category: "general",
      subject: "Re: {{subject}}",
      body: "Hi {{userName}},\n\nThank you for contacting Kuber Quant Support. We have received your message and a support agent will respond shortly.\n\nBest regards,\nKuber Quant Support Team",
    },
    {
      name: "Withdrawal Update",
      category: "complaint",
      body: "Hi {{userName}},\n\nWe understand your concern regarding your withdrawal. Our finance team is reviewing your request and will update you within 24 hours.\n\nTicket reference: {{ticketId}}\n\nRegards,\nKuber Quant Support",
    },
    {
      name: "Dispute Investigation",
      category: "dispute",
      body: "Hi {{userName}},\n\nWe take disputes seriously. Your case has been escalated to our compliance team for immediate review. We will contact you at {{userEmail}} with findings.\n\nRegards,\nKuber Quant Compliance",
    },
  ]).onConflictDoNothing();
  console.log("Support mail templates seeded.");

  console.log("All done!");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
