import { createHmac } from "crypto";
import { logger } from "../lib/logger";
import { screenKycIdentity, type AmlScreenResult } from "./amlScreening";

export type AmlProvider = "local" | "sumsub";

function getAmlProvider(): AmlProvider {
  const raw = process.env.AML_PROVIDER?.trim().toLowerCase();
  if (raw === "sumsub" && process.env.SUMSUB_APP_TOKEN?.trim() && process.env.SUMSUB_SECRET_KEY?.trim()) {
    return "sumsub";
  }
  return "local";
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Unknown", lastName: "User" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "-" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function sumsubBaseUrl(): string {
  return (process.env.SUMSUB_BASE_URL?.trim() || "https://api.sumsub.com").replace(/\/+$/, "");
}

function sumsubSign(method: string, path: string, body: string, ts: number): string {
  const payload = `${ts}${method.toUpperCase()}${path}${body}`;
  return createHmac("sha256", process.env.SUMSUB_SECRET_KEY!.trim()).update(payload).digest("hex");
}

async function sumsubRequest<T>(method: string, apiPath: string, body?: unknown): Promise<T> {
  const ts = Math.floor(Date.now() / 1000);
  const bodyStr = body ? JSON.stringify(body) : "";
  const signature = sumsubSign(method, apiPath, bodyStr, ts);

  const response = await fetch(`${sumsubBaseUrl()}${apiPath}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-App-Token": process.env.SUMSUB_APP_TOKEN!.trim(),
      "X-App-Access-Sig": signature,
      "X-App-Access-Ts": String(ts),
    },
    body: body ? bodyStr : undefined,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Sumsub API ${response.status}: ${text.slice(0, 300)}`);
  }

  return response.json() as Promise<T>;
}

type SumsubApplicant = { id: string };
type SumsubStatus = {
  reviewStatus?: string;
  reviewResult?: { reviewAnswer?: string; rejectLabels?: string[] };
};

async function ensureSumsubApplicant(opts: {
  userId: number;
  fullName: string;
  country?: string | null;
}): Promise<string> {
  const externalUserId = `kuber-user-${opts.userId}`;
  const levelName = process.env.SUMSUB_LEVEL_NAME?.trim() || "basic-kyc-level";
  const { firstName, lastName } = splitFullName(opts.fullName);

  try {
    const existing = await sumsubRequest<SumsubApplicant>(
      "GET",
      `/resources/applicants/-/one?externalUserId=${encodeURIComponent(externalUserId)}`,
    );
    if (existing?.id) return existing.id;
  } catch {
    // Applicant may not exist yet — create below.
  }

  const created = await sumsubRequest<SumsubApplicant>(
    "POST",
    `/resources/applicants?levelName=${encodeURIComponent(levelName)}`,
    {
      externalUserId,
      fixedInfo: {
        firstName,
        lastName,
        country: opts.country?.trim() || undefined,
      },
    },
  );
  return created.id;
}

async function getSumsubReview(applicantId: string): Promise<SumsubStatus> {
  return sumsubRequest<SumsubStatus>("GET", `/resources/applicants/${applicantId}/status`);
}

function mapSumsubToResult(status: SumsubStatus): AmlScreenResult {
  const answer = status.reviewResult?.reviewAnswer?.toUpperCase();
  const flags: string[] = [];

  if (answer === "GREEN") {
    return { passed: true, flags, riskScore: 0 };
  }

  if (answer === "RED") {
    flags.push("sumsub_rejected");
    for (const label of status.reviewResult?.rejectLabels || []) {
      flags.push(`sumsub:${label}`);
    }
    return { passed: false, flags, riskScore: 100 };
  }

  flags.push(`sumsub_pending:${status.reviewStatus || "unknown"}`);
  return { passed: false, flags, riskScore: 50 };
}

async function screenWithSumsub(opts: {
  userId: number;
  fullName: string;
  country?: string | null;
  panNumber?: string | null;
  aadhaarNumber?: string | null;
}): Promise<AmlScreenResult> {
  const localFormat = screenKycIdentity({
    fullName: opts.fullName,
    panNumber: opts.panNumber,
    aadhaarNumber: opts.aadhaarNumber,
  });
  if (!localFormat.passed) return localFormat;

  try {
    const applicantId = await ensureSumsubApplicant({
      userId: opts.userId,
      fullName: opts.fullName,
      country: opts.country,
    });
    const status = await getSumsubReview(applicantId);
    return mapSumsubToResult(status);
  } catch (err) {
    logger.error({ err, userId: opts.userId }, "Sumsub AML screening failed — falling back to local");
    return localFormat;
  }
}

export async function screenKycWithProvider(opts: {
  userId: number;
  fullName: string;
  country?: string | null;
  panNumber?: string | null;
  aadhaarNumber?: string | null;
}): Promise<AmlScreenResult & { provider: AmlProvider }> {
  const provider = getAmlProvider();
  if (provider === "sumsub") {
    const result = await screenWithSumsub(opts);
    return { ...result, provider };
  }
  return { ...screenKycIdentity(opts), provider: "local" };
}

export function getActiveAmlProvider(): AmlProvider {
  return getAmlProvider();
}
