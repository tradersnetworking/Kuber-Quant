import { useEffect, useState } from "react";

export type AboutCategory =
  | "registration"
  | "affiliation"
  | "partner"
  | "recognition"
  | "license";

export type AboutCredentialItem = {
  id: number;
  category: AboutCategory;
  title: string;
  subtitle?: string;
  description?: string;
  referenceNumber?: string;
  issuedBy?: string;
  issuedDate?: string;
  expiryDate?: string;
  documentUrl?: string;
  sortOrder: number;
  isActive: boolean;
  categoryLabel?: string;
};

export type CompanyAboutSection = {
  sectionTitle: string;
  intro: string;
  footerDescription: string;
  items: AboutCredentialItem[];
  grouped: Record<AboutCategory, AboutCredentialItem[]>;
  categoryLabels: Record<AboutCategory, string>;
};

const DEFAULT: CompanyAboutSection = {
  sectionTitle: "About Kuber Quant",
  intro:
    "Kuber Quant is an institutional-grade wealth and trading technology platform. We combine algorithmic execution, copy trading, and regulated onboarding to serve investors worldwide.",
  footerDescription:
    "Premium algorithmic trading and wealth management platform. Institutional-grade technology for serious investors worldwide.",
  items: [],
  grouped: {
    registration: [],
    affiliation: [],
    partner: [],
    recognition: [],
    license: [],
  },
  categoryLabels: {
    registration: "Company Registration",
    affiliation: "Affiliations & Memberships",
    partner: "Strategic Partners",
    recognition: "Awards & Recognitions",
    license: "Licences & Regulatory",
  },
};

export function useCompanyAbout() {
  const [data, setData] = useState<CompanyAboutSection>(DEFAULT);

  useEffect(() => {
    let active = true;
    fetch("/api/about")
      .then(async res => {
        if (!res.ok) throw new Error("Failed to load about content");
        return res.json() as Promise<CompanyAboutSection>;
      })
      .then(json => {
        if (active) setData({ ...DEFAULT, ...json });
      })
      .catch(() => {
        if (active) setData(DEFAULT);
      });
    return () => {
      active = false;
    };
  }, []);

  return data;
}
