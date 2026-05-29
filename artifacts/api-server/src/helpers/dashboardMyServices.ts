import {
  db,
  investmentsTable,
  copyFollowsTable,
  algoSubscriptionsTable,
  eaSubscriptionsTable,
  userStakesTable,
  mt5AccountsTable,
  mt5RequestsTable,
} from "@workspace/db";
import { eq, and, inArray } from "@workspace/db/orm";
import { getServiceVisibility, type ServiceKey } from "./serviceVisibility";

export type MyServiceItem = {
  key: ServiceKey;
  label: string;
  optedIn: boolean;
  activeCount: number;
  summary: string;
  optInHref: string;
  continueHref: string;
  canOptOut: boolean;
  optOutHint?: string;
};

const SERVICE_META: Record<ServiceKey, { label: string; optInHref: string; continueHref: string }> = {
  investment_plans: { label: "Investment Plans", optInHref: "/plans", continueHref: "/investments" },
  staking: { label: "Staking", optInHref: "/earn/staking", continueHref: "/earn/staking" },
  copy_trading: { label: "Copy Trading", optInHref: "/copy-trading", continueHref: "/copy-trading" },
  account_handling: { label: "MT4/MT5 Account Handling", optInHref: "/mt5-relay", continueHref: "/mt5-relay" },
  link_accounts: { label: "Link MT4/MT5 Account", optInHref: "/mt5-accounts", continueHref: "/mt5-accounts" },
  algo_trading: { label: "Algo Trading", optInHref: "/algo-trading", continueHref: "/algo-trading" },
  ea_strategies: { label: "EA Strategies", optInHref: "/ea-strategies", continueHref: "/ea-strategies" },
};

export async function getDashboardMyServices(userId: number): Promise<MyServiceItem[]> {
  const visibility = await getServiceVisibility();
  const enabledKeys = new Set(visibility.filter(s => s.enabled).map(s => s.key));

  const [
    investments,
    stakes,
    follows,
    algoSubs,
    eaSubs,
    mtAccounts,
    mtRequests,
  ] = await Promise.all([
    db.select().from(investmentsTable).where(eq(investmentsTable.userId, userId)),
    db.select().from(userStakesTable).where(eq(userStakesTable.userId, userId)),
    db.select().from(copyFollowsTable).where(and(eq(copyFollowsTable.userId, userId), eq(copyFollowsTable.active, true))),
    db.select().from(algoSubscriptionsTable).where(and(eq(algoSubscriptionsTable.userId, userId), eq(algoSubscriptionsTable.active, true))),
    db.select().from(eaSubscriptionsTable).where(and(eq(eaSubscriptionsTable.userId, userId), eq(eaSubscriptionsTable.status, "active"))),
    db.select().from(mt5AccountsTable).where(eq(mt5AccountsTable.userId, userId)),
    db.select().from(mt5RequestsTable).where(eq(mt5RequestsTable.userId, userId)),
  ]);

  const activeInvestments = investments.filter(i => i.status === "active");
  const activeStakes = stakes.filter(s => s.status === "active" || s.status === "pending");
  const activeMtRequests = mtRequests.filter(r =>
    r.status === "pending" || r.status === "forwarded" || r.status === "accepted",
  );

  const counts: Record<ServiceKey, { count: number; summary: string; canOptOut: boolean; optOutHint?: string }> = {
    investment_plans: {
      count: activeInvestments.length,
      summary: activeInvestments.length
        ? `${activeInvestments.length} active plan${activeInvestments.length === 1 ? "" : "s"}`
        : "No active investments",
      canOptOut: false,
      optOutHint: "Close or wait for maturity on active investments from the Investments page.",
    },
    staking: {
      count: activeStakes.length,
      summary: activeStakes.length
        ? `${activeStakes.length} active stake${activeStakes.length === 1 ? "" : "s"}`
        : "No active stakes",
      canOptOut: false,
      optOutHint: "Manage or withdraw stakes from Earn & Staking.",
    },
    copy_trading: {
      count: follows.length,
      summary: follows.length
        ? `Following ${follows.length} trader${follows.length === 1 ? "" : "s"}`
        : "Not following any traders",
      canOptOut: follows.length > 0,
    },
    account_handling: {
      count: activeMtRequests.length,
      summary: activeMtRequests.length
        ? `${activeMtRequests.length} active handling request${activeMtRequests.length === 1 ? "" : "s"}`
        : "No active handling requests",
      canOptOut: false,
      optOutHint: "Cancel handling requests from MT4/MT5 Account Handling.",
    },
    link_accounts: {
      count: mtAccounts.length,
      summary: mtAccounts.length
        ? `${mtAccounts.length} linked account${mtAccounts.length === 1 ? "" : "s"}`
        : "No linked accounts",
      canOptOut: false,
      optOutHint: "Remove linked accounts from Link MT4/MT5 Account.",
    },
    algo_trading: {
      count: algoSubs.length,
      summary: algoSubs.length
        ? `${algoSubs.length} active subscription${algoSubs.length === 1 ? "" : "s"}`
        : "No algo subscriptions",
      canOptOut: algoSubs.length > 0,
    },
    ea_strategies: {
      count: eaSubs.length,
      summary: eaSubs.length
        ? `${eaSubs.length} active EA subscription${eaSubs.length === 1 ? "" : "s"}`
        : "No EA subscriptions",
      canOptOut: eaSubs.length > 0,
    },
  };

  return visibility
    .filter(v => enabledKeys.has(v.key))
    .map(v => {
      const meta = SERVICE_META[v.key];
      const c = counts[v.key];
      return {
        key: v.key,
        label: meta.label,
        optedIn: c.count > 0,
        activeCount: c.count,
        summary: c.summary,
        optInHref: meta.optInHref,
        continueHref: meta.continueHref,
        canOptOut: c.canOptOut,
        optOutHint: c.optOutHint,
      };
    });
}

