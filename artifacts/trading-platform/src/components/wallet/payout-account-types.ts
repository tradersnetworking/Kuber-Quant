/** Shared payout / withdrawal account shape (bank, UPI, crypto). */
export type PaymentAccount = {
  id: number;
  label: string;
  accountType: "bank" | "upi" | "crypto";
  accountHolderName?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  branchName?: string | null;
  upiId?: string | null;
  upiQrUrl?: string | null;
  cryptoSymbol?: string | null;
  cryptoNetwork?: string | null;
  walletAddress?: string | null;
  walletQrUrl?: string | null;
  isDefault: boolean;
};
