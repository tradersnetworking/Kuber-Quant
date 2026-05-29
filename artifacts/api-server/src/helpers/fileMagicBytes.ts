export type DetectedFileKind = "jpeg" | "png" | "webp" | "pdf" | "ico" | "unknown";

const PDF = Buffer.from("%PDF", "ascii");

export function detectFileKind(buffer: Buffer): DetectedFileKind {
  if (buffer.length < 4) return "unknown";

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "png";
  if (buffer.subarray(0, 4).equals(PDF)) return "pdf";

  if (buffer.length >= 12
    && buffer.subarray(0, 4).toString("ascii") === "RIFF"
    && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return "webp";
  }

  if (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00) {
    return "ico";
  }

  return "unknown";
}

const MIME_TO_KIND: Record<string, DetectedFileKind[]> = {
  "image/jpeg": ["jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "application/pdf": ["pdf"],
  "image/x-icon": ["ico"],
  "image/vnd.microsoft.icon": ["ico"],
};

export function validateUploadMagicBytes(buffer: Buffer, mimetype: string): boolean {
  const allowed = MIME_TO_KIND[mimetype];
  if (!allowed) return false;
  const kind = detectFileKind(buffer);
  return allowed.includes(kind);
}