export async function optOutOfService(userId: number, key: ServiceKey): Promise<{ message: string }> {
  switch (key) {
    case "copy_trading": {
      const follows = await db.select().from(copyFollowsTable)
        .where(and(eq(copyFollowsTable.userId, userId), eq(copyFollowsTable.active, true)));
      if (follows.length === 0) return { message: "No active copy trading follows." };
      await db.update(copyFollowsTable)
        .set({ active: false })
        .where(and(eq(copyFollowsTable.userId, userId), eq(copyFollowsTable.active, true)));
      return { message: `Stopped following ${follows.length} trader${follows.length === 1 ? "" : "s"}.` };
    }
    case "algo_trading": {
      const subs = await db.select().from(algoSubscriptionsTable)
        .where(and(eq(algoSubscriptionsTable.userId, userId), eq(algoSubscriptionsTable.active, true)));
      if (subs.length === 0) return { message: "No active algo subscriptions." };
      await db.update(algoSubscriptionsTable)
        .set({ active: false })
        .where(and(eq(algoSubscriptionsTable.userId, userId), eq(algoSubscriptionsTable.active, true)));
      return { message: `Paused ${subs.length} algo subscription${subs.length === 1 ? "" : "s"}.` };
    }
    case "ea_strategies": {
      const subs = await db.select().from(eaSubscriptionsTable)
        .where(and(eq(eaSubscriptionsTable.userId, userId), eq(eaSubscriptionsTable.status, "active")));
      if (subs.length === 0) return { message: "No active EA subscriptions." };
      await db.update(eaSubscriptionsTable)
        .set({ status: "cancelled" })
        .where(and(eq(eaSubscriptionsTable.userId, userId), inArray(eaSubscriptionsTable.id, subs.map(s => s.id))));
      return { message: `Cancelled ${subs.length} EA subscription${subs.length === 1 ? "" : "s"}.` };
    }
    default:
      throw new Error("Opt-out from this service must be done from its management page.");
  }
}
