/**
 * Create kuber-quant-hostinger.zip for Hostinger "Upload your files" deploy.
 * Strips packageManager from package.json so hPanel does not auto-select Corepack pnpm
 * (which crashes on alt-nodejs with ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING).
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const staging = resolve(root, ".hostinger-upload");
const archiveZip = resolve(staging, "src.zip");
const outZip = resolve(root, "kuber-quant-hostinger.zip");

function run(cmd, cwd = root) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd, shell: true });
}

rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });

run(`git archive -o "${archiveZip}" HEAD`, root);

if (process.platform === "win32") {
  run(
    `powershell -NoProfile -Command "Expand-Archive -Path '${archiveZip}' -DestinationPath '${staging}' -Force"`,
    root,
  );
} else {
  run(`unzip -q "${archiveZip}" -d "${staging}"`, root);
}
rmSync(archiveZip, { force: true });

const pkgPath = resolve(staging, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
delete pkg.packageManager;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

rmSync(outZip, { force: true });
if (process.platform === "win32") {
  run(
    `powershell -NoProfile -Command "Compress-Archive -Path '${staging}\\*' -DestinationPath '${outZip}' -Force"`,
    root,
  );
} else {
  run(`cd "${staging}" && zip -r "${outZip}" .`, root);
}

rmSync(staging, { recursive: true, force: true });
console.log(`\nHostinger upload zip ready: ${outZip}`);
console.log("hPanel settings:");
console.log("  Package manager: npm");
console.log("  Install command: node scripts/hostinger-install.mjs");
console.log("  Build command:   HOSTINGER_SKIP_INSTALL=1 node scripts/hostinger-build.mjs");
console.log("  Start command:   node server.js");
