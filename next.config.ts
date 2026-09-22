import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure schedule JSON snapshots are available to serverless functions on Vercel.
  outputFileTracingIncludes: {
    "/*": ["./data/dowozy-schedule.json", "./data/mzk-schedule.json"],
  },
};

export default nextConfig;
