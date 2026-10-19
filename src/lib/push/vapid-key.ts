/** Strip quotes / whitespace that sneak in from .env or host env UI. */
export function normalizeVapidPublicKey(value: string): string {
  let key = value.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  return key;
}

export function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }
  return output;
}

/** Uncompressed P-256 point: 65 bytes, leading 0x04 (WebKit rejects anything else). */
export function parseApplicationServerKey(
  value: string,
): Uint8Array<ArrayBuffer> | null {
  try {
    const key = urlBase64ToUint8Array(normalizeVapidPublicKey(value));
    if (key.byteLength !== 65 || key[0] !== 0x04) return null;
    return key;
  } catch {
    return null;
  }
}
