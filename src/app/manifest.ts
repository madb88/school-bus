import type { MetadataRoute } from "next";
import { rootDescription, siteName } from "@/lib/site-metadata";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteName,
    short_name: "Dojazdy",
    description: rootDescription,
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "pl",
    background_color: "#0c1420",
    theme_color: "#0c1420",
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
