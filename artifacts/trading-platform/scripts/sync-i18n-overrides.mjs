/**
 * Syncs new translation sections from en.ts into overrides.ts for all supported locales.
 * Uses Google Translate (unofficial endpoint) — run after adding keys to en.ts.
 *
 * Usage: node scripts/sync-i18n-overrides.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EN_PATH = path.join(ROOT, "src/lib/i18n/locales/en.ts");
const OVERRIDES_PATH = path.join(ROOT, "src/lib/i18n/locales/overrides.ts");

const NEW_SECTIONS = [
  "language",
  "dashboard",
  "quickActions",
  "status",
  "priority",
  "categories",
  "kyc",
  "support",
  "exchange",
  "transactions",
  "notFound",
];

const WALLET_EXTRA_KEYS = [
  "title",
  "subtitle",
  "fiatBalance",
  "cryptoBalance",
  "transfer",
  "accounts",
  "history",
  "transferSuccess",
  "transferSuccessDesc",
  "transferFailed",
  "depositUnavailable",
  "withdrawUnavailable",
];

const COMMON_EXTRA_KEYS = [
  "subject",
  "message",
  "category",
  "priority",
  "date",
  "amount",
  "type",
  "manage",
  "viewAll",
  "live",
  "primary",
  "share",
  "earned",
  "referrals",
  "unavailable",
];

const LOCALE_CODES = [
  "hi", "bn", "te", "ta", "mr", "gu", "kn", "ml", "pa", "or", "as", "ur",
  "es", "fr", "de", "ar", "zh", "pt", "ru", "ja", "ko", "id", "tr", "vi", "th", "it",
];

const GOOGLE_LANG = {
  zh: "zh-CN",
  pa: "pa",
  or: "or",
  as: "as",
};

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function translateText(text, targetLang) {
  const lang = GOOGLE_LANG[targetLang] || targetLang;
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "en");
  url.searchParams.set("tl", lang);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Translate failed (${res.status}): ${text.slice(0, 40)}`);
  const data = await res.json();
  return data[0]?.map((x) => x[0]).join("") || text;
}

async function translateSection(entries, targetLang) {
  const result = {};
  for (const [key, value] of Object.entries(entries)) {
    // Preserve interpolation tokens like {{name}}
    const tokens = [];
    let protectedText = value.replace(/\{\{(\w+)\}\}/g, (_, name) => {
      const token = `__TOKEN_${tokens.length}__`;
      tokens.push({ token, replacement: `{{${name}}}` });
      return token;
    });
    let translated = await translateText(protectedText, targetLang);
    for (const { token, replacement } of tokens) {
      translated = translated.replaceAll(token, replacement);
    }
    result[key] = translated;
    await sleep(80);
  }
  return result;
}

function loadEnSections() {
  const raw = fs.readFileSync(EN_PATH, "utf8");
  const sections = {};
  for (const section of [...NEW_SECTIONS, "wallet", "common"]) {
    const re = new RegExp(`${section}:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`, "m");
    const match = raw.match(re);
    if (!match) continue;
    const block = match[1];
    const entries = {};
    for (const line of block.split("\n")) {
      const m = line.match(/^\s*(\w+):\s*"((?:[^"\\]|\\.)*)"/);
      if (m) entries[m[1]] = m[2].replace(/\\"/g, '"');
    }
    if (section === "wallet") {
      for (const k of Object.keys(entries)) {
        if (!WALLET_EXTRA_KEYS.includes(k)) delete entries[k];
      }
    }
    if (section === "common") {
      for (const k of Object.keys(entries)) {
        if (!COMMON_EXTRA_KEYS.includes(k)) delete entries[k];
      }
    }
    sections[section] = entries;
  }
  return sections;
}

function escapeStr(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function formatSection(name, entries) {
  const lines = Object.entries(entries).map(
    ([k, v]) => `      ${k}: "${escapeStr(v)}",`,
  );
  return `    ${name}: {\n${lines.join("\n")}\n    },`;
}

function sectionExistsInLocale(source, localeCode, sectionName) {
  const re = new RegExp(`\\n  ${localeCode}:\\s*\\{[\\s\\S]*?\\n    ${sectionName}:\\s*\\{`, "m");
  return re.test(source);
}

async function main() {
  const enSections = loadEnSections();
  let overrides = fs.readFileSync(OVERRIDES_PATH, "utf8");

  for (const locale of LOCALE_CODES) {
    console.log(`\n=== ${locale} ===`);
    const patches = [];

    for (const section of ["common", "wallet", ...NEW_SECTIONS]) {
      if (sectionExistsInLocale(overrides, locale, section)) {
        console.log(`  skip ${section} (exists)`);
        continue;
      }
      const entries = enSections[section];
      if (!entries || Object.keys(entries).length === 0) continue;
      console.log(`  translating ${section} (${Object.keys(entries).length} keys)...`);
      const translated = await translateSection(entries, locale);
      patches.push(formatSection(section, translated));
    }

    if (patches.length === 0) continue;

    const localeRe = new RegExp(`(\\n  ${locale}:\\s*\\{[\\s\\S]*?)(\\n  \\},\\n  [a-z]{2}:|\\n\\};\\s*$)`, "m");
    const match = overrides.match(localeRe);
    if (!match) {
      console.warn(`  Could not find locale block for ${locale}`);
      continue;
    }
    overrides = overrides.replace(localeRe, `$1\n${patches.join("\n")}$2`);
    fs.writeFileSync(OVERRIDES_PATH, overrides, "utf8");
    console.log(`  patched ${patches.length} section(s)`);
  }

  console.log("\nDone.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
