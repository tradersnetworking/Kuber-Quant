import { useAuth } from "@/hooks/use-auth";

const DEFAULT_WITHDRAWAL_BLOCK_MESSAGE =
  "Withdrawals are currently disabled for your account. Please contact support for assistance.";

export function useWithdrawalBlock() {
  const { user } = useAuth();
  const profile = user as (typeof user & { withdrawalsEnabled?: boolean; withdrawalBlockMessage?: string | null }) | null;
  const blocked = profile?.withdrawalsEnabled === false;
  const message = profile?.withdrawalBlockMessage?.trim() || DEFAULT_WITHDRAWAL_BLOCK_MESSAGE;
  return { blocked, message };
}
