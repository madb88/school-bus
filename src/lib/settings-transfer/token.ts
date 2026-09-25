/** Unambiguous charset (no 0/O, 1/I/L). */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateTransferToken(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) {
    out += ALPHABET[byte % ALPHABET.length];
  }
  return out;
}

/** Strip separators and normalize case for Redis lookup. */
export function normalizeTransferToken(input: string): string {
  return input.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/** Display as AB7K-9M2Q when length is 8. */
export function formatTransferCode(token: string): string {
  const clean = normalizeTransferToken(token);
  if (clean.length === 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  }
  return clean;
}

export function isValidTransferToken(token: string): boolean {
  const clean = normalizeTransferToken(token);
  return clean.length >= 6 && clean.length <= 16 && /^[A-Z0-9]+$/.test(clean);
}
