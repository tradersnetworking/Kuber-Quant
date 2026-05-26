import { db, transactionsTable, paymentGatewaysTable } from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";

export type BlockchainVerificationResult = {
  verified: boolean;
  status: "confirmed" | "pending" | "failed" | "not_found" | "mismatch" | "unsupported" | "duplicate";
  network: string;
  symbol: string;
  txHash: string;
  confirmations: number;
  requiredConfirmations: number;
  onChainAmount: number | null;
  onChainSymbol: string | null;
  recipientAddress: string | null;
  expectedAddress: string | null;
  addressMatch: boolean;
  amountMatch: boolean;
  blockTime: string | null;
  explorerUrl: string | null;
  message: string;
};

const REQUIRED_CONFIRMATIONS: Record<string, number> = {
  BTC: 2,
  BITCOIN: 2,
  ETH: 12,
  ERC20: 12,
  ETHEREUM: 12,
  TRC20: 19,
  TRON: 19,
  TRX: 19,
  BEP20: 15,
  BSC: 15,
  BNB: 15,
};

function normalizeAddr(a: string | null | undefined): string {
  if (!a) return "";
  return a.trim().toLowerCase();
}

function amountsClose(expected: number, actual: number, tolerance = 0.02): boolean {
  if (!Number.isFinite(expected) || !Number.isFinite(actual)) return false;
  if (expected === 0) return actual === 0;
  return Math.abs(expected - actual) / expected <= tolerance;
}

function parseNotesMeta(notes: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!notes) return out;
  for (const part of notes.split("|")) {
    const idx = part.indexOf(":");
    if (idx > 0) out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  return out;
}

export async function resolveCryptoDepositContext(transactionId: number) {
  const [txn] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, transactionId)).limit(1);
  if (!txn) throw new Error("Transaction not found");
  if (txn.type !== "deposit") throw new Error("Only deposits can be verified on-chain");
  if (!txn.txHash?.trim()) throw new Error("No blockchain transaction hash on this deposit");

  const meta = parseNotesMeta(txn.notes);
  let gateway = null;
  if (txn.gatewayOrderId) {
    const gwId = Number(txn.gatewayOrderId);
    if (Number.isFinite(gwId)) {
      const [row] = await db.select().from(paymentGatewaysTable).where(eq(paymentGatewaysTable.id, gwId)).limit(1);
      gateway = row ?? null;
    }
  }

  const symbol = (meta.symbol || gateway?.symbol || txn.currency || "USDT").toUpperCase();
  const network = (meta.network || gateway?.network || defaultNetworkForSymbol(symbol)).toUpperCase();
  const expectedAddress = meta.wallet || gateway?.walletAddress || null;

  return { txn, symbol, network, expectedAddress, meta };
}

function defaultNetworkForSymbol(symbol: string): string {
  if (symbol === "BTC") return "BITCOIN";
  if (symbol === "ETH") return "ERC20";
  if (symbol === "TRX") return "TRON";
  if (symbol === "BNB") return "BEP20";
  if (symbol === "USDT") return "TRC20";
  return symbol;
}

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Explorer API error (${res.status})`);
  return res.json();
}

async function verifyBitcoin(txHash: string, expectedAddress: string | null, expectedAmount: number): Promise<BlockchainVerificationResult> {
  const base = "https://blockstream.info/api";
  let tx: any;
  try {
    tx = await fetchJson(`${base}/tx/${txHash}`);
  } catch {
    return fail("BTC", txHash, "BITCOIN", "Transaction not found on Bitcoin network", "not_found");
  }
  const status = await fetchJson(`${base}/tx/${txHash}/status`).catch(() => ({ confirmed: false }));
  const confirmations = status.confirmed ? Math.max(1, (status.block_height ? 6 : 1)) : 0;
  const outputs = (tx.vout || []) as Array<{ value: number; scriptpubkey_address?: string }>;
  const matchOut = outputs.find(o => !expectedAddress || normalizeAddr(o.scriptpubkey_address) === normalizeAddr(expectedAddress));
  const onChainAmount = matchOut ? matchOut.value / 1e8 : outputs[0] ? outputs[0].value / 1e8 : null;
  const recipient = matchOut?.scriptpubkey_address || outputs[0]?.scriptpubkey_address || null;
  const addressMatch = !expectedAddress || normalizeAddr(recipient) === normalizeAddr(expectedAddress);
  const amountMatch = onChainAmount != null && amountsClose(expectedAmount, onChainAmount, 0.001);
  const required = REQUIRED_CONFIRMATIONS.BTC;
  const confirmed = !!status.confirmed && confirmations >= required;
  const verified = confirmed && addressMatch && amountMatch;

  return {
    verified,
    status: verified ? "confirmed" : !status.confirmed ? "pending" : addressMatch && amountMatch ? "pending" : "mismatch",
    network: "BITCOIN",
    symbol: "BTC",
    txHash,
    confirmations,
    requiredConfirmations: required,
    onChainAmount,
    onChainSymbol: "BTC",
    recipientAddress: recipient,
    expectedAddress,
    addressMatch,
    amountMatch,
    blockTime: tx.status?.block_time ? new Date(tx.status.block_time * 1000).toISOString() : null,
    explorerUrl: `https://blockstream.info/tx/${txHash}`,
    message: verified
      ? "Bitcoin payment confirmed on-chain."
      : !status.confirmed
        ? "Transaction found but awaiting block confirmations."
        : !addressMatch
          ? "Recipient address does not match platform deposit wallet."
          : "On-chain amount does not match declared deposit amount.",
  };
}

