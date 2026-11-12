import type { Metadata } from "next";

const FALLBACK_SITE_URL = "http://localhost:3000";

/** Absolute site origin for metadata, sitemap, and OG URLs. */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return FALLBACK_SITE_URL;
}

/** Official brand name (domain mark). */
export const siteName = "autobusszkolny.pl";

/** Short name for PWA / home-screen labels. */
export const siteShortName = "autobusszkolny";

/** Brand tagline / product description — not a brand name substitute. */
export const siteTagline = "Dojazdy do szkoły";

/** Default browser / OG title for the site root. */
export const rootTitle = `${siteName} – ${siteTagline}`;

/**
 * Fallback scope note when the active school name is unknown.
 * Prefer the selected school's name from the schools API in UI.
 */
export const schoolScopeLabel = "Szkoła";

export const rootDescription =
  "Rozkłady autobusów szkolnych i komunikacji miejskiej oraz planowanie dojazdów dziecka do szkoły.";

export function buildPageMetadata({
  title,
  description,
  path = "/",
}: {
  title: string;
  description: string;
  path?: string;
}): Metadata {
  const url = `${getSiteUrl()}${path === "/" ? "" : path}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "pl_PL",
      url,
      siteName,
      title: title.includes(siteName) ? title : `${title} · ${siteName}`,
      description,
    },
    twitter: {
      card: "summary",
      title: title.includes(siteName) ? title : `${title} · ${siteName}`,
      description,
    },
  };
}
