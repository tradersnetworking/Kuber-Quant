import PDFDocument from "pdfkit";
import { createHash } from "crypto";
import type { AgreementTemplateContent } from "./agreementTemplates";

const BRAND_GOLD = "#D4AF37";
const MARGIN = 42;
const FOOTER_Y_OFFSET = 28;

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
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
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
    let pageNum = 1;

    function fillPlaceholders(text: string): string {
      return text.replace(/\{\{(\w+)\}\}/g, (_, key) => filledData[key] || `[${key}]`);
    }

    function bottomLimit() {
      return doc.page.height - MARGIN - 20;
    }

    function addPageNumber() {
      doc.font("Helvetica").fontSize(7).fillColor("#666666");
      doc.text(`Page ${pageNum}`, 0, doc.page.height - FOOTER_Y_OFFSET, { width: pageWidth, align: "center" });
    }

    function ensureSpace(minHeight: number) {
      if (doc.y + minHeight > bottomLimit()) {
        addPageNumber();
        doc.addPage();
        pageNum++;
        drawRunningHeader();
      }
    }

    function drawRunningHeader() {
      doc.rect(0, 0, pageWidth, 36).fill("#050A14");
      doc.font("Helvetica-Bold").fontSize(11).fillColor(BRAND_GOLD);
      doc.text("KUBER QUANT", MARGIN, 10, { width: contentWidth / 2 });
      doc.font("Helvetica").fontSize(7).fillColor("#888888");
      doc.text(`Ref: ${agreementUid}`, MARGIN, 22, { width: contentWidth / 2 });
      doc.text(
        filledData["AGREEMENT_DATE"] || new Date().toLocaleDateString("en-IN"),
        MARGIN,
        10,
        { width: contentWidth, align: "right" }
      );
      doc.y = 48;
    }

    function drawWatermark() {
      doc.save();
      doc.opacity(0.035);
      doc.font("Helvetica-Bold").fontSize(56).fillColor(BRAND_GOLD);
      doc.rotate(-45, { origin: [pageWidth / 2, doc.page.height / 2] });
      doc.text("KUBER QUANT", 0, doc.page.height / 2 - 40, { width: pageWidth, align: "center" });
      doc.restore();
    }

    function renderBodyLine(trimmed: string) {
      if (!trimmed) {
        doc.moveDown(0.2);
        return;
      }
      ensureSpace(14);

      if (trimmed.startsWith("(") && /^\([a-z0-9]\)/i.test(trimmed)) {
        doc.font("Helvetica").fontSize(8).fillColor("#DDDDDD");
        doc.text(trimmed, MARGIN + 10, doc.y, { width: contentWidth - 10, align: "justify", lineGap: 1 });
      } else if (trimmed.startsWith("-")) {
        doc.font("Helvetica").fontSize(8).fillColor("#DDDDDD");
        doc.text("• " + trimmed.slice(1).trim(), MARGIN + 10, doc.y, { width: contentWidth - 10, lineGap: 1 });
      } else if (/^\d+\.\s/.test(trimmed)) {
        doc.font("Helvetica-Bold").fontSize(8).fillColor("#CCCCCC");
        doc.text(trimmed, MARGIN, doc.y, { width: contentWidth, align: "justify", lineGap: 1 });
      } else if (/^[A-Z][^:]+:$/.test(trimmed) || (trimmed.endsWith(":") && trimmed.length < 50)) {
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor(BRAND_GOLD);
        doc.text(trimmed, MARGIN, doc.y, { width: contentWidth });
      } else if (trimmed.includes(": ") && trimmed.split(":")[0].length < 36) {
        const colonIdx = trimmed.indexOf(": ");
        const key = trimmed.slice(0, colonIdx);
        const val = trimmed.slice(colonIdx + 2);
        const lineY = doc.y;
        doc.font("Helvetica").fontSize(7.5).fillColor("#888888");
        doc.text(key + ":", MARGIN, lineY, { width: 130, continued: false });
        doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#EEEEEE");
        doc.text(val || "—", MARGIN + 132, lineY - doc.currentLineHeight(), { width: contentWidth - 132 });
      } else {
        doc.font("Helvetica").fontSize(8).fillColor("#CCCCCC");
        doc.text(trimmed, MARGIN, doc.y, { width: contentWidth, align: "justify", lineGap: 1 });
      }
      doc.moveDown(0.15);
    }

    // ── Page 1 header block ───────────────────────────────────────────────────
    drawRunningHeader();
    drawWatermark();

    doc.font("Helvetica-Bold").fontSize(12).fillColor(BRAND_GOLD);
    doc.text(template.title, MARGIN, doc.y, { width: contentWidth, align: "center" });
    doc.moveDown(0.3);
    doc.rect(MARGIN, doc.y, contentWidth, 1).fill(BRAND_GOLD);
    doc.moveDown(0.5);

    // Compact investor summary — two columns
    const colW = contentWidth / 2 - 6;
    const summaryFields: [string, string][] = [
      ["Full Name", filledData["FULL_NAME"]],
      ["Email", filledData["EMAIL"]],
      ["Investor ID", filledData["INVESTOR_ID"]],
      ["Mobile", filledData["MOBILE"]],
      ["KYC Status", filledData["KYC_STATUS"]],
      ["Agreement Ref", agreementUid],
    ].filter(([, v]) => v && v !== "—") as [string, string][];

    const startY = doc.y;
    summaryFields.forEach(([label, value], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = MARGIN + col * (colW + 12);
      const y = startY + row * 22;
      doc.font("Helvetica").fontSize(6.5).fillColor("#777777");
      doc.text(label, x, y, { width: colW });
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#EEEEEE");
      doc.text(value, x, y + 9, { width: colW });
    });
    doc.y = startY + Math.ceil(summaryFields.length / 2) * 22 + 6;

    doc.font("Helvetica-Oblique").fontSize(6.5).fillColor("#666666");
    doc.text(
      "This document is generated by the Kuber Quant legal agreement system and is binding upon signature.",
      MARGIN,
      doc.y,
      { width: contentWidth, align: "justify", lineGap: 0.5 }
    );
    doc.moveDown(0.6);

    // ── Sections (continuous flow) ────────────────────────────────────────────
    template.sections.forEach((section, sectionIndex) => {
      ensureSpace(40);
      doc.rect(MARGIN, doc.y, contentWidth, 20).fill("#0d1f3c");
      doc.font("Helvetica-Bold").fontSize(9).fillColor(BRAND_GOLD);
      doc.text(`${sectionIndex + 1}. ${section.heading}`, MARGIN + 6, doc.y - 14, { width: contentWidth - 12 });
      doc.moveDown(0.6);

      const bodyText = fillPlaceholders(section.body);
      bodyText.split("\n").forEach(line => renderBodyLine(line.trim()));
      doc.moveDown(0.3);
    });

    // ── Signature block ─────────────────────────────────────────────────────────
    ensureSpace(130);
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(BRAND_GOLD);
    doc.text("DIGITAL SIGNATURE & ACCEPTANCE", MARGIN, doc.y, { width: contentWidth, align: "center" });
    doc.moveDown(0.3);
    doc.rect(MARGIN, doc.y, contentWidth, 1).fill(BRAND_GOLD);
    doc.moveDown(0.5);

    doc.font("Helvetica").fontSize(7.5).fillColor("#CCCCCC");
    doc.text(
      `By signing electronically, the undersigned confirms agreement to all terms above.\nRef: ${agreementUid} | Name: ${filledData["FULL_NAME"] || "—"} | Email: ${filledData["EMAIL"] || "—"}\nIP: ${filledData["IP_ADDRESS"] || "—"} | Device: ${filledData["DEVICE_INFO"] || "—"} | Timestamp: ${new Date().toISOString()}`,
      MARGIN,
      doc.y,
      { width: contentWidth, lineGap: 1 }
    );
    doc.moveDown(0.8);

    const sigBoxW = contentWidth / 2 - 8;
    const sigBoxH = 72;
    const sigBoxY = doc.y;
    const boxLeft = MARGIN;
    const boxRight = MARGIN + sigBoxW + 16;

    doc.rect(boxLeft, sigBoxY, sigBoxW, sigBoxH).lineWidth(0.5).stroke("#333333");
    doc.font("Helvetica-Bold").fontSize(7).fillColor(BRAND_GOLD);
    doc.text("INVESTOR SIGNATURE", boxLeft + 6, sigBoxY + 4, { width: sigBoxW - 12 });
    if (signatureBase64) {
      try {
        const sigBuffer = Buffer.from(signatureBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
        doc.image(sigBuffer, boxLeft + 6, sigBoxY + 16, { width: sigBoxW - 12, height: 40, fit: [sigBoxW - 12, 40] });
      } catch { /* skip invalid signature */ }
    }
    doc.font("Helvetica").fontSize(6.5).fillColor("#666666");
    doc.text(filledData["FULL_NAME"] || userName || "Investor", boxLeft + 6, sigBoxY + sigBoxH - 14, { width: sigBoxW - 12 });

    doc.rect(boxRight, sigBoxY, sigBoxW, sigBoxH).lineWidth(0.5).stroke("#333333");
    doc.font("Helvetica-Bold").fontSize(7).fillColor(BRAND_GOLD);
    doc.text("KUBER QUANT — Authorised Signatory", boxRight + 6, sigBoxY + 4, { width: sigBoxW - 12 });
    doc.font("Helvetica-Bold").fontSize(10).fillColor(BRAND_GOLD);
    doc.text("Kuber Quant", boxRight + 6, sigBoxY + 28, { width: sigBoxW - 12 });

    doc.y = sigBoxY + sigBoxH + 10;

    doc.rect(MARGIN, doc.y, contentWidth, 28).fill("#070e1a");
    const hashY = doc.y + 5;
    doc.font("Helvetica-Bold").fontSize(6.5).fillColor(BRAND_GOLD);
    doc.text("VERIFICATION HASH (SHA-256):", MARGIN + 6, hashY);
    doc.font("Courier").fontSize(6.5).fillColor("#888888");
    doc.text(filledData["PDF_HASH"] || "Generated upon signing", MARGIN + 6, hashY + 10, { width: contentWidth - 12 });

    doc.moveDown(2.5);
    doc.font("Helvetica").fontSize(6.5).fillColor("#555555");
    doc.text(
      "Tamper-evident digital document. Verify at support@kuberquant.com with reference above.",
      MARGIN,
      doc.y,
      { width: contentWidth, align: "center" }
    );

    addPageNumber();
    doc.end();
  });
}
