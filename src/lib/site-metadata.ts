import type { Metadata } from "next";

const FALLBACK_SITE_URL = "http://localhost:3000";

/** Absolute site origin for metadata, sitemap, and OG URLs. */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }

  return FALLBACK_SITE_URL;
}

export const siteName = "Dojazdy do szkoły";

export const rootDescription =
  "Rozkład dowozów szkolnych i kursów MZK do Szkoły Olimpijczyków. Filtruj po dniu, miejscu i planie lekcji.";

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
