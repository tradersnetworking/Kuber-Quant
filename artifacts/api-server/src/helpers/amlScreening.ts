/**
 * Basic name screening against a static sanctions / PEP watchlist.
 * Production: set AML_PROVIDER=sumsub for Sumsub integration (see amlProviderService.ts).
 */
const BLOCKED_NAMES = [
  "osama bin laden",
  "al-qaida",
  "taliban",
  "isis",
  "hezbollah",
  "hamas",
];

const BLOCKED_PATTERNS = [
  /\bterror(ist|ism)\b/i,
  /\bmoney\s*launder/i,
];

export type AmlScreenResult = {
  passed: boolean;
  flags: string[];
  riskScore: number;
};

export function screenIndividualName(fullName: string): AmlScreenResult {
  const normalized = fullName.trim().toLowerCase();
  const flags: string[] = [];

  for (const blocked of BLOCKED_NAMES) {
    if (normalized.includes(blocked)) {
      flags.push(`watchlist_match:${blocked}`);
    }
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(fullName)) {
      flags.push(`pattern_match:${pattern.source}`);
    }
  }

  const riskScore = flags.length * 50;
  return {
    passed: flags.length === 0,
    flags,
    riskScore: Math.min(100, riskScore),
  };
}

export function screenKycIdentity(opts: {
  fullName: string;
  panNumber?: string | null;
  aadhaarNumber?: string | null;
}): AmlScreenResult {
  const nameResult = screenIndividualName(opts.fullName);
  const flags = [...nameResult.flags];

  if (opts.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(opts.panNumber.trim())) {
    flags.push("invalid_pan_format");
  }

  return {
    passed: flags.length === 0,
    flags,
    riskScore: Math.min(100, flags.length * 40),
  };
}
