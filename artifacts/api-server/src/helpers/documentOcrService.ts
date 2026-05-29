import fs from "fs";
import path from "path";
import { db, documentValidationsTable } from "@workspace/db";
import { eq, desc } from "@workspace/db/orm";
import { logger } from "../lib/logger";
import { getUploadRoot } from "../middlewares/upload";
import { readUploadObject } from "./objectStorage";

export type DocumentOcrResult = {
  passed: boolean;
  riskScore: number;
  flags: string[];
  summary: string;
};

function isOcrEnabled(): boolean {
  if (process.env.DOCUMENT_OCR_ENABLED === "false") return false;
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function parseUploadPath(documentUrl: string): { subdir: string; filename: string } | null {
  const secure = documentUrl.match(/\/uploads-secure\/([^/]+)\/([^/?#]+)/);
  if (secure) return { subdir: secure[1], filename: secure[2] };
  const local = documentUrl.match(/\/uploads\/([^/]+)\/([^/?#]+)/);
  if (local) return { subdir: local[1], filename: local[2] };
  return null;
}

async function loadImageBase64(subdir: string, filename: string): Promise<{ mime: string; data: string } | null> {
  const uploadRoot = getUploadRoot();
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".pdf") return null;

  const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  const obj = await readUploadObject(uploadRoot, subdir, filename);
  if (!obj) return null;

  let buffer: Buffer;
  if ("localPath" in obj) {
    buffer = fs.readFileSync(obj.localPath);
  } else {
    const chunks: Buffer[] = [];
    for await (const chunk of obj.stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    buffer = Buffer.concat(chunks);
  }

  return { mime, data: buffer.toString("base64") };
}

async function callVisionOcr(opts: {
  imageBase64: string;
  mime: string;
  documentType: string;
  expectedName?: string;
}): Promise<DocumentOcrResult | null> {
  const apiKey = process.env.OPENAI_API_KEY!.trim();
  const base = process.env.OPENAI_API_BASE?.trim() || "https://api.openai.com/v1";
  const model = process.env.OPENAI_VISION_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const system = [
    "You validate identity and payment proof documents for a financial platform.",
    "Respond with JSON only: {\"passed\":boolean,\"riskScore\":0-100,\"flags\":string[],\"summary\":string}.",
    "Flags examples: blurry_image, not_a_document, name_mismatch, expired_document, tampered, missing_face, screenshot_only.",
    "passed=true only when the image clearly shows a legitimate document of the stated type.",
    "Do not extract or return full ID numbers — only note format issues.",
  ].join(" ");

  const userText = [
    `Document type: ${opts.documentType}`,
    opts.expectedName ? `Expected holder name: ${opts.expectedName}` : "",
    "Assess authenticity, readability, and whether it matches the document type.",
  ].filter(Boolean).join("\n");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: `data:${opts.mime};base64,${opts.imageBase64}` } },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 400,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      logger.warn({ status: res.status }, "Document OCR API error");
      return null;
    }

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;

    const parsed = JSON.parse(raw) as DocumentOcrResult;
    return {
      passed: !!parsed.passed,
      riskScore: Math.max(0, Math.min(100, Number(parsed.riskScore) || 0)),
      flags: Array.isArray(parsed.flags) ? parsed.flags.map(String) : [],
      summary: String(parsed.summary || "").slice(0, 500),
    };
  } catch (err) {
    logger.warn({ err }, "Document OCR failed");
    return null;
  }
}

export async function validateDocumentImage(opts: {
  userId: number;
  category: "kyc" | "deposit";
  referenceId?: number;
  documentType: string;
  documentUrl: string;
  expectedName?: string;
}): Promise<DocumentOcrResult | null> {
  if (!isOcrEnabled()) return null;

  const parsed = parseUploadPath(opts.documentUrl);
  if (!parsed) return null;

  const image = await loadImageBase64(parsed.subdir, parsed.filename);
  if (!image) return null;

  const result = await callVisionOcr({
    imageBase64: image.data,
    mime: image.mime,
    documentType: opts.documentType,
    expectedName: opts.expectedName,
  });
  if (!result) return null;

  await db.insert(documentValidationsTable).values({
    userId: opts.userId,
    category: opts.category,
    referenceId: opts.referenceId || null,
    documentType: opts.documentType,
    documentUrl: opts.documentUrl,
    passed: result.passed,
    riskScore: result.riskScore,
    flags: JSON.stringify(result.flags),
    summary: result.summary,
  }).catch(err => logger.warn({ err }, "Failed to persist document validation"));

  return result;
}

export async function getDocumentValidationsForUser(userId: number, referenceId?: number) {
  const rows = referenceId
    ? await db.select().from(documentValidationsTable)
      .where(eq(documentValidationsTable.userId, userId))
      .orderBy(desc(documentValidationsTable.createdAt))
    : await db.select().from(documentValidationsTable)
      .where(eq(documentValidationsTable.userId, userId))
      .orderBy(desc(documentValidationsTable.createdAt));

  return rows
    .filter(r => !referenceId || r.referenceId === referenceId)
    .map(r => ({
      id: r.id,
      category: r.category,
      documentType: r.documentType,
      passed: r.passed,
      riskScore: r.riskScore,
      flags: JSON.parse(r.flags || "[]") as string[],
      summary: r.summary,
      createdAt: r.createdAt.toISOString(),
    }));
}

export async function validateKycDocumentsAsync(opts: {
  userId: number;
  kycId: number;
  fullName: string;
  documents: Array<{ type: string; url: string | null | undefined }>;
}): Promise<void> {
  for (const doc of opts.documents) {
    if (!doc.url) continue;
    await validateDocumentImage({
      userId: opts.userId,
      category: "kyc",
      referenceId: opts.kycId,
      documentType: doc.type,
      documentUrl: doc.url,
      expectedName: opts.fullName,
    });
  }
}

export async function validateDepositProofAsync(opts: {
  userId: number;
  transactionId: number;
  proofUrl: string;
}): Promise<void> {
  await validateDocumentImage({
    userId: opts.userId,
    category: "deposit",
    referenceId: opts.transactionId,
    documentType: "payment_proof",
    documentUrl: opts.proofUrl,
  });
}
