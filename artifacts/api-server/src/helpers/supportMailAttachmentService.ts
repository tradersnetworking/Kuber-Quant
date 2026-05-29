import path from "path";
import fs from "fs";
import {
  db, supportMailAttachmentsTable, type SupportMailAttachment,
} from "@workspace/db";
import { and, eq, inArray, isNull } from "@workspace/db/orm";
import { getUploadRoot, getUploadUrl } from "../middlewares/upload";

export type MailAttachmentDto = {
  id: number;
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
};

export function mapMailAttachment(row: SupportMailAttachment): MailAttachmentDto {
  return {
    id: row.id,
    filename: row.filename,
    url: getUploadUrl("mail_attachments", row.storedFilename),
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
  };
}

export async function loadAttachmentsByMessageIds(messageIds: number[]): Promise<Map<number, MailAttachmentDto[]>> {
  const map = new Map<number, MailAttachmentDto[]>();
  if (!messageIds.length) return map;

  const rows = await db.select().from(supportMailAttachmentsTable)
    .where(inArray(supportMailAttachmentsTable.messageId, messageIds));

  for (const row of rows) {
    if (!row.messageId) continue;
    const list = map.get(row.messageId) || [];
    list.push(mapMailAttachment(row));
    map.set(row.messageId, list);
  }
  return map;
}

export async function stageMailAttachments(
  files: Express.Multer.File[],
  uploadedByUserId: number,
): Promise<MailAttachmentDto[]> {
  const staged: MailAttachmentDto[] = [];
  for (const file of files) {
    const [row] = await db.insert(supportMailAttachmentsTable).values({
      uploadedByUserId,
      filename: file.originalname,
      storedFilename: file.filename,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    }).returning();
    staged.push(mapMailAttachment(row!));
  }
  return staged;
}

export async function linkStagedAttachmentsToMessage(
  attachmentIds: number[],
  messageId: number,
  staffUserId: number,
): Promise<MailAttachmentDto[]> {
  if (!attachmentIds.length) return [];

  const rows = await db.select().from(supportMailAttachmentsTable)
    .where(and(
      inArray(supportMailAttachmentsTable.id, attachmentIds),
      eq(supportMailAttachmentsTable.uploadedByUserId, staffUserId),
      isNull(supportMailAttachmentsTable.messageId),
    ));

  if (rows.length !== attachmentIds.length) {
    throw new Error("One or more attachments are invalid or already linked");
  }

  await db.update(supportMailAttachmentsTable)
    .set({ messageId })
    .where(inArray(supportMailAttachmentsTable.id, attachmentIds));

  return rows.map(mapMailAttachment);
}

export async function getAttachmentFilesForSend(attachmentIds: number[], staffUserId: number) {
  if (!attachmentIds.length) return [];

  const rows = await db.select().from(supportMailAttachmentsTable)
    .where(and(
      inArray(supportMailAttachmentsTable.id, attachmentIds),
      eq(supportMailAttachmentsTable.uploadedByUserId, staffUserId),
      isNull(supportMailAttachmentsTable.messageId),
    ));

  return rows.map(row => ({
    filename: row.filename,
    path: path.join(getUploadRoot(), "mail_attachments", row.storedFilename),
    contentType: row.mimeType,
  }));
}

export async function saveInboundMailAttachments(
  messageId: number,
  attachments: Array<{ filename: string; content: Buffer; contentType: string }>,
  uploadedByUserId = 0,
) {
  if (!attachments.length) return [];

  const destDir = path.join(getUploadRoot(), "mail_attachments");
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  const saved: MailAttachmentDto[] = [];
  for (const att of attachments) {
    const ext = path.extname(att.filename).toLowerCase() || ".bin";
    const storedFilename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const filePath = path.join(destDir, storedFilename);
    fs.writeFileSync(filePath, att.content);

    const [row] = await db.insert(supportMailAttachmentsTable).values({
      messageId,
      uploadedByUserId,
      filename: att.filename,
      storedFilename,
      mimeType: att.contentType,
      sizeBytes: att.content.length,
    }).returning();

    saved.push(mapMailAttachment(row!));
  }
  return saved;
}
