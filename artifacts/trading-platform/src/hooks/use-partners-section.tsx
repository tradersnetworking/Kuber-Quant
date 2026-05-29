import { useEffect, useState } from "react";
import { publicFetchJson } from "@/lib/api-fetch";

export type InstitutionalPartner = {
  id: number;
  name: string;
  logoUrl?: string;
  websiteUrl?: string;
  sortOrder: number;
  isActive: boolean;
};

export type PartnersSection = {
  title: string;
  partners: InstitutionalPartner[];
};

const DEFAULT_PARTNERS: PartnersSection = {
  title: "Institutional Partners & Brokers",
  partners: [
    { id: 1, name: "BINANCE", sortOrder: 1, isActive: true },
    { id: 2, name: "COINBASE", sortOrder: 2, isActive: true },
    { id: 3, name: "METATRADER", sortOrder: 3, isActive: true },
    { id: 4, name: "KRAKEN", sortOrder: 4, isActive: true },
    { id: 5, name: "REVOLUT", sortOrder: 5, isActive: true },
  ],
};

export function usePartnersSection() {
  const [data, setData] = useState<PartnersSection>(DEFAULT_PARTNERS);

  useEffect(() => {
    let active = true;
    publicFetchJson<PartnersSection>("/partners")
      .then((json) => {
        if (active) setData(json);
      })
      .catch(() => {
        if (active) setData(DEFAULT_PARTNERS);
      });
    return () => {
      active = false;
    };
  }, []);

  return data;
}
