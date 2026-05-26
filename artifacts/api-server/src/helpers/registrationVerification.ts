import { randomBytes } from "crypto";

type Entry = { email: string; channel: string; expires: number };

const store = new Map<string, Entry>();

function purgeExpired() {
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.expires < now) store.delete(k);
  }
}

export function issueRegistrationVerification(email: string, channel: string): string {
  purgeExpired();
  const token = randomBytes(24).toString("hex");
  store.set(token, { email: email.toLowerCase(), channel, expires: Date.now() + 30 * 60 * 1000 });
  return token;
}

export function consumeRegistrationVerification(token: string, email: string, channel: string): boolean {
  purgeExpired();
  const entry = store.get(token);
  if (!entry || entry.expires < Date.now()) return false;
  if (entry.email !== email.toLowerCase() || entry.channel !== channel) return false;
  store.delete(token);
  return true;
}
