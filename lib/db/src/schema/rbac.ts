import { pgTable, text, serial, timestamp, integer, primaryKey } from "drizzle-orm/pg-core";

/** Enterprise RBAC — permissions mapped to platform roles */
export const permissionsTable = pgTable("permissions", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("general"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rolePermissionsTable = pgTable("role_permissions", {
  role: text("role").notNull(),
  permissionId: integer("permission_id").notNull().references(() => permissionsTable.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.role, t.permissionId] })]);

export type Permission = typeof permissionsTable.$inferSelect;
export type RolePermission = typeof rolePermissionsTable.$inferSelect;
