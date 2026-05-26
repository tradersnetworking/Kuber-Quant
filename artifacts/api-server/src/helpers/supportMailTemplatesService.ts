import { db, supportMailTemplatesTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

export async function listSupportMailTemplates(activeOnly = true) {
  const rows = await db.select().from(supportMailTemplatesTable).orderBy(desc(supportMailTemplatesTable.updatedAt));
  return (activeOnly ? rows.filter(r => r.isActive) : rows).map(r => ({
    id: r.id,
    name: r.name,
    category: r.category,
    subject: r.subject,
    body: r.body,
    isActive: r.isActive,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function saveSupportMailTemplate(data: {
  id?: number;
  name: string;
  category: string;
  subject?: string;
  body: string;
  isActive?: boolean;
}) {
  if (data.id) {
    const [updated] = await db.update(supportMailTemplatesTable)
      .set({
        name: data.name,
        category: data.category,
        subject: data.subject ?? null,
        body: data.body,
        isActive: data.isActive ?? true,
      })
      .where(eq(supportMailTemplatesTable.id, data.id))
      .returning();
    return updated;
  }
  const [inserted] = await db.insert(supportMailTemplatesTable).values({
    name: data.name,
    category: data.category,
    subject: data.subject ?? null,
    body: data.body,
    isActive: data.isActive ?? true,
  }).returning();
  return inserted;
}

export async function deleteSupportMailTemplate(id: number) {
  await db.delete(supportMailTemplatesTable).where(eq(supportMailTemplatesTable.id, id));
}

export function applyTemplateVariables(body: string, vars: Record<string, string>) {
  let out = body;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}
