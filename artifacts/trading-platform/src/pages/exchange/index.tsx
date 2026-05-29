import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { authFetchJson, authFetch, apiPath, getStoredToken } from "@/lib/token-store";
import {
  ArrowDownUp, Loader2, ShieldCheck, ListOrdered, TrendingUp, TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileBtnWrap } from "@/lib/mobile-ui";
import { Link } from "wouter";
import { AppPage } from "@/components/layout/AppPage";
import { APP_FORM_GRID, APP_PAGE_STACK } from "@/lib/ui-system";
import {
  enrichDepositAccount,
  resolveDepositQrSrc,
  resolvePayoutQrSrc,
  type DepositAccount,
} from "@/components/wallet/deposit-account-utils";
import { QrImage } from "@/components/wallet/QrImage";
import { SecureUploadLink } from "@/components/SecureUploadLink";
import { DEPOSIT_BUTTON_CLASS } from "@/lib/wallet-action-styles";
import {
  cryptoDisplayName,
  exchangeChainDisplay,
  formatUnitRate,
} from "@/lib/exchange-display";
import {
  mergeExchangeRatesWithCatalog,
  ourSellingRateInr,
  ourBuyingRateInr,
  isBuyVisibleToUser,
  isSellVisibleToUser,
  type ExchangeRateRow,
} from "@/lib/exchange-catalog";
import { ExchangeRateMarket } from "@/components/exchange/ExchangeRateMarket";
import { CryptoIcon } from "@/components/exchange/CryptoIcon";
import {
  FiatDepositFlowPanel,
  type FiatPaymentOption,
} from "@/components/exchange/FiatDepositFlowPanel";
import { CryptoDepositFlowPanel } from "@/components/exchange/CryptoDepositFlowPanel";
import { ReceiveCryptoWalletPanel, type ReceiveMode } from "@/components/exchange/ReceiveCryptoWalletPanel";
import { ExchangeDepositProofPanel, isExchangeProofReady } from "@/components/exchange/ExchangeDepositProofPanel";
import { FiatPayoutAccountPanel } from "@/components/exchange/FiatPayoutAccountPanel";
import { tabToneClasses } from "@/lib/tab-tones";
import {
  upiInrAmountExceedsLimit,
  upiLimitErrorMessage,
  formatUpiLimitInr,
  UPI_MAX_INR_PER_TRANSACTION,
} from "@/lib/payment-limits";
import { FinanceFieldLabel, financeInputClass } from "@/components/wallet/PaymentMethodField";

type ExchangeRate = ExchangeRateRow;

import type { PaymentAccount as PayoutAccount } from "@/components/wallet/payout-account-types";

