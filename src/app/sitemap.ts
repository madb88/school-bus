import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const lastModified = new Date();

  return [
    { url: base, lastModified, changeFrequency: "daily", priority: 1 },
    {
      url: `${base}/lekcje`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/mzk`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${base}/o-aplikacji`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
