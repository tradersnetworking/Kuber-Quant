import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const kycSubmitStatusEnum = pgEnum("kyc_submit_status", ["pending", "submitted", "verified", "rejected"]);
export const idTypeEnum = pgEnum("id_type", ["passport", "national_id", "drivers_license"]);

export const kycRecordsTable = pgTable("kyc_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  fullName: text("full_name"),
  address: text("address"),
  country: text("country"),
  idType: idTypeEnum("id_type"),
  idNumber: text("id_number"),
  panCard: text("pan_card"),
  aadhaarNumber: text("aadhaar_number"),
  bankAccountNumber: text("bank_account_number"),
  bankName: text("bank_name"),
  ifscCode: text("ifsc_code"),
  status: kycSubmitStatusEnum("status").notNull().default("submitted"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertKycRecordSchema = createInsertSchema(kycRecordsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertKycRecord = z.infer<typeof insertKycRecordSchema>;
export type KycRecord = typeof kycRecordsTable.$inferSelect;
