import { execSync } from "node:child_process";

function hasCommand(name) {
  try {
    const check = process.platform === "win32" ? `where ${name}` : `command -v ${name}`;
    execSync(check, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: process.env });
}

process.env.HOSTINGER_DEPLOY = "1";
process.env.CI = "true";

if (!hasCommand("pnpm")) {
  run("corepack enable");
  run("corepack prepare pnpm@9.15.0 --activate");
}

run("pnpm install --frozen-lockfile");
run("pnpm run build:prod");

console.log("Hostinger build complete.");
