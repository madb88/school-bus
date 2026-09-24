import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGO = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
/** Stable salt — secret itself provides entropy; salt only namespaces derivation. */
const KEY_SALT = "school-bus.settings-transfer.v1";
const BLOB_PREFIX = "v1";

let cachedKey: Buffer | null | undefined;

export function getTransferEncryptionKey(): Buffer | null {
  if (cachedKey !== undefined) return cachedKey;

  const secret = process.env.SETTINGS_TRANSFER_SECRET?.trim();
  if (!secret) {
    cachedKey = null;
    return null;
  }

  cachedKey = scryptSync(secret, KEY_SALT, KEY_LENGTH);
  return cachedKey;
}

export function isTransferEncryptionConfigured(): boolean {
  return getTransferEncryptionKey() !== null;
}

/** Reset cached key (tests only). */
export function resetTransferEncryptionKeyCache(): void {
  cachedKey = undefined;
}

/**
 * Encrypt a JSON-serializable payload for Redis storage.
 * Format: v1.<iv_b64url>.<tag_b64url>.<ciphertext_b64url>
 */
export function encryptTransferBlob(payload: unknown): string {
  const key = getTransferEncryptionKey();
  if (!key) {
    throw new Error("SETTINGS_TRANSFER_SECRET is not configured");
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    BLOB_PREFIX,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptTransferBlob(blob: unknown): unknown {
  const key = getTransferEncryptionKey();
  if (!key) {
    throw new Error("SETTINGS_TRANSFER_SECRET is not configured");
  }

  if (typeof blob !== "string") {
    throw new Error("Encrypted transfer blob must be a string");
  }

  const parts = blob.split(".");
  if (parts.length !== 4 || parts[0] !== BLOB_PREFIX) {
    throw new Error("Unrecognized transfer blob format");
  }

  const [, ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const ciphertext = Buffer.from(dataB64, "base64url");

  if (iv.length !== IV_LENGTH) {
    throw new Error("Invalid transfer blob IV");
  }

  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return JSON.parse(plaintext.toString("utf8")) as unknown;
}
