/**
 * Patches missing keys inside existing locale sections (common, wallet, support, exchange, etc.)
 * Run after adding new keys to en.ts: node scripts/patch-missing-i18n-keys.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EN_PATH = path.join(ROOT, "src/lib/i18n/locales/en.ts");
const OVERRIDES_PATH = path.join(ROOT, "src/lib/i18n/locales/overrides.ts");

const LOCALE_CODES = [
  "hi", "bn", "te", "ta", "mr", "gu", "kn", "ml", "pa", "or", "as", "ur",
  "es", "fr", "de", "ar", "zh", "pt", "ru", "ja", "ko", "id", "tr", "vi", "th", "it",
];

const GOOGLE_LANG = { zh: "zh-CN" };

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function translateText(text, targetLang, retries = 3) {
  const lang = GOOGLE_LANG[targetLang] || targetLang;
  for (let attempt = 0; attempt < retries; attempt++) {
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", "en");
    url.searchParams.set("tl", lang);
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", text);
    const res = await fetch(url.toString());
    if (res.ok) {
      const data = await res.json();
      return data[0]?.map((x) => x[0]).join("") || text;
    }
    await sleep(500 * (attempt + 1));
  }
  throw new Error(`Translate failed after retries: ${text.slice(0, 40)}`);
}

function parseSections(raw) {
  const sections = {};
  const sectionNames = raw.match(/^\s{2}(\w+):\s*\{/gm)?.map(m => m.trim().replace(":", "").replace("{", "").trim()) || [];
  for (const section of sectionNames) {
    const re = new RegExp(`\\n  ${section}:\\s*\\{([\\s\\S]*?)\\n  \\},`, "m");
    const match = raw.match(re);
    if (!match) continue;
    const entries = {};
    for (const line of match[1].split("\n")) {
      const m = line.match(/^\s*(\w+):\s*"((?:[^"\\]|\\.)*)"/);
      if (m) entries[m[1]] = m[2].replace(/\\"/g, '"');
    }
    sections[section] = entries;
  }
  return sections;
}

function parseLocaleSection(raw, locale, section) {
  const localeRe = new RegExp(`\\n  ${locale}:\\s*\\{([\\s\\S]*?)(\\n  \\},\\n  [a-z]{2}:|\\n\\};)`, "m");
  const localeMatch = raw.match(localeRe);
  if (!localeMatch) return {};
  const block = localeMatch[1];
  const re = new RegExp(`\\n    ${section}:\\s*\\{([\\s\\S]*?)\\n    \\},`, "m");
  const match = block.match(re);
  if (!match) return {};
  const entries = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^\s*(\w+):\s*"((?:[^"\\]|\\.)*)"/);
    if (m) entries[m[1]] = m[2].replace(/\\"/g, '"');
  }
  return entries;
}

function escapeStr(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function main() {
  const enRaw = fs.readFileSync(EN_PATH, "utf8");
  const enSections = parseSections(enRaw);
  let overrides = fs.readFileSync(OVERRIDES_PATH, "utf8");

  for (const locale of LOCALE_CODES) {
    console.log(`\n=== ${locale} ===`);
    for (const [section, enEntries] of Object.entries(enSections)) {
      if (section === "roles" || section === "layout" || section === "auth" || section === "nav" || section === "landing" || section === "sections") continue;
      const existing = parseLocaleSection(overrides, locale, section);
      const missing = Object.entries(enEntries).filter(([k]) => !existing[k]);
      if (missing.length === 0) continue;
      console.log(`  ${section}: +${missing.length} keys`);
      const additions = [];
      for (const [key, value] of missing) {
        let protectedText = value.replace(/\{\{(\w+)\}\}/g, (_, name) => `__T_${name}__`);
        let translated = await translateText(protectedText, locale);
        translated = translated.replace(/__T_(\w+)__/g, (_, name) => `{{${name}}}`);
        additions.push(`      ${key}: "${escapeStr(translated)}",`);
        await sleep(60);
      }
      const sectionRe = new RegExp(
        `(\\n  ${locale}:\\s*\\{[\\s\\S]*?\\n    ${section}:\\s*\\{[\\s\\S]*?)(\\n    \\},)`,
        "m",
      );
      if (!sectionRe.test(overrides)) {
        console.warn(`    section ${section} not found for ${locale}`);
        continue;
      }
      overrides = overrides.replace(sectionRe, `$1\n${additions.join("\n")}$2`);
      fs.writeFileSync(OVERRIDES_PATH, overrides, "utf8");
    }
  }
  console.log("\nPatch complete.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
