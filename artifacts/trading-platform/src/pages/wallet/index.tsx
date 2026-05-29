import { Redirect, useSearch } from "wouter";

/** Legacy /wallet URLs redirect to unified Money hub or account payout tab. */
export default function WalletPage() {
  const search = useSearch();
  const raw = search ? (search.startsWith("?") ? search.slice(1) : search) : "";
  const params = new URLSearchParams(raw);
  const tab = params.get("tab");

  if (tab === "accounts") {
    const payoutQs = new URLSearchParams();
    payoutQs.set("tab", "payout");
    const type = params.get("type");
    if (type) payoutQs.set("type", type);
    return <Redirect to={`/account?${payoutQs.toString()}`} />;
  }

  const qs = raw ? `?${raw}` : "";
  return <Redirect to={`/money${qs}`} />;
}
