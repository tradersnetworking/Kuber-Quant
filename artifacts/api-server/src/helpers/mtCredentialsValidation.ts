export type MtTradingCredentials = {
  accountNumber: string;
  broker: string;
  serverName: string;
  platform?: "mt4" | "mt5" | string;
  tradingPassword: string;
};

export function validateMtTradingCredentials(creds: Partial<MtTradingCredentials>): string | null {
  if (!creds.accountNumber?.trim()) return "MT4/MT5 account number is required";
  if (!creds.broker?.trim()) return "Broker name is required";
  if (!creds.serverName?.trim()) return "Server name is required";
  if (!creds.tradingPassword || creds.tradingPassword.length < 4) return "Trading password is required";
  return null;
}
