import { db, usersTable, mt5AccountsTable, mt5RequestsTable, siteSettingsTable } from "@workspace/db";
import { desc, eq } from "@workspace/db/orm";
import { mapAccount } from "../routes/mt5";
import { getLatestMtAccountForUser, getMtTradingPassword } from "./mtAccountLink";

export async function listEnrichedMtAccounts() {
  const [accounts, users, requests] = await Promise.all([
    db.select().from(mt5AccountsTable).orderBy(desc(mt5AccountsTable.createdAt)),
    db.select({ id: usersTable.id, fullName: usersTable.fullName, email: usersTable.email, role: usersTable.role }).from(usersTable),
    db.select().from(mt5RequestsTable).orderBy(desc(mt5RequestsTable.createdAt)),
  ]);

  const userMap = new Map(users.map(u => [u.id, u]));
  const requestsByAccountId = new Map<number, typeof requests>();
  const requestsByUserId = new Map<number, typeof requests>();

  for (const r of requests) {
    if (r.mt5AccountId) {
      const list = requestsByAccountId.get(r.mt5AccountId) || [];
      list.push(r);
      requestsByAccountId.set(r.mt5AccountId, list);
    }
    const userList = requestsByUserId.get(r.userId) || [];
    userList.push(r);
    requestsByUserId.set(r.userId, userList);
  }

  return accounts.map(a => {
    const u = userMap.get(a.userId);
    const linked = [
      ...(requestsByAccountId.get(a.id) || []),
      ...(requestsByUserId.get(a.userId) || []).filter(r => r.mt5AccountId !== a.id),
    ];
    const uniqueLinked = Array.from(new Map(linked.map(r => [r.id, r])).values());

    return {
      ...mapAccount(a),
      userName: u?.fullName || `User #${a.userId}`,
      userEmail: u?.email || "",
      userRole: u?.role || "user",
      hasCredentials: !!a.passwordEnc,
      profitSharingRequests: uniqueLinked.map(r => ({
        id: r.id,
        type: r.type,
        status: r.status,
        profitSharingPercent: r.profitSharingPercent,
        createdAt: r.createdAt.toISOString(),
      })),
      pendingRequestCount: uniqueLinked.filter(r => r.status === "pending" || r.status === "forwarded").length,
    };
  });
}

export async function listEnrichedMt5Requests() {
  const [requests, users, accounts] = await Promise.all([
    db.select().from(mt5RequestsTable).orderBy(desc(mt5RequestsTable.createdAt)),
    db.select({ id: usersTable.id, fullName: usersTable.fullName, email: usersTable.email }).from(usersTable),
    db.select().from(mt5AccountsTable),
  ]);

  const userMap = new Map(users.map(u => [u.id, u]));
  const accountMap = new Map(accounts.map(a => [a.id, a]));

  return requests.map(r => {
    const u = userMap.get(r.userId);
    const acc = r.mt5AccountId
      ? accountMap.get(r.mt5AccountId)
      : accounts.find(a => a.userId === r.userId);

    return {
      id: r.id,
      userId: r.userId,
      mt5AccountId: r.mt5AccountId,
      type: r.type,
      profitSharingPercent: r.profitSharingPercent,
      details: r.details,
      status: r.status,
      externalResponse: r.externalResponse,
      forwardedAt: r.forwardedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      userName: u?.fullName || `User #${r.userId}`,
      userEmail: u?.email || "",
      accountNumber: acc?.accountNumber || null,
      broker: acc?.broker || null,
      serverName: acc?.serverName || null,
      platform: acc?.platform || null,
      accountStatus: acc?.status || null,
      hasCredentials: acc ? !!acc.passwordEnc : false,
    };
  });
}

export async function getMtAccountForRequest(request: { userId: number; mt5AccountId: number | null }) {
  if (request.mt5AccountId) {
    const [account] = await db.select().from(mt5AccountsTable)
      .where(eq(mt5AccountsTable.id, request.mt5AccountId))
      .limit(1);
    if (account) return account;
  }
  return getLatestMtAccountForUser(request.userId);
}

export async function forwardMt5Request(id: number) {
  const [request] = await db.select().from(mt5RequestsTable).where(eq(mt5RequestsTable.id, id)).limit(1);
  if (!request) return { ok: false as const, error: "Not found" };

  const [setting] = await db.select().from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, "mt5_external_endpoint"))
    .limit(1);
  const externalUrl = setting?.value;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, request.userId)).limit(1);
  const mtAccount = await getMtAccountForRequest(request);
  const slaveLogin = mtAccount?.accountNumber || String(request.mt5AccountId || request.userId);

  if (request.type === "copy_trading") {
    try {
      const { registerSlave } = await import("./tradeCopier");
      const platform = (mtAccount as any)?.platform || request.details?.match(/Platform:\s*(MT[45])/i)?.[1]?.toLowerCase() || "mt5";
      await registerSlave({
        slaveLogin,
        slaveName: user?.fullName || `User #${request.userId}`,
        profitSharingPercent: request.profitSharingPercent ?? 20,
        platform,
        details: request.details || "",
      });
    } catch (err) {
      console.warn("Trade Copier API unavailable:", (err as Error).message);
    }
  }

  if (externalUrl) {
    try {
      const payload = {
        requestId: request.id,
        type: request.type,
        userId: request.userId,
        userEmail: user?.email,
        userName: user?.fullName,
        mt5AccountId: mtAccount?.id ?? request.mt5AccountId,
        accountNumber: mtAccount?.accountNumber || null,
        broker: mtAccount?.broker || null,
        serverName: mtAccount?.serverName || null,
        platform: (mtAccount as any)?.platform || null,
        hasTradingPassword: mtAccount ? !!getMtTradingPassword(mtAccount as any) : false,
        profitSharingPercent: request.profitSharingPercent,
        details: request.details,
        timestamp: new Date().toISOString(),
      };
      await fetch(externalUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch { /* External endpoint unreachable — still mark as forwarded */ }
  }

  try {
    const { dumpTradesToVps } = await import("./vpsBridge");
    await dumpTradesToVps({
      event: "mt5_request_forwarded",
      requestId: request.id,
      type: request.type,
      userId: request.userId,
      userEmail: user?.email,
      accountNumber: mtAccount?.accountNumber || null,
      profitSharingPercent: request.profitSharingPercent,
      details: request.details,
      timestamp: new Date().toISOString(),
    });
  } catch { /* VPS dump optional */ }

  await db.update(mt5RequestsTable)
    .set({ status: "forwarded", forwardedAt: new Date() })
    .where(eq(mt5RequestsTable.id, id));

  if (mtAccount && mtAccount.status === "pending_review") {
    await db.update(mt5AccountsTable)
      .set({ status: "active" })
      .where(eq(mt5AccountsTable.id, mtAccount.id));
  }

  return { ok: true as const };
}

export async function updateMt5RequestStatus(id: number, status: string, externalResponse?: string | null) {
  await db.update(mt5RequestsTable)
    .set({ status: status as any, externalResponse: externalResponse || null })
    .where(eq(mt5RequestsTable.id, id));
}

export async function reviewMtAccount(id: number, status: "active" | "inactive" | "pending_review") {
  const [account] = await db.update(mt5AccountsTable)
    .set({ status })
    .where(eq(mt5AccountsTable.id, id))
    .returning();
  if (!account) return null;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, account.userId)).limit(1);
  return {
    ...mapAccount(account),
    userName: user?.fullName,
    userEmail: user?.email,
    userRole: user?.role,
    hasCredentials: !!account.passwordEnc,
  };
}
