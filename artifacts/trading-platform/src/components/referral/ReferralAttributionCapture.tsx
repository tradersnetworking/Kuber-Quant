import { useEffect } from "react";
import { useLocation } from "wouter";
import { captureReferralFromSearch } from "@/lib/referral-attribution";

/** Persist ?ref= from any public route so signup can attribute the referrer. */
export function ReferralAttributionCapture() {
  const [location] = useLocation();

  useEffect(() => {
    const search = location.includes("?") ? location.slice(location.indexOf("?")) : window.location.search;
    captureReferralFromSearch(search);
  }, [location]);

  return null;
}
