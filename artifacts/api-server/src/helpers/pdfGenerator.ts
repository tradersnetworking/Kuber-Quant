import PDFDocument from "pdfkit";
import { createHash } from "crypto";
import type { AgreementTemplateContent } from "./agreementTemplates";
import { loadUploadImageBuffer } from "./agreementAssetHelper";

const BRAND_GOLD = "#B8860B";
const INK = "#1A1A1A";
const MUTED = "#555555";
const BORDER = "#CCCCCC";
const MARGIN = 50;
const FOOTER_H = 36;
const HEADER_BODY_GAP = 10;

export interface PDFGenerationResult {
  buffer: Buffer;
  hash: string;
}

export async function generateAgreementPDF(opts: {
  template: AgreementTemplateContent;
  filledData: Record<string, string>;
  agreementUid: string;
  userName: string;
  signatureBase64?: string;
}): Promise<PDFGenerationResult> {
  const { template, filledData, agreementUid, userName, signatureBase64 } = opts;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGIN, bottom: MARGIN + FOOTER_H, left: MARGIN, right: MARGIN },
      autoFirstPage: true,
      bufferPages: true,
      info: {
        Title: template.title,
        Author: "Kuber Quant",
        Subject: "Legal Agreement",
        Keywords: "investment agreement legal kuber quant",
        CreationDate: new Date(),
      },
    });

    const buffers: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => buffers.push(chunk));
    doc.on("end", () => {
      const buffer = Buffer.concat(buffers);
      const hash = createHash("sha256").update(buffer).digest("hex");
      resolve({ buffer, hash });
    });
    doc.on("error", reject);

    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - MARGIN * 2;
    let firstPageAdded = true;

    function fillPlaceholders(text: string): string {
      return text.replace(/\{\{(\w+)\}\}/g, (_, key) => filledData[key] || `[${key}]`);
    }

    function bottomLimit() {
      return doc.page.height - MARGIN - FOOTER_H;
    }

    function syncPageCount() {
      /* PDFKit buffered page range — kept for future diagnostics */
      doc.bufferedPageRange();
    }

    function stampPageFooters() {
      const range = doc.bufferedPageRange();
      const total = range.count;
      for (let i = 0; i < total; i++) {
        doc.switchToPage(range.start + i);
        const y = doc.page.height - MARGIN - 10;
        doc.font("Helvetica").fontSize(8).fillColor(MUTED);
        doc.text(`Page ${i + 1} of ${total}`, MARGIN, y, { width: contentWidth, align: "center", lineBreak: false });
      }
    }

    function drawRunningHeader() {
      const headerY = MARGIN - 8;
      doc.font("Helvetica-Bold").fontSize(10).fillColor(BRAND_GOLD);
      doc.text("KUBER QUANT", MARGIN, headerY, { width: contentWidth / 2, lineBreak: false });
      doc.font("Helvetica").fontSize(8).fillColor(MUTED);
      doc.text(
        filledData["AGREEMENT_DATE"] || new Date().toLocaleDateString("en-IN"),
        MARGIN,
        headerY,
        { width: contentWidth, align: "right", lineBreak: false },
      );
      doc.font("Helvetica").fontSize(7).fillColor(MUTED);
      doc.text(`Ref: ${agreementUid}`, MARGIN, headerY + 12, { width: contentWidth / 2, lineBreak: false });
      doc.y = MARGIN + 22;
      doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + contentWidth, doc.y).lineWidth(0.5).stroke(BORDER);
      doc.y += HEADER_BODY_GAP;
    }

    /** Headers on auto-added pages; avoid duplicate header on the first page. */
    doc.on("pageAdded", () => {
      syncPageCount();
      if (firstPageAdded) {
        firstPageAdded = false;
        return;
      }
      drawRunningHeader();
    });

    function startNewPage() {
      doc.addPage();
      syncPageCount();
    }

    function ensureLineSpace(extra = 4) {
      const lineH = doc.currentLineHeight(true);
      if (doc.y + lineH + extra > bottomLimit()) {
        startNewPage();
      }
    }

    function writeFlow(text: string, opts: { font?: string; size?: number; color?: string; indent?: number; bold?: boolean; gap?: number } = {}) {
      const {
        font = "Helvetica",
        size = 9,
        color = INK,
        indent = 0,
        bold = false,
        gap = 4,
      } = opts;
      const width = contentWidth - indent;
      const fontName = bold ? `${font}-Bold` : font;
      doc.font(fontName).fontSize(size).fillColor(color);
      // Let PDFKit paginate flowing text — do not pre-addPage (avoids blank even pages).
      doc.text(text, MARGIN + indent, doc.y, { width, align: "left", lineGap: 3 });
      syncPageCount();
      doc.y += gap;
    }

    function writeKeyValue(key: string, value: string) {
      const label = `${key}:`;
      const val = value || "—";
      const labelW = 130;
      doc.font("Helvetica").fontSize(8.5).fillColor(MUTED);
      const valH = doc.heightOfString(val, { width: contentWidth - labelW - 8, lineGap: 2 });
      const labelH = doc.heightOfString(label, { width: labelW, lineGap: 2 });
      const rowH = Math.max(valH, labelH, 12) + 3;
      ensureLineSpace(rowH);
      const rowY = doc.y;
      doc.font("Helvetica").fontSize(8.5).fillColor(MUTED);
      doc.text(label, MARGIN, rowY, { width: labelW, lineGap: 2 });
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(INK);
      doc.text(val, MARGIN + labelW + 8, rowY, { width: contentWidth - labelW - 8, lineGap: 2 });
      syncPageCount();
      doc.y = rowY + rowH;
    }

    function renderBodyLine(trimmed: string) {
      if (!trimmed) {
        doc.y += 4;
        return;
      }

      if (/^\([a-z0-9]\)/i.test(trimmed)) {
        writeFlow(trimmed, { size: 8.5, color: INK, indent: 12, gap: 3 });
        return;
      }

      if (trimmed.startsWith("-")) {
        writeFlow("• " + trimmed.slice(1).trim(), { size: 8.5, indent: 12, gap: 3 });
        return;
      }

      if (/^\d+\.\s/.test(trimmed)) {
        writeFlow(trimmed, { size: 9, bold: true, color: INK, gap: 4 });
        return;
      }

      if (trimmed.endsWith(":") && trimmed.length < 60 && !trimmed.includes(": ")) {
        writeFlow(trimmed, { size: 9, bold: true, color: BRAND_GOLD, gap: 3 });
        return;
      }

      if (trimmed.includes(": ") && trimmed.split(":")[0].length < 36) {
        const colonIdx = trimmed.indexOf(": ");
        writeKeyValue(trimmed.slice(0, colonIdx), trimmed.slice(colonIdx + 2));
        return;
      }

      writeFlow(trimmed, { size: 9, color: INK, gap: 4 });
    }

    function ensureBlockSpace(height: number) {
      if (doc.y + height > bottomLimit()) {
        startNewPage();
      }
    }

    // ── Page 1 ────────────────────────────────────────────────────────────────
    drawRunningHeader();

    doc.font("Helvetica-Bold").fontSize(13).fillColor(BRAND_GOLD);
    const titleH = doc.heightOfString(template.title, { width: contentWidth, align: "center" });
    ensureBlockSpace(titleH + 16);
    doc.text(template.title, MARGIN, doc.y, { width: contentWidth, align: "center", lineBreak: false });
    syncPageCount();
    doc.y += titleH + 8;
    doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + contentWidth, doc.y).lineWidth(1).stroke(BRAND_GOLD);
    doc.y += 14;

    const photoPath = filledData["PASSPORT_PHOTO_PATH"] || filledData["AVATAR_PATH"] || "";
    const photoBuffer = photoPath && photoPath !== "—" ? loadUploadImageBuffer(photoPath) : null;
    const summaryFields: [string, string][] = [
      ["Full Name", filledData["FULL_NAME"] || userName],
      ["Email", filledData["EMAIL"]],
      ["Mobile", filledData["MOBILE"] || filledData["PHONE"]],
      ["Investor ID", filledData["INVESTOR_ID"]],
      ["Role", filledData["ROLE"]],
      ["KYC Status", filledData["KYC_STATUS"]],
      ["Agreement Date", filledData["AGREEMENT_DATE"] || new Date().toLocaleDateString("en-IN")],
      ["Agreement Ref", agreementUid],
    ];

    const summaryRows = Math.ceil(summaryFields.length / 2);
    const photoBoxW = 70;
    const photoBoxH = 86;
    const summaryBoxH = Math.max(summaryRows * 26 + 16, photoBuffer ? photoBoxH + 16 : summaryRows * 26 + 16);
    ensureBlockSpace(summaryBoxH + 12);
    const boxY = doc.y;
    doc.rect(MARGIN, boxY, contentWidth, summaryBoxH).lineWidth(0.5).stroke(BORDER);

    const innerX = photoBuffer ? MARGIN + photoBoxW + 14 : MARGIN + 10;
    const innerW = photoBuffer ? contentWidth - photoBoxW - 24 : contentWidth - 20;

    if (photoBuffer) {
      try {
        doc.image(photoBuffer, MARGIN + 8, boxY + 8, {
          width: photoBoxW - 4,
          height: photoBoxH - 4,
          fit: [photoBoxW - 4, photoBoxH - 4],
        });
      } catch { /* skip invalid image */ }
    }

    const colW = innerW / 2 - 6;
    summaryFields.forEach(([label, value], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = innerX + col * (colW + 12);
      const y = boxY + 10 + row * 26;
      doc.font("Helvetica").fontSize(7.5).fillColor(MUTED);
      doc.text(label, x, y, { width: colW, lineBreak: false });
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(INK);
      doc.text(value, x, y + 10, { width: colW, lineBreak: false });
    });
    syncPageCount();

    doc.y = boxY + summaryBoxH + 12;
    writeFlow(
      "This document is generated by the Kuber Quant legal agreement system and is binding upon signature.",
      { size: 8, color: MUTED, gap: 10 },
    );

    template.sections.forEach((section, sectionIndex) => {
      ensureLineSpace(28);
      writeFlow(`${sectionIndex + 1}. ${section.heading}`, { size: 10, bold: true, color: BRAND_GOLD, gap: 4 });
      doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + contentWidth, doc.y).lineWidth(0.5).stroke(BORDER);
      doc.y += 8;

      const bodyText = fillPlaceholders(section.body);
      bodyText.split("\n").forEach(line => renderBodyLine(line.trim()));
      doc.y += 6;
    });

    ensureLineSpace(140);
    writeFlow("DIGITAL SIGNATURE & ACCEPTANCE", { size: 11, bold: true, color: BRAND_GOLD, gap: 6 });
    doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + contentWidth, doc.y).lineWidth(0.5).stroke(BRAND_GOLD);
    doc.y += 10;

    writeFlow(
      `By signing electronically, the undersigned confirms agreement to all terms above.\n` +
      `Ref: ${agreementUid} | Name: ${filledData["FULL_NAME"] || "—"} | Email: ${filledData["EMAIL"] || "—"}\n` +
      `IP: ${filledData["IP_ADDRESS"] || "—"} | Device: ${filledData["DEVICE_INFO"] || "—"} | Timestamp: ${new Date().toISOString()}`,
      { size: 8, color: MUTED, gap: 12 },
    );

    const sigBoxW = contentWidth / 2 - 8;
    const sigBoxH = 70;
    const sigBoxY = doc.y;
    ensureBlockSpace(sigBoxH + 20);

    doc.rect(MARGIN, sigBoxY, sigBoxW, sigBoxH).lineWidth(0.5).stroke(BORDER);
    doc.font("Helvetica-Bold").fontSize(8).fillColor(BRAND_GOLD);
    doc.text("INVESTOR SIGNATURE", MARGIN + 8, sigBoxY + 6, { width: sigBoxW - 16, lineBreak: false });
    if (signatureBase64) {
      try {
        const sigBuffer = Buffer.from(signatureBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
        doc.image(sigBuffer, MARGIN + 8, sigBoxY + 18, { width: sigBoxW - 16, height: 36, fit: [sigBoxW - 16, 36] });
      } catch { /* skip invalid signature */ }
    }
    doc.font("Helvetica").fontSize(8).fillColor(MUTED);
    doc.text(filledData["FULL_NAME"] || userName || "Investor", MARGIN + 8, sigBoxY + sigBoxH - 14, { width: sigBoxW - 16, lineBreak: false });

    const boxRight = MARGIN + sigBoxW + 16;
    doc.rect(boxRight, sigBoxY, sigBoxW, sigBoxH).lineWidth(0.5).stroke(BORDER);
    doc.font("Helvetica-Bold").fontSize(8).fillColor(BRAND_GOLD);
    doc.text("KUBER QUANT — Authorised Signatory", boxRight + 8, sigBoxY + 6, { width: sigBoxW - 16, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(11).fillColor(BRAND_GOLD);
    doc.text("Kuber Quant", boxRight + 8, sigBoxY + 30, { width: sigBoxW - 16, lineBreak: false });
    syncPageCount();

    doc.y = sigBoxY + sigBoxH + 14;

    ensureBlockSpace(36);
    const hashY = doc.y;
    doc.rect(MARGIN, hashY, contentWidth, 32).lineWidth(0.5).stroke(BORDER);
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(BRAND_GOLD);
    doc.text("VERIFICATION HASH (SHA-256):", MARGIN + 8, hashY + 6, { width: contentWidth - 16, lineBreak: false });
    doc.font("Courier").fontSize(7).fillColor(MUTED);
    doc.text(filledData["PDF_HASH"] || "Generated upon signing", MARGIN + 8, hashY + 18, { width: contentWidth - 16, lineBreak: false });
    doc.y = hashY + 40;

    writeFlow(
      "Tamper-evident digital document. Verify at support@kuberquant.com with reference above.",
      { size: 8, color: MUTED, gap: 0 },
    );

    syncPageCount();
    stampPageFooters();
    doc.end();
  });
}
