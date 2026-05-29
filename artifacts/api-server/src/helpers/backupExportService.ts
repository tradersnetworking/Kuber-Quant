import {
  db,
  usersTable,
  userProfilesTable,
  userPaymentAccountsTable,
  transactionsTable,
  walletLedgerTable,
  kycRecordsTable,
  investmentsTable,
  roiPayoutsTable,
  investmentPlansTable,
  siteSettingsTable,
  algoSubscriptionsTable,
  algoStrategiesTable,
  eaSubscriptionsTable,
  eaStrategiesTable,
  copyFollowsTable,
  copyTradersTable,
  mt5AccountsTable,
  mt5RequestsTable,
  paymentGatewaysTable,
  promoCodesTable,
  agreementsTable,
  ticketsTable,
  notificationsTable,
  referralEarningsTable,
  auditLogsTable,
  loginHistoryTable,
} from "@workspace/db";
import * as XLSX from "xlsx";
import { PassThrough } from "stream";

export type BackupCategory =
  | "users"
  | "system"
  | "transactions"
  | "kyc"
  | "investments"
  | "algo"
  | "copy"
  | "mt5"
  | "full";

export type BackupFormat = "csv" | "json" | "xlsx" | "zip";

const REDACT_FIELDS = new Set([
  "passwordHash",
  "password_hash",
  "twoFactorSecret",
  "two_factor_secret",
  "twoFactorTempSecret",
  "two_factor_temp_secret",
  "passwordEnc",
  "password_enc",
  "bankingDetailsEnc",
  "banking_details_enc",
  "tradingPassword",
  "trading_password",
]);

function serializeValue(v: unknown): string | number | boolean | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "bigint") return v.toString();
  return v as string | number | boolean;
}

export function sanitizeRow(row: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(row)) {
    if (REDACT_FIELDS.has(k)) {
      out[k] = "[REDACTED]";
      continue;
    }
    out[k] = serializeValue(v);
  }
  return out;
}

function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "\uFEFF";
  const sanitized = rows.map(r => sanitizeRow(r as Record<string, unknown>));
  const headers = [...new Set(sanitized.flatMap(r => Object.keys(r)))];
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [
    headers.map(escape).join(","),
    ...sanitized.map(r => headers.map(h => escape(r[h])).join(",")),
  ];
  return "\uFEFF" + lines.join("\r\n");
}