async function verifyTron(txHash: string, expectedAddress: string | null, expectedAmount: number, symbol: string): Promise<BlockchainVerificationResult> {
  const info = await fetchJson(`https://apilist.tronscan.org/api/transaction-info?hash=${encodeURIComponent(txHash)}`).catch(() => null);
  if (!info?.hash) {
    return fail(symbol, txHash, "TRON", "Transaction not found on Tron network", "not_found");
  }

  let onChainAmount: number | null = null;
  let recipient: string | null = null;
  let onChainSymbol = symbol;

  const trc20 = info.trc20TransferInfo?.[0];
  if (trc20) {
    recipient = trc20.to_address || trc20.toAddress || null;
    onChainAmount = Number(trc20.amount_str || trc20.amount || 0) / Math.pow(10, Number(trc20.decimals || 6));
    onChainSymbol = (trc20.symbol || symbol).toUpperCase();
  } else if (info.contractType === 1 || symbol === "TRX") {
    const c = info.contractData || info.raw_data?.contract?.[0]?.parameter?.value;
    recipient = c?.to_address || c?.toAddress || info.toAddress || null;
    onChainAmount = Number(info.amount || c?.amount || 0) / 1e6;
    onChainSymbol = "TRX";
  }

  const confirmed = info.confirmed === true || info.contractRet === "SUCCESS";
  const confirmations = confirmed ? REQUIRED_CONFIRMATIONS.TRON : 0;
  const addressMatch = !expectedAddress || normalizeAddr(recipient) === normalizeAddr(expectedAddress);
  const amountMatch = onChainAmount != null && amountsClose(expectedAmount, onChainAmount);
  const required = REQUIRED_CONFIRMATIONS.TRC20;
  const verified = confirmed && confirmations >= required && addressMatch && amountMatch;

  return {
    verified,
    status: verified ? "confirmed" : !confirmed ? "pending" : addressMatch && amountMatch ? "pending" : "mismatch",
    network: "TRON",
    symbol: onChainSymbol,
    txHash,
    confirmations,
    requiredConfirmations: required,
    onChainAmount,
    onChainSymbol,
    recipientAddress: recipient,
    expectedAddress,
    addressMatch,
    amountMatch,
    blockTime: info.timestamp ? new Date(info.timestamp).toISOString() : null,
    explorerUrl: `https://tronscan.org/#/transaction/${txHash}`,
    message: verified
      ? "Tron payment confirmed on-chain."
      : !confirmed
        ? "Transaction found but not yet confirmed."
        : !addressMatch
          ? "Recipient address does not match platform deposit wallet."
          : "On-chain amount does not match declared deposit amount.",
  };
}

async function verifyEvmScan(opts: {
  txHash: string;
  expectedAddress: string | null;
  expectedAmount: number;
  symbol: string;
  network: string;
  apiUrl: string;
  apiKeyEnv: string;
  explorerBase: string;
  chainId?: number;
}): Promise<BlockchainVerificationResult> {
  const apiKey = process.env[opts.apiKeyEnv] || "";
  const keyParam = apiKey ? `&apikey=${apiKey}` : "";

  const tx = await fetchJson(`${opts.apiUrl}?module=proxy&action=eth_getTransactionByHash&txhash=${opts.txHash}${keyParam}`).catch(() => null);
  const receipt = await fetchJson(`${opts.apiUrl}?module=proxy&action=eth_getTransactionReceipt&txhash=${opts.txHash}${keyParam}`).catch(() => null);

  if (!tx?.result) {
    return fail(opts.symbol, opts.txHash, opts.network, "Transaction not found on this network", "not_found");
  }

  let onChainAmount: number | null = null;
  let recipient: string | null = tx.result.to || null;
  let onChainSymbol = opts.symbol;
  const confirmed = receipt?.result?.status === "0x1";
  const blockNum = receipt?.result?.blockNumber ? parseInt(receipt.result.blockNumber, 16) : 0;
  const latest = await fetchJson(`${opts.apiUrl}?module=proxy&action=eth_blockNumber${keyParam}`).catch(() => ({ result: "0x0" }));
  const latestNum = parseInt(latest?.result || "0x0", 16);
  const confirmations = blockNum && latestNum ? Math.max(0, latestNum - blockNum + 1) : confirmed ? 1 : 0;

  if (opts.symbol === "ETH" || opts.symbol === "BNB") {
    onChainAmount = parseInt(tx.result.value || "0x0", 16) / 1e18;
    onChainSymbol = opts.symbol;
  } else {
    const tokenTx = await fetchJson(
      `${opts.apiUrl}?module=account&action=tokentx&txhash=${opts.txHash}${keyParam}`,
    ).catch(() => ({ result: [] }));
    const transfer = Array.isArray(tokenTx?.result) ? tokenTx.result[0] : null;
    if (transfer) {
      recipient = transfer.to;
      const dec = Number(transfer.tokenDecimal || 6);
      onChainAmount = Number(transfer.value) / Math.pow(10, dec);
      onChainSymbol = (transfer.tokenSymbol || opts.symbol).toUpperCase();
    }
  }

  const addressMatch = !opts.expectedAddress || normalizeAddr(recipient) === normalizeAddr(opts.expectedAddress);
  const amountMatch = onChainAmount != null && amountsClose(opts.expectedAmount, onChainAmount);
  const required = REQUIRED_CONFIRMATIONS[opts.network] || 12;
  const verified = confirmed && confirmations >= required && addressMatch && amountMatch;

  return {
    verified,
    status: verified ? "confirmed" : !confirmed ? "pending" : addressMatch && amountMatch ? "pending" : "mismatch",
    network: opts.network,
    symbol: onChainSymbol,
    txHash: opts.txHash,
    confirmations,
    requiredConfirmations: required,
    onChainAmount,
    onChainSymbol,
    recipientAddress: recipient,
    expectedAddress: opts.expectedAddress,
    addressMatch,
    amountMatch,
    blockTime: null,
    explorerUrl: `${opts.explorerBase}/tx/${opts.txHash}`,
    message: verified
      ? `${opts.network} payment confirmed on-chain.`
      : !confirmed
        ? "Transaction found but awaiting confirmations."
        : !addressMatch
          ? "Recipient address does not match platform deposit wallet."
          : "On-chain amount does not match declared deposit amount.",
  };
}

