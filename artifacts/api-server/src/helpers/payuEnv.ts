/** PayU live vs test environment. Accepts common aliases used in .env files. */
export function isPayULive(env: string | undefined): boolean {
  const value = (env || "test").trim().toLowerCase();
  return value === "prod" || value === "production" || value === "live";
}

export function payUBaseUrl(env: string | undefined): string {
  return isPayULive(env) ? "https://secure.payu.in" : "https://test.payu.in";
}
