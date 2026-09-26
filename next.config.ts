import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  // Ensure schedule JSON snapshots are available to serverless functions on Vercel.
  outputFileTracingIncludes: {
    "/*": ["./data/dowozy-schedule.json", "./data/mzk-schedule.json"],
    "/api/mzk-departures": ["./data/mzk-schedule.json"],
  },
};

export default nextConfig;
