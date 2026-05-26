import { chromium } from "playwright";

const BASE = process.env.WEB_URL || "http://127.0.0.1:3002";
const paths = ["/", "/login", "/dashboard", "/wallet", "/copy-trading", "/mt5-relay", "/super-admin", "/super-admin/mt5", "/admin", "/manager"];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];

page.on("pageerror", (err) => errors.push({ type: "pageerror", msg: err.message }));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push({ type: "console", msg: msg.text() });
});

for (const path of paths) {
  errors.length = 0;
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 30000 }).catch(e => {
    console.log(`FAIL ${path} navigation: ${e.message}`);
    return;
  });
  await page.waitForTimeout(1500);
  const rootText = await page.locator("#root").innerText().catch(() => "");
  const rootHtml = await page.locator("#root").innerHTML().catch(() => "");
  const blank = rootText.trim().length < 5 && rootHtml.trim().length < 50;
  console.log(`${blank ? "BLANK" : "OK   "} ${path} | textLen=${rootText.trim().length} | errors=${errors.length}`);
  if (errors.length) {
    errors.slice(0, 3).forEach(e => console.log(`  ${e.type}: ${e.msg}`));
  }
}

await browser.close();
