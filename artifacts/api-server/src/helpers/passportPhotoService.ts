import fs from "fs";
import path from "path";
import { db, kycRecordsTable, usersTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";
import { getUploadUrl, getUploadRoot } from "../middlewares/upload";
import { resolveLocalUploadPath } from "./agreementAssetHelper";

type SyncOpts = { onlyIfEmpty?: boolean };

/** Copy profile avatar into KYC passport photo when no dedicated KYC photo exists yet. */
export async function syncPassportPhotoUrl(
  userId: number,
  photoUrl: string,
  opts: SyncOpts = {},
): Promise<void> {
  const onlyIfEmpty = opts.onlyIfEmpty !== false;

  const [existing] = await db.select().from(kycRecordsTable)
    .where(eq(kycRecordsTable.userId, userId))
    .limit(1);
  const now = new Date();

  if (existing?.passportPhotoUrl?.trim() && onlyIfEmpty) {
    return;
  }

  if (existing) {
    await db.update(kycRecordsTable)
      .set({ passportPhotoUrl: photoUrl, updatedAt: now })
      .where(eq(kycRecordsTable.userId, userId));
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  await db.insert(kycRecordsTable).values({
    userId,
    passportPhotoUrl: photoUrl,
    fullName: user?.fullName || null,
    status: "pending",
  });
}

/** Copy the user's KYC passport photo into their public profile avatar. */
export async function copyPassportPhotoToAvatar(userId: number): Promise<string> {
  const [kyc] = await db.select().from(kycRecordsTable)
    .where(eq(kycRecordsTable.userId, userId))
    .limit(1);

  const sourcePath = kyc?.passportPhotoUrl?.trim();
  if (!sourcePath) {
    throw new Error("No KYC passport photo on file");
  }

  const local = resolveLocalUploadPath(sourcePath);
  if (!local || !fs.existsSync(local)) {
    throw new Error("KYC passport photo file is missing — re-upload in KYC");
  }

  const ext = path.extname(local) || ".jpg";
  const filename = `avatar-${userId}-${Date.now()}${ext}`;
  const destDir = path.join(getUploadRoot(), "profile_images");
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(local, path.join(destDir, filename));

  const avatarUrl = getUploadUrl("profile_images", filename);
  await db.update(usersTable)
    .set({ avatarUrl, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));

  return avatarUrl;
}
