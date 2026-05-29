import {
  db, usersTable, ticketsTable, ticketRepliesTable, notificationsTable,
} from "@workspace/db";
import { eq } from "@workspace/db/orm";
import { mapTicket } from "../routes/tickets";

export const STAFF_ESCALATION_CATEGORY = "Staff Escalation";

export type StaffEscalationInput = {
  reporterUserId: number;
  reporterRole: string;
  reporterName: string;
  subjectUserId: number;
  issueType: string;
  subject: string;
  message: string;
  priority?: "low" | "medium" | "high" | "urgent";
};

export async function createStaffEscalation(input: StaffEscalationInput) {
  const [subjectUser] = await db.select().from(usersTable)
    .where(eq(usersTable.id, input.subjectUserId)).limit(1);
  if (!subjectUser) throw new Error("User not found");

  const roleLabel = input.reporterRole === "manager" ? "Manager" : "Support";
  const fullSubject = `[${roleLabel}] ${input.issueType}: ${input.subject}`;
  const body = [
    input.message.trim(),
    "",
    "---",
    `Investor: ${subjectUser.fullName} (${subjectUser.email}) · ID #${subjectUser.id}`,
    `Reported by: ${input.reporterName} (${roleLabel})`,
  ].join("\n");

  const [ticket] = await db.insert(ticketsTable).values({
    userId: input.subjectUserId,
    subject: fullSubject,
    message: body,
    category: STAFF_ESCALATION_CATEGORY,
    priority: input.priority || "high",
    status: "open",
  }).returning();

  await db.insert(ticketRepliesTable).values({
    ticketId: ticket!.id,
    userId: input.reporterUserId,
    message: `Escalation logged by ${input.reporterName} (${roleLabel}). Super Admin must approve or resolve the underlying issue.`,
    isAdmin: true,
  });

  const superAdmins = await db.select().from(usersTable)
    .where(eq(usersTable.role, "superadmin"));

  for (const admin of superAdmins) {
    await db.insert(notificationsTable).values({
      userId: admin.id,
      title: "Staff escalation — Super Admin action required",
      message: `${input.reporterName} (${roleLabel}): ${input.subject}`,
      type: "warning",
      category: "support",
      actionUrl: "/super-admin/support",
    });
  }

  return {
    ticketId: ticket!.id,
    ticket: await mapTicket(ticket!, subjectUser.email, subjectUser.fullName),
  };
}
