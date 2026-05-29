import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import {
  db,
  webauthnCredentialsTable,
  biometricLoginLogsTable,
  userBiometricPrefsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, desc, sql } from "@workspace/db/orm";
import {
  getWebauthnExpectedOrigins,
  getWebauthnRpId,
  getWebauthnRpName,
} from "./webauthnConfig";
import {
  consumeWebauthnChallenge,
  newChallengeKey,
  storeWebauthnChallenge,
} from "./webauthnChallengeStore";
import { parseUserAgent, clientIp } from "./trustedDeviceService";

function bufferToBase64Url(buf: Buffer): string {
  return buf.toString("base64url");
}

function base64UrlToBuffer(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

function parseClientChallenge(clientDataJSON: string): string {
  return JSON.parse(Buffer.from(clientDataJSON, "base64url").toString()).challenge as string;
}

export async function userHasPasskeys(userId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: webauthnCredentialsTable.id })
    .from(webauthnCredentialsTable)
    .where(and(eq(webauthnCredentialsTable.userId, userId), eq(webauthnCredentialsTable.isActive, true)))
    .limit(1);
  return !!row;
}

export async function logBiometricEvent(opts: {
  userId?: number;
  credentialId?: number;
  eventType: string;
  success: boolean;
  failReason?: string;
  req?: any;
  deviceLabel?: string;
  metadata?: Record<string, unknown>;
}) {
  const ua = opts.req?.headers?.["user-agent"] ?? "";
  const { label } = parseUserAgent(ua);
  await db.insert(biometricLoginLogsTable).values({
    userId: opts.userId ?? null,
    credentialId: opts.credentialId ?? null,
    eventType: opts.eventType,
    success: opts.success,
    failReason: opts.failReason ?? null,
    ipAddress: opts.req ? clientIp(opts.req) : null,
    userAgent: ua || null,
    deviceLabel: opts.deviceLabel ?? label,
    metadata: opts.metadata ?? null,
  });
}

export async function getUserBiometricPrefs(userId: number) {
  const [prefs] = await db
    .select()
    .from(userBiometricPrefsTable)
    .where(eq(userBiometricPrefsTable.userId, userId))
    .limit(1);
  return (
    prefs ?? {
      userId,
      quickLoginEnabled: true,
      biometricWithdrawalsEnabled: false,
      withdrawalThresholdInr: "10000",
    }
  );
}

export async function updateUserBiometricPrefs(
  userId: number,
  patch: Partial<{
    quickLoginEnabled: boolean;
    biometricWithdrawalsEnabled: boolean;
    withdrawalThresholdInr: number;
  }>,
) {
  const current = await getUserBiometricPrefs(userId);
  const next = {
    quickLoginEnabled: patch.quickLoginEnabled ?? current.quickLoginEnabled,
    biometricWithdrawalsEnabled:
      patch.biometricWithdrawalsEnabled ?? current.biometricWithdrawalsEnabled,
    withdrawalThresholdInr: String(
      patch.withdrawalThresholdInr ?? Number(current.withdrawalThresholdInr ?? 10000),
    ),
  };
  await db
    .insert(userBiometricPrefsTable)
    .values({ userId, ...next })
    .onConflictDoUpdate({
      target: userBiometricPrefsTable.userId,
      set: { ...next, updatedAt: new Date() },
    });
  return next;
}

