import { randomBytes, randomInt } from "crypto";

type CaptchaEntry = { answer: number; expires: number };

const store = new Map<string, CaptchaEntry>();

function purgeExpired() {
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.expires < now) store.delete(k);
  }
}

export function createCaptchaChallenge(): { captchaToken: string; question: string } {
  purgeExpired();
  const a = randomInt(1, 10);
  const b = randomInt(1, 10);
  const token = randomBytes(16).toString("hex");
  store.set(token, { answer: a + b, expires: Date.now() + 15 * 60 * 1000 });
  return { captchaToken: token, question: `${a} + ${b}` };
}

export function verifyCaptchaChallenge(token: string, answer: string | number): boolean {
  purgeExpired();
  const entry = store.get(token);
  if (!entry || entry.expires < Date.now()) return false;
  const ok = entry.answer === Number(answer);
  if (ok) store.delete(token);
  return ok;
}
