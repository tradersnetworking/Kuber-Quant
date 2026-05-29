/**
 * Bulk-fix hardcoded dark-only Tailwind classes for light/dark theme support.
 * Run: node scripts/fix-light-mode-colors.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "../artifacts/trading-platform/src");

const REPLACEMENTS = [
  // Surfaces & borders (order matters — longer patterns first)
  ["bg-white/\\[0\\.04\\]", "bg-muted/60 dark:bg-white/[0.04]"],
  ["bg-white/\\[0\\.03\\]", "bg-muted/50 dark:bg-white/[0.03]"],
  ["bg-white/\\[0\\.02\\]", "bg-muted/40 dark:bg-white/[0.02]"],
  ["hover:bg-white/\\[0\\.04\\]", "hover:bg-muted/70 dark:hover:bg-white/[0.04]"],
  ["hover:bg-white/\\[0\\.03\\]", "hover:bg-muted/60 dark:hover:bg-white/[0.03]"],
  ["hover:bg-white/5", "hover:bg-muted/80 dark:hover:bg-white/5"],
  ["bg-white/10", "bg-muted dark:bg-white/10"],
  ["bg-white/5", "bg-muted/60 dark:bg-white/5"],
  ["border-white/15", "border-border dark:border-white/15"],
  ["border-white/20", "border-border dark:border-white/20"],
  ["border-white/10", "border-border dark:border-white/10"],
  ["border-white/5", "border-border/80 dark:border-white/5"],
  ["hover:border-white/10", "hover:border-border dark:hover:border-white/10"],
  ["divide-white/10", "divide-border dark:divide-white/10"],
  ["bg-black/40", "bg-muted/90 dark:bg-black/40"],
  ["bg-black/30", "bg-muted dark:bg-black/30"],
  ["bg-black/25", "bg-muted dark:bg-black/25"],
  ["bg-black/20", "bg-muted/80 dark:bg-black/20"],
  ["bg-\\[#050A14\\]", "bg-background"],
  ["bg-\\[#0A0F1C\\]", "bg-background"],
  ["text-platinum-white/60", "text-muted-foreground"],
  ["text-platinum-white", "text-foreground"],

  // Light text on light bg — add dark variant (skip if already has dark: before)
  ["(?<!dark:)text-amber-300(?!/)", "text-amber-700 dark:text-amber-300"],
  ["(?<!dark:)text-amber-200(?!/)", "text-amber-800 dark:text-amber-200"],
  ["(?<!dark:)text-emerald-300(?!/)", "text-emerald-700 dark:text-emerald-300"],
  ["(?<!dark:)text-emerald-200(?!/)", "text-emerald-800 dark:text-emerald-200"],
  ["(?<!dark:)text-sky-300(?!/)", "text-sky-700 dark:text-sky-300"],
  ["(?<!dark:)text-blue-300(?!/)", "text-blue-700 dark:text-blue-300"],
  ["(?<!dark:)text-violet-300(?!/)", "text-violet-700 dark:text-violet-300"],
  ["(?<!dark:)text-orange-300(?!/)", "text-orange-700 dark:text-orange-300"],
  ["(?<!dark:)text-cyan-300(?!/)", "text-cyan-700 dark:text-cyan-300"],
  ["(?<!dark:)text-indigo-300(?!/)", "text-indigo-700 dark:text-indigo-300"],
  ["(?<!dark:)text-red-300(?!/)", "text-red-600 dark:text-red-300"],
  ["(?<!dark:)text-green-300(?!/)", "text-green-700 dark:text-green-300"],
  ["(?<!dark:)text-green-400(?!/)", "text-green-700 dark:text-green-400"],
  ["(?<!dark:)text-blue-400(?!/)", "text-blue-600 dark:text-blue-400"],
  ["(?<!dark:)text-amber-400(?!/)", "text-amber-600 dark:text-amber-400"],
  ["(?<!dark:)text-emerald-400(?!/)", "text-emerald-600 dark:text-emerald-400"],
  ["(?<!dark:)text-cyan-400(?!/)", "text-cyan-600 dark:text-cyan-400"],
  ["(?<!dark:)text-violet-400(?!/)", "text-violet-600 dark:text-violet-400"],
  ["(?<!dark:)text-orange-400(?!/)", "text-orange-600 dark:text-orange-400"],
  ["(?<!dark:)text-indigo-400(?!/)", "text-indigo-600 dark:text-indigo-400"],
  ["(?<!dark:)text-purple-400(?!/)", "text-purple-600 dark:text-purple-400"],
  ["(?<!dark:)text-rose-400(?!/)", "text-rose-600 dark:text-rose-400"],
  ["(?<!dark:)text-pink-400(?!/)", "text-pink-600 dark:text-pink-400"],
  ["(?<!dark:)text-lime-400(?!/)", "text-lime-600 dark:text-lime-400"],
  ["(?<!dark:)text-teal-400(?!/)", "text-teal-600 dark:text-teal-400"],
  ["(?<!dark:)text-sky-400(?!/)", "text-sky-600 dark:text-sky-400"],
  ["(?<!dark:)text-yellow-400(?!/)", "text-yellow-600 dark:text-yellow-400"],
  ["(?<!dark:)text-fuchsia-400(?!/)", "text-fuchsia-600 dark:text-fuchsia-400"],

  // Fix double-prefixed from re-runs
  ["text-amber-700 dark:text-amber-700 dark:text-amber-300", "text-amber-700 dark:text-amber-300"],
  ["text-emerald-700 dark:text-emerald-700 dark:text-emerald-300", "text-emerald-700 dark:text-emerald-300"],
  ["bg-muted/60 dark:bg-muted/60 dark:bg-white/5", "bg-muted/60 dark:bg-white/5"],
  ["border-border dark:border-border dark:border-white/10", "border-border dark:border-white/10"],
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      walk(full, files);
    } else if (/\.(tsx|ts|css)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

let totalFiles = 0;
let totalChanges = 0;

for (const file of walk(SRC)) {
  let content = fs.readFileSync(file, "utf8");
  const original = content;
  for (const [from, to] of REPLACEMENTS) {
    content = content.replace(new RegExp(from, "g"), to);
  }
  if (content !== original) {
    fs.writeFileSync(file, content);
    totalFiles++;
    totalChanges++;
    console.log("Updated:", path.relative(SRC, file));
  }
}

console.log(`\nDone. ${totalFiles} files updated.`);