function rowsToXlsxBuffer(sheetName: string, rows: Record<string, unknown>[]): Buffer {
  const sanitized = rows.map(r => sanitizeRow(r as Record<string, unknown>));
  const ws = XLSX.utils.json_to_sheet(sanitized);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

function rowsToJson(rows: Record<string, unknown>[]): string {
  return JSON.stringify(rows.map(r => sanitizeRow(r as Record<string, unknown>)), null, 2);
}

export type BackupDataset = { name: string; rows: Record<string, unknown>[] };

async function loadUsersData(): Promise<BackupDataset[]> {
  const [users, profiles, paymentAccounts] = await Promise.all([
    db.select().from(usersTable),
    db.select().from(userProfilesTable),
    db.select().from(userPaymentAccountsTable),
  ]);
  return [
    { name: "users", rows: users as unknown as Record<string, unknown>[] },
    { name: "user_profiles", rows: profiles as unknown as Record<string, unknown>[] },
    { name: "user_payment_accounts", rows: paymentAccounts as unknown as Record<string, unknown>[] },
  ];
}

async function loadSystemData(): Promise<BackupDataset[]> {
  const [
    settings,
    plans,
    gateways,
    promos,
    agreements,
    algoStrategies,
    eaStrategies,
    copyTraders,
    tickets,
    notifications,
    auditLogs,
  ] = await Promise.all([
    db.select().from(siteSettingsTable),
    db.select().from(investmentPlansTable),
    db.select().from(paymentGatewaysTable),
    db.select().from(promoCodesTable),
    db.select().from(agreementsTable),
    db.select().from(algoStrategiesTable),
    db.select().from(eaStrategiesTable),
    db.select().from(copyTradersTable),
    db.select().from(ticketsTable),
    db.select().from(notificationsTable),
    db.select().from(auditLogsTable).limit(5000),
  ]);
  return [
    { name: "site_settings", rows: settings as unknown as Record<string, unknown>[] },
    { name: "investment_plans", rows: plans as unknown as Record<string, unknown>[] },
    { name: "payment_gateways", rows: gateways as unknown as Record<string, unknown>[] },
    { name: "promo_codes", rows: promos as unknown as Record<string, unknown>[] },
    { name: "agreements", rows: agreements as unknown as Record<string, unknown>[] },
    { name: "algo_strategies_catalog", rows: algoStrategies as unknown as Record<string, unknown>[] },
    { name: "ea_strategies_catalog", rows: eaStrategies as unknown as Record<string, unknown>[] },
    { name: "copy_traders_catalog", rows: copyTraders as unknown as Record<string, unknown>[] },
    { name: "support_tickets", rows: tickets as unknown as Record<string, unknown>[] },
    { name: "notifications", rows: notifications as unknown as Record<string, unknown>[] },
    { name: "audit_logs", rows: auditLogs as unknown as Record<string, unknown>[] },
  ];
}

async function loadTransactionsData(): Promise<BackupDataset[]> {
  const [txns, ledger, referrals, loginHistory] = await Promise.all([
    db.select().from(transactionsTable),
    db.select().from(walletLedgerTable),
    db.select().from(referralEarningsTable),
    db.select().from(loginHistoryTable).limit(10000),
  ]);
  return [
    { name: "transactions", rows: txns as unknown as Record<string, unknown>[] },
    { name: "wallet_ledger", rows: ledger as unknown as Record<string, unknown>[] },
    { name: "referral_earnings", rows: referrals as unknown as Record<string, unknown>[] },
    { name: "login_history", rows: loginHistory as unknown as Record<string, unknown>[] },
  ];
}

async function loadKycData(): Promise<BackupDataset[]> {
  const kyc = await db.select().from(kycRecordsTable);
  return [{ name: "kyc_records", rows: kyc as unknown as Record<string, unknown>[] }];
}

async function loadInvestmentsData(): Promise<BackupDataset[]> {
  const [investments, payouts] = await Promise.all([
    db.select().from(investmentsTable),
    db.select().from(roiPayoutsTable),
  ]);
  return [
    { name: "investments", rows: investments as unknown as Record<string, unknown>[] },
    { name: "roi_payouts", rows: payouts as unknown as Record<string, unknown>[] },
  ];
}

async function loadAlgoData(): Promise<BackupDataset[]> {
  const [subs, strategies] = await Promise.all([
    db.select().from(algoSubscriptionsTable),
    db.select().from(algoStrategiesTable),
  ]);
  return [
    { name: "algo_subscriptions", rows: subs as unknown as Record<string, unknown>[] },
    { name: "algo_strategies", rows: strategies as unknown as Record<string, unknown>[] },
  ];
}

async function loadCopyData(): Promise<BackupDataset[]> {
  const [follows, traders] = await Promise.all([
    db.select().from(copyFollowsTable),
    db.select().from(copyTradersTable),
  ]);
  return [
    { name: "copy_follows", rows: follows as unknown as Record<string, unknown>[] },
    { name: "copy_traders", rows: traders as unknown as Record<string, unknown>[] },
  ];
}

async function loadMt5Data(): Promise<BackupDataset[]> {
  const [accounts, requests] = await Promise.all([
    db.select().from(mt5AccountsTable),
    db.select().from(mt5RequestsTable),
  ]);
  return [
    { name: "mt5_accounts", rows: accounts as unknown as Record<string, unknown>[] },
    { name: "mt5_requests", rows: requests as unknown as Record<string, unknown>[] },
  ];
}

export async function collectBackupCategory(category: BackupCategory): Promise<BackupDataset[]> {
  switch (category) {
    case "users": return loadUsersData();
    case "system": return loadSystemData();
    case "transactions": return loadTransactionsData();
    case "kyc": return loadKycData();
    case "investments": return loadInvestmentsData();
    case "algo": return loadAlgoData();
    case "copy": return loadCopyData();
    case "mt5": return loadMt5Data();
    case "full": {
      const all = await Promise.all([
        loadUsersData(),
        loadSystemData(),
        loadTransactionsData(),
        loadKycData(),
        loadInvestmentsData(),
        loadAlgoData(),
        loadCopyData(),
        loadMt5Data(),
      ]);
      return all.flat();
    }
    default:
      return [];
  }
}

export function flattenDatasets(datasets: BackupDataset[]): Record<string, unknown>[] {
  return datasets.flatMap(d => d.rows);
}

export async function buildBackupExport(
  category: BackupCategory,
  format: BackupFormat,
): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const datasets = await collectBackupCategory(category);

  if (format === "zip") {
    return buildZipExport(category, datasets, stamp);
  }

  const primary = datasets[0];
  const allRows = flattenDatasets(datasets);
  const baseName = `kuber-backup-${category}-${stamp}`;

  if (format === "json") {
    const payload = category === "full" || datasets.length > 1
      ? Object.fromEntries(datasets.map(d => [d.name, d.rows.map(r => sanitizeRow(r as Record<string, unknown>))]))
      : allRows.map(r => sanitizeRow(r as Record<string, unknown>));
    return {
      buffer: Buffer.from(JSON.stringify({
        exportedAt: new Date().toISOString(),
        category,
        version: 1,
        data: payload,
      }, null, 2)),
      filename: `${baseName}.json`,
      contentType: "application/json; charset=utf-8",
    };
  }

  if (format === "xlsx") {
    const wb = XLSX.utils.book_new();
    for (const ds of datasets) {
      const sanitized = ds.rows.map(r => sanitizeRow(r as Record<string, unknown>));
      const ws = XLSX.utils.json_to_sheet(sanitized.length ? sanitized : [{ note: "empty" }]);
      XLSX.utils.book_append_sheet(wb, ws, ds.name.slice(0, 31));
    }
    return {
      buffer: Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" })),
      filename: `${baseName}.xlsx`,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }

  // csv — single sheet or combined
  const csv = datasets.length === 1 && primary
    ? rowsToCsv(primary.rows)
    : rowsToCsv(allRows.map(r => ({ _table: datasets.find(d => d.rows.includes(r))?.name ?? "mixed", ...r })));
  return {
    buffer: Buffer.from(csv, "utf-8"),
    filename: `${baseName}.csv`,
    contentType: "text/csv; charset=utf-8",
  };
}

async function buildZipExport(
  category: BackupCategory,
  datasets: BackupDataset[],
  stamp: string,
): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  type ArchiverFactory = (format: string, options?: Record<string, unknown>) => NodeJS.ReadableStream & {
    append(source: unknown, options?: { name?: string }): unknown;
    finalize(): Promise<void>;
  };
  const mod = await import("archiver") as unknown as ArchiverFactory | { default: ArchiverFactory };
  const createArchive: ArchiverFactory = "default" in mod ? mod.default : mod;
  const archive = createArchive("zip", { zlib: { level: 9 } });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  stream.on("data", (c: Buffer) => chunks.push(c));

  const done = new Promise<Buffer>((resolve, reject) => {
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    archive.on("error", reject);
  });

  archive.pipe(stream);

  archive.append(JSON.stringify({
    exportedAt: new Date().toISOString(),
    category,
    version: 1,
    platform: "kuber-quant",
    note: "Sensitive fields are redacted. Passwords and secrets are NOT included for security.",
  }, null, 2), { name: "README.json" });

  for (const ds of datasets) {
    archive.append(rowsToJson(ds.rows), { name: `${ds.name}.json` });
    archive.append(rowsToCsv(ds.rows), { name: `${ds.name}.csv` });
    archive.append(rowsToXlsxBuffer(ds.name, ds.rows), { name: `${ds.name}.xlsx` });
  }

  await archive.finalize();
  const buffer = await done;

  return {
    buffer,
    filename: `kuber-backup-${category}-${stamp}.zip`,
    contentType: "application/zip",
  };
}

export const BACKUP_CATEGORIES: { id: BackupCategory; label: string; description: string }[] = [
  { id: "users", label: "Users Data", description: "Accounts, profiles, and payout methods (secrets redacted)" },
  { id: "system", label: "System Data", description: "Site settings, plans catalog, gateways, tickets, audit logs" },
  { id: "transactions", label: "Transactional Data", description: "Deposits, withdrawals, wallet ledger, login history" },
  { id: "kyc", label: "Users KYC", description: "All KYC submissions and verification records" },
  { id: "investments", label: "Investment Data", description: "User investments and ROI payouts" },
  { id: "algo", label: "Algo Trading", description: "Algo subscriptions and strategy catalog" },
  { id: "copy", label: "Copy Trading", description: "Copy follows and trader catalog" },
  { id: "mt5", label: "MT4/MT5 Account Handling", description: "Linked accounts and relay requests (passwords redacted)" },
  { id: "full", label: "Complete Project Backup", description: "All categories in a ZIP with CSV, JSON, and Excel per table" },
];
