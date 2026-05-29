import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "../artifacts/trading-platform/src");

const REPLACEMENTS = [
  // Fix hover states that lost dark: prefix on hover
  [/hover:text-amber-700 dark:text-amber-300/g, "hover:text-amber-700 dark:hover:text-amber-300"],
  [/hover:text-emerald-700 dark:text-emerald-300/g, "hover:text-emerald-700 dark:hover:text-emerald-300"],
  [/hover:text-blue-700 dark:text-blue-300/g, "hover:text-blue-700 dark:hover:text-blue-300"],
  // Duplicate backgrounds
  [/bg-background bg-background/g, "bg-background"],
  [/bg-muted\/60 dark:bg-muted\/60 dark:bg-white\/5/g, "bg-muted/60 dark:bg-white/5"],
  [/border-border dark:border-border dark:border-white\/10/g, "border-border dark:border-white/10"],
  [/dark:bg-muted\/60 dark:bg-white\/5/g, "dark:bg-white/5"],
  [/dark:border-border dark:border-white\/10/g, "dark:border-white/10"],
  // text-red-400 without light variant in conditionals - leave as is
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      walk(full, files);
    } else if (/\.tsx$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

let count = 0;
for (const file of walk(SRC)) {
  let content = fs.readFileSync(file, "utf8");
  const original = content;
  for (const [from, to] of REPLACEMENTS) {
    content = content.replace(from, to);
  }
  if (content !== original) {
    fs.writeFileSync(file, content);
    count++;
    console.log("Cleaned:", path.relative(SRC, file));
  }
}
console.log(`\n${count} files cleaned.`);
