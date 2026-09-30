const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lowercase trimmed address, or null when it cannot be a login id. */
export function normalizeEmail(input: string): string | null {
  const email = input.trim().toLowerCase();
  if (email.length < 3 || email.length > 254) return null;
  if (email.includes("..")) return null;
  if (!EMAIL_RE.test(email)) return null;
  return email;
}
