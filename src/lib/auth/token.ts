const RANDOM_ID_RE = /^[A-Za-z0-9_-]{43}$/;

export function isSecretId(value: string): boolean {
  return RANDOM_ID_RE.test(value);
}

/** Accept only opaque backend session tokens; junk cookies never reach the API. */
export function readSessionToken(value: string | undefined | null): string | null {
  if (!value) return null;
  return isSecretId(value) ? value : null;
}
