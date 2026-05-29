/** True when the user is treated as an Indian resident for KYC document requirements. */
export function isIndianUser(country?: string | null, nationality?: string | null): boolean {
  const c = (country || "").trim().toLowerCase();
  const n = (nationality || "").trim().toLowerCase();
  return c === "india" || n === "india" || n === "indian";
}
