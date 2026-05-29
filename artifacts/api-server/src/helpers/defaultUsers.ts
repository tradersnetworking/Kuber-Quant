import bcrypt from "bcryptjs";

import { db, usersTable } from "@workspace/db";

import { eq } from "@workspace/db/orm";



/** Legacy demo emails — mapped at login only (admin stays admin). */

export const LEGACY_EMAIL_ALIASES: Record<string, string> = {

  "superadmin@kubercapital.com": "superadmin@kuberquant.com",

  "admin@kubercapital.com": "admin@kuberquant.com",

  "manager@kubercapital.com": "manager@kuberquant.com",

  "support@kubercapital.com": "support@kuberquant.com",

  "user@kubercapital.com": "user@kuberquant.com",

};



export type DefaultUserSeed = {

  email: string;

  password: string;

  fullName: string;

  role: "user" | "manager" | "support" | "admin" | "superadmin";

  referralCode: string;

  isPromoter?: boolean;

  promoterCommissionType?: "cpa" | "revenue_share" | "hybrid" | "multi_level";

  balanceFiat?: string;

  kycStatus?: "pending" | "submitted" | "verified" | "rejected";

};



export const DEFAULT_PLATFORM_USERS: DefaultUserSeed[] = [

  {

    email: "superadmin@kuberquant.com",

    password: "superadmin123",

    fullName: "Super Admin",

    role: "superadmin",

    referralCode: "KCSUPER1",

  },

  {

    email: "admin@kuberquant.com",

    password: "admin123",

    fullName: "Platform Admin",

    role: "admin",

    referralCode: "KCADMIN1",

  },

  {

    email: "manager@kuberquant.com",

    password: "manager123",

    fullName: "Ravi Sharma",

    role: "manager",

    referralCode: "KCMGR01",

    isPromoter: true,

    promoterCommissionType: "revenue_share",

  },

  {

    email: "support@kuberquant.com",

    password: "support123",

    fullName: "Support Agent",

    role: "support",

    referralCode: "KCSUP01",

  },

  {

    email: "user@kuberquant.com",

    password: "user123",

    fullName: "John Investor",

    role: "user",

    referralCode: "KCUSER01",

    balanceFiat: "12450.00",

    kycStatus: "verified",

  },

];



export function resolveLoginEmail(email: string): string {

  const normalized = email.trim().toLowerCase();

  return LEGACY_EMAIL_ALIASES[normalized] ?? normalized;

}



export async function migrateLegacyEmails(): Promise<void> {

  for (const [oldEmail, newEmail] of Object.entries(LEGACY_EMAIL_ALIASES)) {

    if (oldEmail === newEmail) continue;

    const [existingNew] = await db.select().from(usersTable).where(eq(usersTable.email, newEmail)).limit(1);

    const [existingOld] = await db.select().from(usersTable).where(eq(usersTable.email, oldEmail)).limit(1);

    if (!existingOld) continue;

    if (existingNew) {

      await db.delete(usersTable).where(eq(usersTable.email, oldEmail));

    } else {

      await db.update(usersTable).set({ email: newEmail }).where(eq(usersTable.email, oldEmail));

    }

  }

}



export async function upsertDefaultUsers(options: { resetPasswords?: boolean } = {}): Promise<void> {

  const resetPasswords = options.resetPasswords ?? false;



  for (const u of DEFAULT_PLATFORM_USERS) {

    const hash = await bcrypt.hash(u.password, 10);

    const base = {

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

      ...(u.isPromoter

        ? { isPromoter: true, promoterCommissionType: u.promoterCommissionType, promoterEnabledAt: new Date() }

        : {}),

    };



    if (resetPasswords) {

      await db.insert(usersTable).values(base).onConflictDoUpdate({

        target: usersTable.email,

        set: {

          passwordHash: hash,

          fullName: u.fullName,

          role: u.role,

          kycStatus: u.kycStatus ?? "verified",

          isActive: true,

          ...(u.balanceFiat ? { balanceFiat: u.balanceFiat } : {}),

          ...(u.isPromoter

            ? { isPromoter: true, promoterCommissionType: u.promoterCommissionType, promoterEnabledAt: new Date() }

            : {}),

        },

      });

    } else {

      await db.insert(usersTable).values(base).onConflictDoUpdate({

        target: usersTable.email,

        set: {

          fullName: u.fullName,

          role: u.role,

          kycStatus: u.kycStatus ?? "verified",

          isActive: true,

          ...(u.balanceFiat ? { balanceFiat: u.balanceFiat } : {}),

          ...(u.isPromoter

            ? { isPromoter: true, promoterCommissionType: u.promoterCommissionType, promoterEnabledAt: new Date() }

            : { isPromoter: false, promoterCommissionType: null }),

        },

      });

    }

  }

}