type ExchangeOrder = {
  id: number; side: string; cryptoSymbol: string; cryptoNetwork: string;
  cryptoAmount: number; fiatAmount: number; fiatCurrency: string; rateUsd: number;
  status: string; receiveWalletAddress?: string | null;
  proofUrl?: string | null; txHash?: string | null; utrReference?: string | null;
  depositGateway?: DepositAccount | null;
  payoutAccount?: PayoutAccount | null;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  awaiting_deposit: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  deposit_submitted: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  processing: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  cancelled: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

export default function ExchangePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const initialTab = useMemo(() => {
    const tab = new URLSearchParams(location.split("?")[1] || "").get("tab");
    return tab === "sell" ? "sell" : "buy";
  }, [location]);
  const [tab, setTab] = useState(initialTab);
  const [selectedRate, setSelectedRate] = useState<ExchangeRate | null>(null);
  const [dialogMode, setDialogMode] = useState<"buy" | "sell" | null>(null);
  const [fiatCurrency] = useState("INR");
  const [fiatAmount, setFiatAmount] = useState("");
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [quote, setQuote] = useState<any>(null);
  const [gatewayId, setGatewayId] = useState<number | null>(null);
  const [fiatPaymentOption, setFiatPaymentOption] = useState<FiatPaymentOption | "">("");
  const [fiatAccountId, setFiatAccountId] = useState("");
  const [payoutAccountId, setPayoutAccountId] = useState<number | null>(null);
  const [payoutConfirmed, setPayoutConfirmed] = useState(false);
  const [receiveMode, setReceiveMode] = useState<ReceiveMode>("platform");
  const [receiveCryptoAccountId, setReceiveCryptoAccountId] = useState<number | null>(null);
  const [receiveWallet, setReceiveWallet] = useState("");
  const [receiveWalletQrUrl, setReceiveWalletQrUrl] = useState("");
  const [useCustomReceiveWallet, setUseCustomReceiveWallet] = useState(false);
  const [buyReceiveConfirmed, setBuyReceiveConfirmed] = useState(false);
  const [activeOrder, setActiveOrder] = useState<ExchangeOrder | null>(null);
  const [utr, setUtr] = useState("");
  const [txHash, setTxHash] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const quoteRequestId = useRef(0);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const kycOk = user?.kycStatus === "verified";

  const { data: apiRates = [], isLoading: ratesLoading } = useQuery({
    queryKey: ["/api/exchange/rates", fiatCurrency],
    queryFn: () => authFetchJson<ExchangeRate[]>(`/exchange/rates?fiat=${fiatCurrency}`),
  });

  const allRates = useMemo(() => mergeExchangeRatesWithCatalog(apiRates), [apiRates]);
  const buyRates = useMemo(() => allRates.filter(isBuyVisibleToUser), [allRates]);
  const sellRates = useMemo(() => allRates.filter(isSellVisibleToUser), [allRates]);

  const { data: depositAccounts } = useQuery({
    queryKey: ["/api/payments/deposit-accounts"],
    queryFn: () => authFetchJson<{ upi: DepositAccount[]; bank: DepositAccount[]; crypto: DepositAccount[]; online: DepositAccount[] }>("/payments/deposit-accounts"),
  });

  const { data: payoutAccountsRaw = [], refetch: refetchAccounts } = useQuery({
    queryKey: ["/api/wallet/payment-accounts"],
    queryFn: () => authFetchJson<Omit<PayoutAccount, "isDefault">[]>("/wallet/payment-accounts"),
  });
  const payoutAccounts: PayoutAccount[] = useMemo(
    () => payoutAccountsRaw.map(a => ({ ...a, isDefault: false })),
    [payoutAccountsRaw],
  );

  const { data: orders = [], refetch: refetchOrders } = useQuery({
    queryKey: ["/api/exchange/orders"],
    queryFn: () => authFetchJson<ExchangeOrder[]>("/exchange/orders"),
  });

  const bankUpiAccounts = payoutAccounts.filter(a => ["upi", "bank"].includes(a.accountType));

  useEffect(() => {
    if (dialogMode !== "sell" || payoutAccountId || !bankUpiAccounts.length) return;
    const first = bankUpiAccounts.find(a => a.accountType === "upi") ?? bankUpiAccounts[0];
    setPayoutAccountId(first?.id ?? null);
  }, [dialogMode, bankUpiAccounts, payoutAccountId]);

  const allFiatAccounts = useMemo(() => [
    ...(depositAccounts?.upi || []),
    ...(depositAccounts?.bank || []),
    ...(depositAccounts?.online || []),
  ], [depositAccounts]);

  useEffect(() => {
    if (dialogMode === "buy" && fiatAccountId) {
      setGatewayId(Number(fiatAccountId));
    }
  }, [fiatAccountId, dialogMode]);

  const openTrade = (rate: ExchangeRate, mode: "buy" | "sell") => {
    setSelectedRate(rate);
    setDialogMode(mode);
    setFiatAmount("");
    setCryptoAmount("");
    setQuote(null);
    setQuoteError(null);
    setGatewayId(null);
    setFiatPaymentOption("");
    setFiatAccountId("");
    setPayoutAccountId(bankUpiAccounts.find(a => a.accountType === "upi")?.id ?? bankUpiAccounts[0]?.id ?? null);
    setPayoutConfirmed(false);
    setReceiveMode("platform");
    setReceiveCryptoAccountId(null);
    setReceiveWallet("");
    setReceiveWalletQrUrl("");
    setUseCustomReceiveWallet(false);
    setBuyReceiveConfirmed(false);
    setUtr("");
    setTxHash("");
    setProofFile(null);
  };

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedRate(null);
  };

  const fetchQuote = useCallback(async () => {
    if (!selectedRate || !dialogMode) return;

    const isBuy = dialogMode === "buy";
    const inputAmount = isBuy ? fiatAmount : cryptoAmount;
    if (!inputAmount || Number(inputAmount) <= 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }

    const activeRate = isBuy ? ourSellingRateInr(selectedRate) : ourBuyingRateInr(selectedRate);
    if (activeRate <= 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }

    const requestId = ++quoteRequestId.current;
    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const q = await authFetchJson<any>("/exchange/quote", {
        method: "POST",
        body: JSON.stringify({
          side: dialogMode,
          symbol: selectedRate.symbol,
          network: selectedRate.network,
          fiatCurrency,
          fiatAmount: isBuy ? Number(inputAmount) : undefined,
          cryptoAmount: isBuy ? undefined : Number(inputAmount),
        }),
      });
      if (requestId !== quoteRequestId.current) return;
      setQuote(q);
    } catch (e: any) {
      if (requestId !== quoteRequestId.current) return;
      setQuote(null);
      setQuoteError(e.message || "Could not calculate quote");
    } finally {
      if (requestId === quoteRequestId.current) {
        setQuoteLoading(false);
      }
    }
  }, [selectedRate, dialogMode, fiatAmount, cryptoAmount, fiatCurrency]);

  useEffect(() => {
    if (!selectedRate || !dialogMode || !kycOk) {
      setQuote(null);
      setQuoteError(null);
      return;
    }

    const inputAmount = dialogMode === "buy" ? fiatAmount : cryptoAmount;
    if (!inputAmount || Number(inputAmount) <= 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }

    const timer = setTimeout(() => {
      void fetchQuote();
    }, 400);

    return () => clearTimeout(timer);
  }, [selectedRate, dialogMode, fiatAmount, cryptoAmount, kycOk, fetchQuote]);

  const selectedFiatAccount = allFiatAccounts.find(a => String(a.id) === fiatAccountId);

  const buyReceiveAddress = useMemo(() => {
    if (receiveMode === "platform") return "";
    if (useCustomReceiveWallet || !receiveCryptoAccountId) return receiveWallet.trim();
    const acc = payoutAccounts.find(a => a.id === receiveCryptoAccountId);
    return acc?.walletAddress?.trim() || receiveWallet.trim();
  }, [receiveMode, useCustomReceiveWallet, receiveCryptoAccountId, receiveWallet, payoutAccounts]);

  const buyReceiveReady = receiveMode === "platform" || buyReceiveAddress.length > 0;
  const buyUpiOverLimit = dialogMode === "buy"
    && fiatPaymentOption === "upi"
    && fiatAmount.trim() !== ""
    && upiInrAmountExceedsLimit(Number(fiatAmount));
  const buyUpiQuoteOverLimit = dialogMode === "buy"
    && fiatPaymentOption === "upi"
    && quote
    && upiInrAmountExceedsLimit(Number(quote.fiatAmount));
  const proofReady = dialogMode ? isExchangeProofReady(dialogMode, utr, txHash, proofFile) : false;

  const submitOrderDeposit = async (orderId: number) => {
    const fd = new FormData();
    if (proofFile) fd.append("proof", proofFile);
    if (utr.trim()) fd.append("utrReference", utr.trim());
    if (txHash.trim()) fd.append("txHash", txHash.trim());
    const res = await authFetch(apiPath(`/exchange/orders/${orderId}/deposit`), {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Proof submit failed");
    return data as ExchangeOrder;
  };

  const createOrder = async () => {
    if (!selectedRate || !dialogMode || !quote) return;
    if (dialogMode === "buy" && fiatPaymentOption === "upi") {
      const payInr = Number(fiatAmount) || Number(quote.fiatAmount);
      if (upiInrAmountExceedsLimit(payInr)) {
        toast({ title: "UPI limit exceeded", description: upiLimitErrorMessage(), variant: "destructive" });
        return;
      }
    }
    if (dialogMode === "buy" && !gatewayId) {
      toast({ title: "Select deposit method", description: "Choose UPI, bank, or payment gateway above.", variant: "destructive" });
      return;
    }
    if (!proofReady) {
      toast({
        title: "Proof required",
        description: dialogMode === "buy"
          ? "Upload payment proof or enter UTR/reference."
          : "Enter the blockchain transaction hash for your crypto transfer.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const order = await authFetchJson<ExchangeOrder>("/exchange/orders", {
        method: "POST",
        body: JSON.stringify({
          side: dialogMode,
          symbol: selectedRate.symbol,
          network: selectedRate.network,
          fiatCurrency,
          fiatAmount: quote.fiatAmount,
          cryptoAmount: quote.cryptoAmount,
          paymentGatewayId: dialogMode === "buy" ? gatewayId : undefined,
          paymentAccountId: dialogMode === "sell" ? payoutAccountId : undefined,
          receiveWalletAddress: dialogMode === "buy" && receiveMode === "personal" && buyReceiveAddress
            ? buyReceiveAddress
            : undefined,
          depositMethod: dialogMode === "buy" ? selectedFiatAccount?.name : undefined,
        }),
      });
      const withProof = await submitOrderDeposit(order.id);
      setActiveOrder(withProof);
      toast({
        title: "Order submitted",
        description: `Order #${order.id} — deposit proof received. Admin will verify and complete your order.`,
      });
      refetchOrders();
      setTab("orders");
      closeDialog();
      setProofFile(null);
      setUtr("");
      setTxHash("");
    } catch (e: any) {
      toast({ title: "Order failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const submitDeposit = async (orderId: number) => {
    if (!isExchangeProofReady(
      activeOrder?.side === "sell" ? "sell" : "buy",
      utr,
      txHash,
      proofFile,
    )) {
      toast({
        title: "Proof required",
        description: activeOrder?.side === "sell"
          ? "Enter transaction hash before submitting."
          : "Upload proof or enter UTR/reference.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const data = await submitOrderDeposit(orderId);
      setActiveOrder(data);
      toast({ title: "Deposit submitted", description: "Admin will verify and complete your order." });
      refetchOrders();
      setProofFile(null);
      setUtr("");
      setTxHash("");
    } catch (e: any) {
      toast({ title: "Submit failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const renderOrderForm = () => {
    if (!selectedRate || !dialogMode) return null;
    const activeRate = dialogMode === "buy"
      ? ourSellingRateInr(selectedRate)
      : ourBuyingRateInr(selectedRate);
    const rateLabel = dialogMode === "buy"
      ? formatUnitRate(selectedRate, activeRate, "INR")
      : formatUnitRate(selectedRate, activeRate, "INR");

    return (
    <div className="space-y-4 pt-4 border-t border-border dark:border-white/10">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted dark:bg-white/10 text-xs font-bold">2</span>
        <p className="text-sm font-semibold">Place your order</p>
      </div>

      {!kycOk && (
        <div className="flex items-start gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm">
          <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-700 dark:text-amber-300">KYC verification required</p>
            <p className="text-muted-foreground text-xs mt-1">Complete KYC to calculate quotes and place orders.</p>
            <Link href="/kyc">
              <Button size="sm" variant="outline" className="mt-2 border-amber-500/30">Go to KYC</Button>
            </Link>
          </div>
        </div>
      )}

      {activeRate <= 0 && (
        <div className="p-3 rounded-xl border border-amber-500/25 bg-amber-500/5 text-sm text-amber-300/90">
          Exchange rate is not published yet for this asset. Deposit instructions above are still available; order placement opens once admin sets the rate.
        </div>
      )}

      <div className={APP_FORM_GRID}>
        <div className="space-y-2">
          <FinanceFieldLabel tone="rate">
            Our {dialogMode === "buy" ? "selling" : "buying"} rate
          </FinanceFieldLabel>
          <Input
            readOnly
            value={activeRate > 0 ? rateLabel : "Rate not set"}
            className={financeInputClass("h-10 text-xs")}
          />
        </div>
        <div className="space-y-2">
          <FinanceFieldLabel tone="amount">
            {dialogMode === "buy" ? "Amount to pay (INR)" : `Crypto amount (${selectedRate.symbol})`}
          </FinanceFieldLabel>
          <div className="relative">
            {dialogMode === "buy" && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
            )}
            <Input
              type="number"
              step={dialogMode === "buy" ? "any" : "0.00000001"}
              min="0"
              max={dialogMode === "buy" && fiatPaymentOption === "upi" ? UPI_MAX_INR_PER_TRANSACTION : undefined}
              value={dialogMode === "buy" ? fiatAmount : cryptoAmount}
              onChange={e => {
                if (dialogMode === "buy") {
                  setFiatAmount(e.target.value);
                } else {
                  setCryptoAmount(e.target.value);
                }
              }}
              className={cn(
                financeInputClass("h-10"),
                dialogMode === "buy" && "pl-7",
                buyUpiOverLimit && "border-red-500/50",
              )}
              placeholder={dialogMode === "buy" ? "0.00" : "0.00000000"}
            />
          </div>
          {dialogMode === "buy" && fiatPaymentOption === "upi" && (
            <p className={cn(
              "text-[11px]",
              buyUpiOverLimit || buyUpiQuoteOverLimit ? "text-red-400" : "text-sky-600 dark:text-sky-400/90",
            )}>
              UPI max ₹{formatUpiLimitInr()} per transaction
            </p>
          )}
        </div>
      </div>

      {(quoteLoading || quote || quoteError) && (
        <div className={cn(
          "p-4 rounded-xl border text-sm space-y-1",
          quoteError
            ? "border-red-500/25 bg-red-500/5"
            : "border-emerald-500/25 bg-emerald-500/5",
        )}>
          {quoteLoading && !quote && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Calculating quote…
            </p>
          )}
          {quoteError && (
            <p className="text-red-600 dark:text-red-300">{quoteError}</p>
          )}
          {quote && (
            <>
              <p>{dialogMode === "buy" ? "You pay" : "You receive"}: <strong className="text-emerald-700 dark:text-emerald-300">{quote.fiatAmount} {quote.fiatCurrency}</strong></p>
              <p>{dialogMode === "buy" ? "You receive" : "You send"}: <strong className="text-emerald-700 dark:text-emerald-300">{quote.cryptoAmount} {quote.symbol}</strong></p>
            </>
          )}
        </div>
      )}

      {dialogMode === "buy" && selectedRate && (
        <ReceiveCryptoWalletPanel
          symbol={selectedRate.symbol}
          network={selectedRate.network}
          cryptoAccounts={payoutAccounts}
          receiveMode={receiveMode}
          onReceiveModeChange={setReceiveMode}
          selectedAccountId={receiveCryptoAccountId}
          onSelectAccount={setReceiveCryptoAccountId}
          walletAddress={receiveWallet}
          onWalletAddressChange={setReceiveWallet}
          walletQrUrl={receiveWalletQrUrl}
          onWalletQrUrlChange={setReceiveWalletQrUrl}
          useCustomWallet={useCustomReceiveWallet}
          onUseCustomWalletChange={setUseCustomReceiveWallet}
          receiveConfirmed={buyReceiveConfirmed}
          onReceiveConfirmedChange={setBuyReceiveConfirmed}
          submitting={submitting}
        />
      )}

      {dialogMode === "sell" && (
        <FiatPayoutAccountPanel
          accounts={payoutAccounts}
          selectedId={payoutAccountId}
          onSelect={setPayoutAccountId}
          onAccountsUpdated={refetchAccounts}
          payoutConfirmed={payoutConfirmed}
          onPayoutConfirmedChange={setPayoutConfirmed}
          submitting={submitting}
        />
      )}

      <ExchangeDepositProofPanel
        mode={dialogMode}
        utr={utr}
        onUtrChange={setUtr}
        txHash={txHash}
        onTxHashChange={setTxHash}
        proofFile={proofFile}
        onProofFileChange={setProofFile}
        disabled={submitting}
      />

      <Button
        type="button"
        size="wrap"
        className={cn("w-full bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-lg shadow-amber-900/20", mobileBtnWrap)}
        disabled={
          submitting || !kycOk || !quote || quoteLoading || activeRate <= 0
          || (dialogMode === "buy" && !gatewayId)
          || (dialogMode === "buy" && !buyReceiveReady)
          || (dialogMode === "buy" && !buyReceiveConfirmed)
          || (dialogMode === "sell" && !payoutAccountId)
          || (dialogMode === "sell" && !payoutConfirmed)
          || (dialogMode === "buy" && (buyUpiOverLimit || buyUpiQuoteOverLimit))
          || !proofReady
        }
        onClick={createOrder}
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : null}
        <span>Confirm {dialogMode === "buy" ? "buy" : "sell"} & submit proof</span>
      </Button>
    </div>
    );
  };

  const renderOrderDeposit = (order: ExchangeOrder) => {
    const gw = order.depositGateway ? enrichDepositAccount(order.depositGateway) : null;
    return (
      <div className="mt-4 space-y-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
        <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Complete deposit — order #{order.id}</p>
        {order.side === "buy" && gw && (
          <div className="space-y-3 text-sm">
            {gw.upiId && (
              <div className="flex flex-col items-center gap-2">
                <QrImage
                  src={resolveDepositQrSrc({
                    qrCodeUrl: gw.qrCodeUrl,
                    upiId: gw.upiId,
                    payeeName: gw.name,
                    amount: order.fiatAmount,
                  })}
                  fallbackSrc={resolveDepositQrSrc({ upiId: gw.upiId, payeeName: gw.name, amount: order.fiatAmount })}
                  alt="UPI QR"
                  className="w-40 h-40 rounded-lg border border-border dark:border-white/10"
                />
                <code className="text-xs bg-muted dark:bg-black/30 px-2 py-1 rounded">{gw.upiId}</code>
              </div>
            )}
            {(gw.accountNumber || gw.bankName) && (
              <div className="text-muted-foreground text-xs space-y-1">
                {gw.bankName && <p>Bank: {gw.bankName}</p>}
                {gw.accountNumber && <p>A/C: {gw.accountNumber}</p>}
                {gw.ifscCode && <p>IFSC: {gw.ifscCode}</p>}
              </div>
            )}
            <div className="space-y-2">
              <FinanceFieldLabel tone="proof">UTR / Reference</FinanceFieldLabel>
              <Input value={utr} onChange={e => setUtr(e.target.value)} className={financeInputClass()} />
              <FinanceFieldLabel tone="proof">Payment proof</FinanceFieldLabel>
              <Input type="file" accept="image/*,.pdf" onChange={e => setProofFile(e.target.files?.[0] || null)} className={financeInputClass()} />
            </div>
          </div>
        )}
        {order.side === "sell" && order.payoutAccount && (
          <div className="rounded-lg border border-border dark:border-white/10 bg-muted/80 dark:bg-black/20 p-3 text-xs space-y-2">
            <p className="font-semibold text-amber-700 dark:text-amber-300">INR payout to your account</p>
            {order.payoutAccount.accountType === "upi" && order.payoutAccount.upiId && (
              <>
                {(order.payoutAccount.upiQrUrl || order.payoutAccount.upiId) && (
                  <QrImage
                    src={resolvePayoutQrSrc({
                      accountType: "upi",
                      label: order.payoutAccount.label || "UPI",
                      upiId: order.payoutAccount.upiId,
                      upiQrUrl: order.payoutAccount.upiQrUrl,
                    })}
                    fallbackSrc={order.payoutAccount.upiId
                      ? resolvePayoutQrSrc({
                        accountType: "upi",
                        label: order.payoutAccount.label || "UPI",
                        upiId: order.payoutAccount.upiId,
                      })
                      : undefined}
                    alt="Payout UPI QR"
                    className="mx-auto max-h-36 rounded border border-border dark:border-white/10 bg-white p-1"
                  />
                )}
                <p>UPI: {order.payoutAccount.upiId}</p>
              </>
            )}
            {order.payoutAccount.accountType === "bank" && (
              <>
                {order.payoutAccount.accountHolderName && <p>Holder: {order.payoutAccount.accountHolderName}</p>}
                {order.payoutAccount.bankName && <p>Bank: {order.payoutAccount.bankName}</p>}
                {order.payoutAccount.accountNumber && <p>A/C: {order.payoutAccount.accountNumber}</p>}
                {order.payoutAccount.ifscCode && <p>IFSC: {order.payoutAccount.ifscCode}</p>}
              </>
            )}
          </div>
        )}
        {order.side === "sell" && gw?.walletAddress && (
          <div className="space-y-3 text-sm">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Send crypto to our wallet</p>
            <div className="flex flex-col items-center gap-2">
              <QrImage
                src={resolveDepositQrSrc({ qrCodeUrl: gw.qrCodeUrl, walletAddress: gw.walletAddress })}
                fallbackSrc={resolveDepositQrSrc({ walletAddress: gw.walletAddress })}
                alt="Deposit QR"
                className="w-40 h-40 rounded-lg border border-border dark:border-white/10 bg-white p-1"
              />
              <code className="text-xs break-all bg-muted dark:bg-black/30 px-2 py-1 rounded">{gw.walletAddress}</code>
            </div>
            <div className="space-y-2">
              <FinanceFieldLabel tone="proof">Transaction hash</FinanceFieldLabel>
              <Input value={txHash} onChange={e => setTxHash(e.target.value)} className={financeInputClass("font-mono text-xs")} />
            </div>
          </div>
        )}
        {order.status === "awaiting_deposit" && (
          <Button size="wrap" className={cn("w-full", DEPOSIT_BUTTON_CLASS, mobileBtnWrap)} disabled={submitting} onClick={() => submitDeposit(order.id)}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : null}
            <span>Submit deposit proof</span>
          </Button>
        )}
        {order.proofUrl && (
          <SecureUploadLink url={order.proofUrl} className="text-xs text-amber-600 dark:text-amber-400 underline">View proof</SecureUploadLink>
        )}
      </div>
    );
  };

  return (
    <AppPage stackClassName={cn(APP_PAGE_STACK, "max-w-5xl mx-auto")} className="px-1 sm:px-0">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border dark:border-white/10 bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0a1628] p-5 sm:p-8">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 ring-1 ring-amber-500/30">
              <ArrowDownUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </span>
            {t("exchange.title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-lg">
            {t("exchange.subtitleLong")}
          </p>
        </div>
      </div>

      {!kycOk && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
          <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-700 dark:text-amber-300">{t("exchange.kycRequiredTitle")}</p>
            <p className="text-muted-foreground mt-1">{t("exchange.kycRequiredDesc")}</p>
            <Link href="/kyc">
              <Button size="sm" variant="outline" className="mt-2 border-amber-500/30">{t("exchange.goToKyc")}</Button>
            </Link>
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto grid grid-cols-3 gap-1 p-1 min-w-0">
          <TabsTrigger value="buy" className={cn("gap-1 py-2 px-1.5 text-[10px] sm:text-sm min-w-0", tabToneClasses("green"))}>
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="truncate">{t("exchange.buyCrypto")}</span>
          </TabsTrigger>
          <TabsTrigger value="sell" className={cn("gap-1 py-2 px-1.5 text-[10px] sm:text-sm min-w-0", tabToneClasses("orange"))}>
            <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="truncate">{t("exchange.sellCrypto")}</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className={cn("gap-1 py-2 px-1.5 text-[10px] sm:text-sm min-w-0", tabToneClasses("blue"))}>
            <ListOrdered className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="truncate">{t("exchange.orders")}</span>
            {orders.filter(o => o.status === "awaiting_deposit").length > 0 && (
              <Badge className="ml-1 h-5 min-w-5 px-1 bg-amber-500 text-black text-[10px]">
                {orders.filter(o => o.status === "awaiting_deposit").length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buy" className="mt-4">
          <Card className="bg-muted/50 dark:bg-white/[0.03] border-border dark:border-white/10 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                {t("exchange.buyCrypto")}
              </CardTitle>
              <CardDescription>
                {ratesLoading ? "Loading…" : `${buyRates.length} assets available · pay with UPI, bank, or gateway`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExchangeRateMarket
                mode="buy"
                rates={buyRates}
                loading={ratesLoading}
                onTrade={openTrade}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sell" className="mt-4">
          <Card className="bg-muted/50 dark:bg-white/[0.03] border-border dark:border-white/10 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                {t("exchange.sellCrypto")}
              </CardTitle>
              <CardDescription>
                {ratesLoading ? "Loading…" : `${sellRates.length} assets available · deposit crypto, receive INR`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExchangeRateMarket
                mode="sell"
                rates={sellRates}
                loading={ratesLoading}
                onTrade={openTrade}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="mt-4 space-y-3">
          {orders.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-border dark:border-white/10">
              <ListOrdered className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No exchange orders yet.</p>
            </div>
          ) : orders.map(o => (
            <Card key={o.id} className="bg-muted/50 dark:bg-white/[0.03] border-border dark:border-white/10">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <CryptoIcon symbol={o.cryptoSymbol} />
                    <div>
                      <p className="font-medium">#{o.id} · {o.side.toUpperCase()} {o.cryptoAmount} {o.cryptoSymbol}</p>
                      <p className="text-xs text-muted-foreground">{o.fiatAmount} {o.fiatCurrency} · {new Date(o.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={STATUS_COLORS[o.status] || ""}>{o.status.replace(/_/g, " ")}</Badge>
                </div>
                {(o.status === "awaiting_deposit" || o.status === "deposit_submitted") && (
                  <Button size="sm" variant="ghost" className="mt-2 text-amber-600 dark:text-amber-400" onClick={async () => {
                    const full = await authFetchJson<ExchangeOrder>(`/exchange/orders/${o.id}`);
                    setActiveOrder(full);
                  }}>Deposit instructions</Button>
                )}
                {activeOrder?.id === o.id && renderOrderDeposit(activeOrder)}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogMode !== null} onOpenChange={open => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-xl sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-background border-border dark:border-white/10 p-0 gap-0">
          {selectedRate && dialogMode && (
            <>
              <div className={cn(
                "px-5 sm:px-6 pt-6 pb-4 border-b border-border dark:border-white/10",
                dialogMode === "buy"
                  ? "bg-gradient-to-r from-emerald-500/10 to-transparent"
                  : "bg-gradient-to-r from-amber-500/10 to-transparent",
              )}>
                <DialogHeader className="text-left space-y-3">
                  <div className="flex items-center gap-3">
                    <CryptoIcon symbol={selectedRate.symbol} size="lg" />
                    <div>
                      <DialogTitle className="text-lg">
                        {dialogMode === "buy" ? "Buy" : "Sell"} {cryptoDisplayName(selectedRate)}
                      </DialogTitle>
                      <DialogDescription className="text-xs mt-0.5">
                        {exchangeChainDisplay(selectedRate.symbol, selectedRate.network)} ·{" "}
                        {dialogMode === "buy"
                          ? formatUnitRate(selectedRate, ourSellingRateInr(selectedRate), "INR")
                          : formatUnitRate(selectedRate, ourBuyingRateInr(selectedRate), "INR")}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <div className="px-5 sm:px-6 py-5 space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted dark:bg-white/10 text-xs font-bold">1</span>
                    <p className="text-sm font-semibold">
                      {dialogMode === "buy" ? "Deposit fiat" : "Deposit crypto"}
                    </p>
                  </div>
                  {dialogMode === "buy" ? (
                    <FiatDepositFlowPanel
                      depositAccounts={depositAccounts}
                      paymentOption={fiatPaymentOption}
                      onPaymentOptionChange={setFiatPaymentOption}
                      accountId={fiatAccountId}
                      onAccountIdChange={setFiatAccountId}
                      amountHint={fiatAmount}
                    />
                  ) : (
                    <CryptoDepositFlowPanel
                      symbol={selectedRate.symbol}
                      network={selectedRate.network}
                      label={selectedRate.label}
                      cryptoAccounts={depositAccounts?.crypto}
                      exchangeWallet={{
                        walletAddress: selectedRate.walletAddress,
                        gatewayId: selectedRate.gatewayId,
                      }}
                    />
                  )}
                </div>
                {renderOrderForm()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppPage>
  );
}