function fail(symbol: string, txHash: string, network: string, message: string, status: BlockchainVerificationResult["status"]): BlockchainVerificationResult {
  return {
    verified: false,
    status,
    network,
    symbol,
    txHash,
    confirmations: 0,
    requiredConfirmations: REQUIRED_CONFIRMATIONS[network] || 1,
    onChainAmount: null,
    onChainSymbol: symbol,
    recipientAddress: null,
    expectedAddress: null,
    addressMatch: false,
    amountMatch: false,
    blockTime: null,
    explorerUrl: null,
    message,
  };
}

export async function verifyBlockchainDeposit(transactionId: number): Promise<BlockchainVerificationResult> {
  const { txn, symbol, network, expectedAddress } = await resolveCryptoDepositContext(transactionId);
  const txHash = txn.txHash!.trim();
  const expectedAmount = Number(txn.amount);

  const [duplicate] = await db.select({ id: transactionsTable.id }).from(transactionsTable)
    .where(and(
      eq(transactionsTable.txHash, txHash),
      eq(transactionsTable.status, "approved"),
      ne(transactionsTable.id, transactionId),
    ))
    .limit(1);
  if (duplicate) {
    return {
      ...fail(symbol, txHash, network, "This transaction hash was already approved for another deposit.", "duplicate"),
      verified: false,
      status: "duplicate",
    };
  }

  const net = network.toUpperCase();
  if (net === "BITCOIN" || net === "BTC" || symbol === "BTC") {
    return verifyBitcoin(txHash, expectedAddress, expectedAmount);
  }
  if (["TRON", "TRC20", "TRX"].includes(net) || symbol === "TRX" || (symbol === "USDT" && net === "TRC20")) {
    return verifyTron(txHash, expectedAddress, expectedAmount, symbol);
  }
  if (["ERC20", "ETH", "ETHEREUM"].includes(net) || symbol === "ETH" || (symbol === "USDT" && net === "ERC20")) {
    return verifyEvmScan({
      txHash,
      expectedAddress,
      expectedAmount,
      symbol,
      network: "ERC20",
      apiUrl: "https://api.etherscan.io/api",
      apiKeyEnv: "ETHERSCAN_API_KEY",
      explorerBase: "https://etherscan.io",
    });
  }
  if (["BEP20", "BSC", "BNB"].includes(net) || symbol === "BNB" || (symbol === "USDT" && net === "BEP20")) {
    return verifyEvmScan({
      txHash,
      expectedAddress,
      expectedAmount,
      symbol,
      network: "BEP20",
      apiUrl: "https://api.bscscan.com/api",
      apiKeyEnv: "BSCSCAN_API_KEY",
      explorerBase: "https://bscscan.com",
    });
  }

  return fail(symbol, txHash, network, `Automatic verification is not configured for ${symbol} on ${network}. Approve manually after checking the explorer.`, "unsupported");
}

export function isCryptoDeposit(txn: { gatewayProvider?: string | null; currency?: string; txHash?: string | null }) {
  if (txn.gatewayProvider === "crypto") return true;
  if (txn.txHash && ["BTC", "ETH", "USDT"].includes(String(txn.currency || "").toUpperCase())) return true;
  return false;
}
