export const SERVICE_KEYS = [
  "investment_plans",
  "staking",
  "copy_trading",
  "account_handling",
  "link_accounts",
  "algo_trading",
  "ea_strategies",
] as const;

export type ServiceKey = (typeof SERVICE_KEYS)[number];

export type ServiceVisibilityItem = { key: ServiceKey; enabled: boolean };

/** Maps each service to the investor nav hrefs it controls and its landing section anchor. */
export const SERVICE_CATALOG: Record<ServiceKey, { label: string; navHrefs: string[]; landingAnchor?: string }> = {
  investment_plans: { label: "Investment Plans", navHrefs: ["/plans"], landingAnchor: "investments" },
  staking: { label: "Staking", navHrefs: ["/earn/staking"], landingAnchor: "staking" },
  copy_trading: { label: "Copy Trading", navHrefs: ["/copy-trading"], landingAnchor: "copy-trading" },
  account_handling: { label: "MT4/MT5 Account Handling", navHrefs: ["/mt5-relay"] },
  link_accounts: { label: "Link MT4/MT5 Account", navHrefs: ["/mt5-accounts"] },
  algo_trading: { label: "Algo Trading", navHrefs: ["/algo-trading"], landingAnchor: "algo" },
  ea_strategies: { label: "EA Strategies", navHrefs: ["/ea-strategies"], landingAnchor: "ea" },
};

export const DEFAULT_SERVICE_VISIBILITY: ServiceVisibilityItem[] = SERVICE_KEYS.map(key => ({ key, enabled: true }));

/** Set of nav hrefs that are currently hidden, given a visibility list. */
export function hiddenNavHrefs(services: ServiceVisibilityItem[]): Set<string> {
  const hidden = new Set<string>();
  for (const s of services) {
    if (!s.enabled) {
      for (const href of SERVICE_CATALOG[s.key]?.navHrefs ?? []) hidden.add(href);
    }
  }
  return hidden;
}