export async function createRegistrationOptions(userId: number, userEmail: string, userName: string) {
  const existing = await db
    .select()
    .from(webauthnCredentialsTable)
    .where(and(eq(webauthnCredentialsTable.userId, userId), eq(webauthnCredentialsTable.isActive, true)));

  const options = await generateRegistrationOptions({
    rpName: getWebauthnRpName(),
    rpID: getWebauthnRpId(),
    userName: userEmail,
    userDisplayName: userName || userEmail,
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({
      id: base64UrlToBuffer(c.credentialId),
      transports: (c.transports as AuthenticatorTransport[] | undefined) ?? undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
      authenticatorAttachment: "platform",
    },
  });

  const key = newChallengeKey("reg", userId);
  await storeWebauthnChallenge(key, options.challenge);
  return { options, challengeKey: key };
}

export async function verifyRegistration(
  userId: number,
  response: RegistrationResponseJSON,
  challengeKey: string,
  req: any,
  deviceName?: string,
): Promise<{ ok: boolean; error?: string; credentialId?: number }> {
  const expectedChallenge = parseClientChallenge(response.response.clientDataJSON);
  const challengeOk = await consumeWebauthnChallenge(challengeKey, expectedChallenge);
  if (!challengeOk) {
    await logBiometricEvent({
      userId,
      eventType: "register",
      success: false,
      failReason: "invalid_challenge",
      req,
    });
    return { ok: false, error: "Registration challenge expired or invalid" };
  }

  let verification: VerifiedRegistrationResponse;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: getWebauthnExpectedOrigins(),
      expectedRPID: getWebauthnRpId(),
      requireUserVerification: true,
    });
  } catch (err: any) {
    await logBiometricEvent({
      userId,
      eventType: "register",
      success: false,
      failReason: err?.message ?? "verification_failed",
      req,
    });
    return { ok: false, error: "Passkey registration verification failed" };
  }

  if (!verification.verified || !verification.registrationInfo) {
    await logBiometricEvent({ userId, eventType: "register", success: false, failReason: "not_verified", req });
    return { ok: false, error: "Passkey could not be verified" };
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  const ua = req.headers?.["user-agent"] ?? "";
  const { label } = parseUserAgent(ua);

  const [row] = await db
    .insert(webauthnCredentialsTable)
    .values({
      userId,
      credentialId: bufferToBase64Url(Buffer.from(credential.id)),
      publicKey: bufferToBase64Url(Buffer.from(credential.publicKey)),
      counter: credential.counter,
      deviceType: credentialDeviceType,
      deviceName: deviceName?.trim() || label || "Passkey",
      transports: response.response.transports ?? null,
      backedUp: credentialBackedUp,
      userAgent: ua,
      ipAddress: clientIp(req),
    })
    .returning();

  await logBiometricEvent({
    userId,
    credentialId: row!.id,
    eventType: "register",
    success: true,
    req,
    deviceLabel: row!.deviceName,
  });

  return { ok: true, credentialId: row!.id };
}

async function loadCredentialsForUser(userId: number) {
  return db
    .select()
    .from(webauthnCredentialsTable)
    .where(and(eq(webauthnCredentialsTable.userId, userId), eq(webauthnCredentialsTable.isActive, true)));
}

export async function createAuthenticationOptions(userId: number) {
  const creds = await loadCredentialsForUser(userId);
  if (creds.length === 0) {
    throw new Error("No passkeys registered for this account");
  }

  const options = await generateAuthenticationOptions({
    rpID: getWebauthnRpId(),
    allowCredentials: creds.map((c) => ({
      id: base64UrlToBuffer(c.credentialId),
      transports: (c.transports as AuthenticatorTransport[] | undefined) ?? undefined,
    })),
    userVerification: "required",
  });

  const key = newChallengeKey("auth", userId);
  await storeWebauthnChallenge(key, options.challenge);
  return { options, challengeKey: key };
}

export async function createAuthenticationOptionsByEmail(email: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user || !user.isActive) {
    throw new Error("Account not found");
  }
  const prefs = await getUserBiometricPrefs(user.id);
  if (!prefs.quickLoginEnabled) {
    throw new Error("Passkey quick login is disabled for this account");
  }
  if (!(await userHasPasskeys(user.id))) {
    throw new Error("No passkeys registered for this account");
  }
  const { options, challengeKey } = await createAuthenticationOptions(user.id);
  return { options, challengeKey, userId: user.id };
}

