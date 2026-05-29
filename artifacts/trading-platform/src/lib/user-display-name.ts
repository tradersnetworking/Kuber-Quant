/** Display name for share cards, profit share, referral invite, etc. */
export function getShareUserDisplayName(
  user: { fullName?: string | null; email?: string | null } | null | undefined,
): string {
  const name = user?.fullName?.trim();
  if (name) return name;
  const email = user?.email?.trim();
  if (email) {
    const local = email.split("@")[0]?.trim();
    if (local) return local;
  }
  return "Investor";
}
