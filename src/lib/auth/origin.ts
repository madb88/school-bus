import { getSiteUrl } from "@/lib/site-metadata";

function isLocalHostname(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return true;
  }
  const parts = hostname.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part))) return false;
  const octets = parts.map(Number);
  const [a, b] = octets;
  if (octets.some((octet) => octet > 255)) return false;
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  return a === 172 && b >= 16 && b <= 31;
}

/**
 * Checkout / redirect origins must hit this app.
 * Local dev uses the request origin; anything else stays on the public site URL
 * so a forged Host cannot put return URLs on another domain.
 */
export function loginLinkOrigin(requestUrl: string): string {
  let requestOrigin = "";
  let hostname = "";
  try {
    const url = new URL(requestUrl);
    requestOrigin = url.origin;
    hostname = url.hostname;
  } catch {
    return getSiteUrl();
  }

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured && requestOrigin === configured) return requestOrigin;
  if (isLocalHostname(hostname)) return requestOrigin;
  return getSiteUrl();
}
