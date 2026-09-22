import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure the scraped schedule JSON is available to serverless functions on Vercel.
  outputFileTracingIncludes: {
    "/*": ["./data/dowozy-schedule.json"],
  },
};

export default nextConfig;
