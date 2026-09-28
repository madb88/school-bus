import type { MetadataRoute } from "next";
import {
  siteName,
  siteShortName,
  siteTagline,
} from "@/lib/site-metadata";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteName,
    short_name: siteShortName,
    description: siteTagline,
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "pl",
    background_color: "#111821",
    theme_color: "#111821",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
