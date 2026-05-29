import PDFDocument from "pdfkit";
import { db, dbRead, walletLedgerTable, transactionsTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "@workspace/db/orm";

async function loadStatementData(userId: number, from: Date, to: Date) {
  const [user] = await db.select({ email: usersTable.email, fullName: usersTable.fullName })
    .from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  const ledger = await dbRead.select().from(walletLedgerTable)
    .where(and(
      eq(walletLedgerTable.userId, userId),
      gte(walletLedgerTable.createdAt, from),
      lte(walletLedgerTable.createdAt, to),
    ))
    .orderBy(desc(walletLedgerTable.createdAt));

  const txns = await dbRead.select().from(transactionsTable)
    .where(and(
      eq(transactionsTable.userId, userId),
      gte(transactionsTable.createdAt, from),
      lte(transactionsTable.createdAt, to),
    ))
    .orderBy(desc(transactionsTable.createdAt));

  return { user, ledger, txns };
}

export async function buildInvestorStatementCsv(userId: number, from: Date, to: Date): Promise<string> {
  const { user, ledger, txns } = await loadStatementData(userId, from, to);

  const lines = [
    "Kuber Quant — Investor Statement",
    `Account: ${user?.fullName || "User"} (${user?.email || userId})`,
    `Period: ${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)}`,
    "",
    "=== Wallet Ledger ===",
    "Date,Type,Amount,Currency,Balance After,Description",
    ...ledger.map(e => [
      e.createdAt.toISOString(),
      e.type,
      e.amount,
      e.currency,
      e.balanceAfter,
      `"${(e.description || "").replace(/"/g, '""')}"`,
    ].join(",")),
    "",
    "=== Transactions ===",
    "Date,Type,Amount,Currency,Status,Method",
    ...txns.map(t => [
      t.createdAt.toISOString(),
      t.type,
      t.amount,
      t.currency,
      t.status,
      t.paymentMethod || "",
    ].join(",")),
  ];

  return lines.join("\n");
}

const BRAND_GOLD = "#B8860B";
const INK = "#1A1A1A";
const MUTED = "#555555";
const BORDER = "#D8D8D8";
const HEADER_BG = "#FBF6E9";
const ZEBRA_BG = "#F6F6F6";
const PDF_MARGIN = 44;

function fmtDate(d: Date): string {
  // 2026-05-29 16:30 — compact, locale-stable for statements
  const iso = d.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Investor deposit & withdrawal statement as a branded PDF.
 * Transactions table highlights method, amount and transaction date per request.
 */
export async function buildInvestorStatementPdf(userId: number, from: Date, to: Date): Promise<Buffer> {
  const { user, ledger, txns } = await loadStatementData(userId, from, to);

  return await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: PDF_MARGIN, bottom: PDF_MARGIN, left: PDF_MARGIN, right: PDF_MARGIN },
      bufferPages: true,
      info: {
        Title: "Kuber Quant — Investor Statement",
        Author: "Kuber Quant",
        Subject: "Deposit & Withdrawal Statement",
        CreationDate: new Date(),
      },
    });

    const buffers: Buffer[] = [];
    doc.on("data", (c: Buffer) => buffers.push(c));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const pageWidth = doc.page.width;
    const contentW = pageWidth - PDF_MARGIN * 2;
    const bottom = () => doc.page.height - PDF_MARGIN;

    // ── Header band ──
    doc.font("Helvetica-Bold").fontSize(16).fillColor(BRAND_GOLD);
    doc.text("KUBER QUANT", PDF_MARGIN, PDF_MARGIN, { width: contentW });
    doc.font("Helvetica-Bold").fontSize(11).fillColor(INK);
    doc.text("Deposit & Withdrawal Statement", PDF_MARGIN, doc.y + 2, { width: contentW });
    doc.font("Helvetica").fontSize(8.5).fillColor(MUTED);
    doc.text(`Account: ${user?.fullName || "User"} (${user?.email || userId})`, PDF_MARGIN, doc.y + 4, { width: contentW });
    doc.text(`Period: ${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)}`, { width: contentW });
    doc.text(`Generated: ${fmtDate(new Date())} UTC`, { width: contentW });
    doc.y += 6;
    doc.moveTo(PDF_MARGIN, doc.y).lineTo(PDF_MARGIN + contentW, doc.y).lineWidth(1).stroke(BRAND_GOLD);
    doc.y += 12;

    // Generic table renderer with header repeat across pages.
    function drawTable(opts: {
      title: string;
      columns: { header: string; width: number; align?: "left" | "right" }[];
      rows: string[][];
      emptyText: string;
    }) {
      const { title, columns, rows, emptyText } = opts;
      const totalW = columns.reduce((s, c) => s + c.width, 0);
      const scale = contentW / totalW;
      const colW = columns.map(c => c.width * scale);
      const padX = 6;
      const rowH = 18;

      doc.font("Helvetica-Bold").fontSize(10.5).fillColor(BRAND_GOLD);
      doc.text(title, PDF_MARGIN, doc.y, { width: contentW });
      doc.y += 4;

      const drawHeaderRow = () => {
        const y = doc.y;
        doc.rect(PDF_MARGIN, y, contentW, rowH).fill(HEADER_BG);
        let x = PDF_MARGIN;
        doc.font("Helvetica-Bold").fontSize(8).fillColor(INK);
        columns.forEach((c, i) => {
          doc.text(c.header, x + padX, y + 5, { width: colW[i] - padX * 2, align: c.align || "left", lineBreak: false });
          x += colW[i];
        });
        doc.rect(PDF_MARGIN, y, contentW, rowH).lineWidth(0.5).stroke(BORDER);
        doc.y = y + rowH;
      };

      drawHeaderRow();

      if (rows.length === 0) {
        doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(MUTED);
        doc.text(emptyText, PDF_MARGIN + padX, doc.y + 5, { width: contentW - padX * 2 });
        doc.y += rowH + 6;
        return;
      }

      rows.forEach((row, ri) => {
        if (doc.y + rowH > bottom()) {
          doc.addPage();
          drawHeaderRow();
        }
        const y = doc.y;
        if (ri % 2 === 1) doc.rect(PDF_MARGIN, y, contentW, rowH).fill(ZEBRA_BG);
        let x = PDF_MARGIN;
        doc.font("Helvetica").fontSize(8).fillColor(INK);
        columns.forEach((c, i) => {
          doc.text(row[i] ?? "", x + padX, y + 5, { width: colW[i] - padX * 2, align: c.align || "left", lineBreak: false, ellipsis: true });
          x += colW[i];
        });
        doc.rect(PDF_MARGIN, y, contentW, rowH).lineWidth(0.3).stroke(BORDER);
        doc.y = y + rowH;
      });
      doc.y += 12;
    }

    drawTable({
      title: "Deposits & Withdrawals",
      columns: [
        { header: "Date", width: 26 },
        { header: "Method", width: 30 },
        { header: "Type", width: 18 },
        { header: "Amount", width: 18, align: "right" },
        { header: "Status", width: 16 },
      ],
      rows: txns.map(t => [
        fmtDate(t.createdAt),
        t.paymentMethod || "—",
        titleCase(t.type),
        `${Number(t.amount).toLocaleString()} ${t.currency}`,
        titleCase(t.status),
      ]),
      emptyText: "No deposit or withdrawal transactions in this period.",
    });

    drawTable({
      title: "Wallet Ledger",
      columns: [
        { header: "Date", width: 24 },
        { header: "Type", width: 20 },
        { header: "Amount", width: 16, align: "right" },
        { header: "Balance After", width: 18, align: "right" },
        { header: "Description", width: 34 },
      ],
      rows: ledger.map(e => [
        fmtDate(e.createdAt),
        titleCase(e.type),
        `${Number(e.amount).toLocaleString()} ${e.currency}`,
        `${Number(e.balanceAfter).toLocaleString()} ${e.currency}`,
        e.description || "",
      ]),
      emptyText: "No wallet ledger movements in this period.",
    });

    // ── Footer page numbers ──
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.font("Helvetica").fontSize(7.5).fillColor(MUTED);
      doc.text(
        `Kuber Quant · Investor Statement · Page ${i + 1} of ${range.count}`,
        PDF_MARGIN,
        doc.page.height - PDF_MARGIN + 8,
        { width: contentW, align: "center", lineBreak: false },
      );
    }

    doc.end();
  });
}