export async function verifyAuthentication(
  userId: number,
  response: AuthenticationResponseJSON,
  challengeKey: string,
  req: any,
  eventType: "login" | "2fa" | "action" = "login",
): Promise<{ ok: boolean; error?: string; credentialDbId?: number }> {
  const credIdB64 = response.id;
  const [storedCred] = await db
    .select()
    .from(webauthnCredentialsTable)
    .where(
      and(
        eq(webauthnCredentialsTable.userId, userId),
        eq(webauthnCredentialsTable.credentialId, credIdB64),
        eq(webauthnCredentialsTable.isActive, true),
      ),
    )
    .limit(1);

  if (!storedCred) {
    await logBiometricEvent({
      userId,
      eventType,
      success: false,
      failReason: "unknown_credential",
      req,
    });
    return { ok: false, error: "Unknown passkey for this account" };
  }

  const expectedChallenge = parseClientChallenge(response.response.clientDataJSON);
  const challengeOk = await consumeWebauthnChallenge(challengeKey, expectedChallenge);
  if (!challengeOk) {
    await logBiometricEvent({
      userId,
      credentialId: storedCred.id,
      eventType,
      success: false,
      failReason: "invalid_challenge",
      req,
    });
    return { ok: false, error: "Authentication challenge expired or invalid" };
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: getWebauthnExpectedOrigins(),
      expectedRPID: getWebauthnRpId(),
      requireUserVerification: true,
      credential: {
        id: base64UrlToBuffer(storedCred.credentialId),
        publicKey: base64UrlToBuffer(storedCred.publicKey),
        counter: storedCred.counter,
        transports: (storedCred.transports as AuthenticatorTransport[] | undefined) ?? undefined,
      },
    });

    if (!verification.verified) {
      await logBiometricEvent({
        userId,
        credentialId: storedCred.id,
        eventType,
        success: false,
        failReason: "not_verified",
        req,
      });
      return { ok: false, error: "Passkey verification failed" };
    }

    await db
      .update(webauthnCredentialsTable)
      .set({
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
      })
      .where(eq(webauthnCredentialsTable.id, storedCred.id));

    await logBiometricEvent({
      userId,
      credentialId: storedCred.id,
      eventType,
      success: true,
      req,
      deviceLabel: storedCred.deviceName,
    });

    return { ok: true, credentialDbId: storedCred.id };
  } catch (err: any) {
    await logBiometricEvent({
      userId,
      credentialId: storedCred.id,
      eventType,
      success: false,
      failReason: err?.message ?? "verification_error",
      req,
    });
    return { ok: false, error: "Passkey verification failed" };
  }
}

export async function listUserCredentials(userId: number) {
  const rows = await db
    .select()
    .from(webauthnCredentialsTable)
    .where(eq(webauthnCredentialsTable.userId, userId))
    .orderBy(desc(webauthnCredentialsTable.createdAt));
  return rows.map((c) => ({
    id: c.id,
    deviceName: c.deviceName,
    deviceType: c.deviceType,
    backedUp: c.backedUp,
    isActive: c.isActive,
    lastUsedAt: c.lastUsedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  }));
}

export async function removeCredential(userId: number, credentialDbId: number): Promise<boolean> {
  const [row] = await db
    .select()
    .from(webauthnCredentialsTable)
    .where(and(eq(webauthnCredentialsTable.id, credentialDbId), eq(webauthnCredentialsTable.userId, userId)))
    .limit(1);
  if (!row) return false;
  await db
    .update(webauthnCredentialsTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(webauthnCredentialsTable.id, credentialDbId));
  return true;
}

export async function renameCredential(userId: number, credentialDbId: number, deviceName: string) {
  const [row] = await db
    .update(webauthnCredentialsTable)
    .set({ deviceName: deviceName.trim().slice(0, 120), updatedAt: new Date() })
    .where(and(eq(webauthnCredentialsTable.id, credentialDbId), eq(webauthnCredentialsTable.userId, userId)))
    .returning();
  return row ?? null;
}

export async function listUserBiometricLogs(userId: number, limit = 50) {
  const rows = await db
    .select()
    .from(biometricLoginLogsTable)
    .where(eq(biometricLoginLogsTable.userId, userId))
    .orderBy(desc(biometricLoginLogsTable.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    eventType: r.eventType,
    success: r.success,
    failReason: r.failReason,
    deviceLabel: r.deviceLabel,
    ipAddress: r.ipAddress,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createActionVerificationOptions(userId: number) {
  return createAuthenticationOptions(userId);
}

export async function verifyActionWithPasskey(
  userId: number,
  response: AuthenticationResponseJSON,
  challengeKey: string,
  req: any,
): Promise<{ ok: boolean; error?: string }> {
  const prefs = await getUserBiometricPrefs(userId);
  if (!prefs.biometricWithdrawalsEnabled) {
    return { ok: false, error: "Biometric action verification is not enabled" };
  }
  return verifyAuthentication(userId, response, challengeKey, req, "action");
}

export async function countUserPasskeys(userId: number): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(webauthnCredentialsTable)
    .where(and(eq(webauthnCredentialsTable.userId, userId), eq(webauthnCredentialsTable.isActive, true)));
  return row?.count ?? 0;
}
