import PDFDocument from "pdfkit";
import { createHash } from "crypto";
import type { AgreementTemplateContent } from "./agreementTemplates";

const BRAND_GOLD = "#D4AF37";
const BRAND_NAVY = "#050A14";
const BRAND_DARK = "#0a1628";

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
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
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
    const leftMargin = 60;
    const contentWidth = pageWidth - 120;

    function fillPlaceholders(text: string): string {
      return text.replace(/\{\{(\w+)\}\}/g, (_, key) => filledData[key] || `[${key}]`);
    }

    // ── Helper: add page header ────────────────────────────────────────────────
    function addHeader(isFirst = false) {
      if (!isFirst) {
        doc.addPage();
      }
      // Dark header bar
      doc.rect(0, 0, pageWidth, isFirst ? 100 : 50).fill("#050A14");

      // KQ Logo text
      doc.font("Helvetica-Bold").fontSize(isFirst ? 22 : 14).fillColor(BRAND_GOLD);
      if (isFirst) {
        doc.text("KUBER QUANT", leftMargin, 20, { width: contentWidth / 2 });
        doc.font("Helvetica").fontSize(10).fillColor("#888888");
        doc.text("Premium Investment & Wealth Management", leftMargin, 44);
      } else {
        doc.text("KUBER QUANT", leftMargin, 18, { width: contentWidth / 2 });
        doc.font("Helvetica").fontSize(8).fillColor("#888888");
        doc.text(`Ref: ${agreementUid}`, leftMargin, 34);
      }

      // Agreement UID on right
      doc.font("Helvetica").fontSize(8).fillColor("#888888");
      const uidText = `Ref: ${agreementUid}`;
      if (isFirst) {
        doc.text(uidText, leftMargin, 60, { width: contentWidth, align: "right" });
        doc.text(`Date: ${filledData["AGREEMENT_DATE"] || new Date().toLocaleDateString("en-IN")}`, leftMargin, 72, { width: contentWidth, align: "right" });
      }

      doc.moveDown(isFirst ? 4 : 2);
    }

    // ── Helper: watermark ──────────────────────────────────────────────────────
    function addWatermark() {
      doc.save();
      doc.opacity(0.04);
      doc.font("Helvetica-Bold").fontSize(72).fillColor(BRAND_GOLD);
      doc.rotate(-45, { origin: [pageWidth / 2, doc.page.height / 2] });
      doc.text("KUBER QUANT", 0, doc.page.height / 2 - 50, { width: pageWidth, align: "center" });
      doc.restore();
    }

    // ── Page 1: Cover ─────────────────────────────────────────────────────────
    addHeader(true);
    addWatermark();

    // Gold divider
    doc.rect(leftMargin, doc.y, contentWidth, 2).fill(BRAND_GOLD);
    doc.moveDown(1.5);

    // Agreement title
    doc.font("Helvetica-Bold").fontSize(15).fillColor("#FFFFFF").fillColor(BRAND_GOLD);
    doc.text(template.title, leftMargin, doc.y, { width: contentWidth, align: "center" });
    doc.moveDown(0.5);

    doc.rect(leftMargin, doc.y, contentWidth, 1).fill("#333333");
    doc.moveDown(1.5);

    // Agreement ID box
    doc.rect(leftMargin, doc.y, contentWidth, 60)
      .lineWidth(1).stroke("#2a2a2a");
    doc.rect(leftMargin, doc.y, contentWidth, 60).fill("#0d1f3c");
    const boxY = doc.y + 10;
    doc.font("Helvetica-Bold").fontSize(9).fillColor(BRAND_GOLD);
    doc.text("AGREEMENT REFERENCE", leftMargin + 10, boxY);
    doc.font("Helvetica-Bold").fontSize(16).fillColor("#FFFFFF");
    doc.text(agreementUid, leftMargin + 10, boxY + 14);
    doc.font("Helvetica").fontSize(8).fillColor("#888888");
    doc.text(`Status: ${filledData["AGREEMENT_STATUS"] || "PENDING SIGNATURE"} | Generated: ${new Date().toLocaleString("en-IN")}`, leftMargin + 10, boxY + 34);
    doc.moveDown(4.5);

    // Investor summary box
    doc.font("Helvetica-Bold").fontSize(10).fillColor(BRAND_GOLD);
    doc.text("INVESTOR IDENTIFICATION", leftMargin, doc.y);
    doc.moveDown(0.4);
    doc.rect(leftMargin, doc.y, contentWidth, 1).fill(BRAND_GOLD);
    doc.moveDown(0.5);

    const investorFields = [
      ["Full Name", filledData["FULL_NAME"]],
      ["Email", filledData["EMAIL"]],
      ["Investor ID", filledData["INVESTOR_ID"]],
      ["Mobile", filledData["MOBILE"]],
      ["KYC Status", filledData["KYC_STATUS"]],
      ["Agreement Date", filledData["AGREEMENT_DATE"]],
    ];

    investorFields.forEach(([label, value]) => {
      if (value && value !== `[${label?.replace(/ /g, "_").toUpperCase()}]`) {
        const fieldY = doc.y;
        doc.font("Helvetica").fontSize(8).fillColor("#888888");
        doc.text(label + ":", leftMargin, fieldY, { width: 130, continued: false });
        doc.font("Helvetica-Bold").fontSize(8).fillColor("#CCCCCC");
        doc.text(value, leftMargin + 135, fieldY - doc.currentLineHeight(), { width: contentWidth - 135 });
        doc.moveDown(0.3);
      }
    });

    doc.moveDown(1);
    doc.rect(leftMargin, doc.y, contentWidth, 1).fill("#333333");
    doc.moveDown(0.8);

    doc.font("Helvetica").fontSize(7.5).fillColor("#666666");
    doc.text(
      "This document has been generated by the Kuber Quant automated legal agreement system. It constitutes a legally binding agreement between the parties identified herein, subject to the terms and conditions set forth in the following pages. Please read all sections carefully before signing.",
      leftMargin, doc.y, { width: contentWidth, align: "justify" }
    );

    doc.moveDown(1);

    // Page number for cover
    doc.font("Helvetica").fontSize(8).fillColor("#555555");
    doc.text("Page 1", 0, doc.page.height - 40, { width: pageWidth, align: "center" });

    // ── Sections ───────────────────────────────────────────────────────────────
    let pageNum = 2;

    template.sections.forEach((section, sectionIndex) => {
      // Each section starts on new page
      if (sectionIndex === 0) {
        addHeader(false);
      } else {
        addHeader(false);
      }
      addWatermark();

      // Section heading
      doc.rect(leftMargin, doc.y, contentWidth, 28).fill("#0d1f3c");
      doc.font("Helvetica-Bold").fontSize(10).fillColor(BRAND_GOLD);
      doc.text(`${sectionIndex + 1}. ${section.heading}`, leftMargin + 8, doc.y - 20, { width: contentWidth - 16 });
      doc.moveDown(1.5);

      // Section body
      const bodyText = fillPlaceholders(section.body);
      const lines = bodyText.split("\n");

      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) {
          doc.moveDown(0.4);
          return;
        }
        // Check if we need a new page
        if (doc.y > doc.page.height - 100) {
          doc.font("Helvetica").fontSize(8).fillColor("#555555");
          doc.text(`Page ${pageNum}`, 0, doc.page.height - 40, { width: pageWidth, align: "center" });
          pageNum++;
          addHeader(false);
          addWatermark();
        }

        if (trimmed.startsWith("(") && /^\([a-z]\)/.test(trimmed)) {
          // Lettered clause
          doc.font("Helvetica").fontSize(8.5).fillColor("#DDDDDD");
          doc.text(trimmed, leftMargin + 15, doc.y, { width: contentWidth - 15, align: "justify" });
        } else if (trimmed.startsWith("-")) {
          // Bullet
          doc.font("Helvetica").fontSize(8.5).fillColor("#DDDDDD");
          doc.text("• " + trimmed.slice(1).trim(), leftMargin + 15, doc.y, { width: contentWidth - 15 });
        } else if (/^[A-Z][^:]+:$/.test(trimmed) || trimmed.endsWith(":")) {
          // Sub-heading
          doc.font("Helvetica-Bold").fontSize(9).fillColor(BRAND_GOLD);
          doc.text(trimmed, leftMargin, doc.y, { width: contentWidth });
        } else if (trimmed.includes(": ") && trimmed.split(":")[0].length < 40) {
          // Key: Value pair
          const colonIdx = trimmed.indexOf(": ");
          const key = trimmed.slice(0, colonIdx);
          const val = trimmed.slice(colonIdx + 2);
          const lineY = doc.y;
          doc.font("Helvetica").fontSize(8).fillColor("#888888");
          doc.text(key + ":", leftMargin, lineY, { width: 160, continued: false });
          doc.font("Helvetica-Bold").fontSize(8).fillColor("#EEEEEE");
          doc.text(val || "—", leftMargin + 165, lineY - doc.currentLineHeight(), { width: contentWidth - 165 });
        } else {
          doc.font("Helvetica").fontSize(8.5).fillColor("#CCCCCC");
          doc.text(trimmed, leftMargin, doc.y, { width: contentWidth, align: "justify" });
        }
        doc.moveDown(0.3);
      });

      doc.font("Helvetica").fontSize(8).fillColor("#555555");
      doc.text(`Page ${pageNum}`, 0, doc.page.height - 40, { width: pageWidth, align: "center" });
      pageNum++;
    });

    // ── Signature Page ─────────────────────────────────────────────────────────
    addHeader(false);
    addWatermark();

    doc.font("Helvetica-Bold").fontSize(12).fillColor(BRAND_GOLD);
    doc.text("DIGITAL SIGNATURE & ACCEPTANCE", leftMargin, doc.y, { width: contentWidth, align: "center" });
    doc.moveDown(0.5);
    doc.rect(leftMargin, doc.y, contentWidth, 1).fill(BRAND_GOLD);
    doc.moveDown(1);

    doc.font("Helvetica").fontSize(8.5).fillColor("#CCCCCC");
    doc.text(
      `By signing this agreement (electronically or digitally), the undersigned confirms that they have read, understood, and agree to be legally bound by all terms and conditions set forth in this agreement.\n\nAgreement Reference: ${agreementUid}\nFull Name: ${filledData["FULL_NAME"] || "—"}\nEmail: ${filledData["EMAIL"] || "—"}\nIP Address: ${filledData["IP_ADDRESS"] || "—"}\nDevice: ${filledData["DEVICE_INFO"] || "—"}\nSigning Timestamp: ${new Date().toISOString()}`,
      leftMargin, doc.y, { width: contentWidth, align: "left" }
    );

    doc.moveDown(1.5);

    // Signature boxes
    const boxLeft = leftMargin;
    const boxRight = leftMargin + contentWidth / 2 + 20;
    const sigBoxW = contentWidth / 2 - 20;
    const sigBoxH = 90;
    const sigBoxY = doc.y;

    // Investor signature box
    doc.rect(boxLeft, sigBoxY, sigBoxW, sigBoxH).lineWidth(1).stroke("#333333");
    doc.font("Helvetica-Bold").fontSize(8).fillColor(BRAND_GOLD);
    doc.text("INVESTOR SIGNATURE", boxLeft + 8, sigBoxY + 6, { width: sigBoxW - 16 });
    if (signatureBase64) {
      try {
        const sigBuffer = Buffer.from(signatureBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
        doc.image(sigBuffer, boxLeft + 8, sigBoxY + 22, { width: sigBoxW - 16, height: 50, fit: [sigBoxW - 16, 50] });
      } catch { /* skip if invalid */ }
    }
    doc.font("Helvetica").fontSize(7).fillColor("#666666");
    doc.text(filledData["FULL_NAME"] || "Investor", boxLeft + 8, sigBoxY + sigBoxH - 20, { width: sigBoxW - 16 });

    // Platform signature box
    doc.rect(boxRight, sigBoxY, sigBoxW, sigBoxH).lineWidth(1).stroke("#333333");
    doc.font("Helvetica-Bold").fontSize(8).fillColor(BRAND_GOLD);
    doc.text("KUBER QUANT", boxRight + 8, sigBoxY + 6, { width: sigBoxW - 16 });
    doc.font("Helvetica-Bold").fontSize(12).fillColor(BRAND_GOLD);
    doc.text("Kuber Quant", boxRight + 8, sigBoxY + 30, { width: sigBoxW - 16 });
    doc.font("Helvetica").fontSize(7).fillColor("#666666");
    doc.text("Authorised Signatory", boxRight + 8, sigBoxY + 50);
    doc.text("Service Provider", boxRight + 8, sigBoxY + 60);

    doc.moveDown(sigBoxH / 12 + 2);

    // Verification hash box
    doc.rect(leftMargin, doc.y, contentWidth, 40).fill("#070e1a");
    const hashY = doc.y + 8;
    doc.font("Helvetica-Bold").fontSize(7).fillColor(BRAND_GOLD);
    doc.text("VERIFICATION HASH (SHA-256):", leftMargin + 8, hashY);
    doc.font("Courier").fontSize(7).fillColor("#888888");
    doc.text(filledData["PDF_HASH"] || "Hash generated after signing", leftMargin + 8, hashY + 12, { width: contentWidth - 16 });

    doc.moveDown(3);
    doc.font("Helvetica").fontSize(7).fillColor("#555555");
    doc.text(
      "This agreement was generated by the Kuber Quant automated legal documentation system. The digital signature and verification hash provide tamper-evidence. To verify this document, contact support@kuberquant.com",
      leftMargin, doc.y, { width: contentWidth, align: "center" }
    );

    // Final page number
    doc.font("Helvetica").fontSize(8).fillColor("#555555");
    doc.text(`Page ${pageNum}`, 0, doc.page.height - 40, { width: pageWidth, align: "center" });

    doc.end();
  });
}
