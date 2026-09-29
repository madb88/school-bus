import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Browser hardening — keep CSP in sync with Turnstile + Vercel Analytics/Insights.
 * HSTS + upgrade-insecure-requests only in production (they break http://localhost).
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  // React DevTools / stack reconstruction need eval only in development.
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} https://challenges.cloudflare.com https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https://challenges.cloudflare.com https://vitals.vercel-insights.com https://va.vercel-scripts.com",
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

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
          ...securityHeaders,
        ],
      },
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  // Ensure schedule JSON snapshots are available to serverless functions on Vercel.
  // "/*" covers pages; API routes need their own entries (see /api/mzk-departures).
  outputFileTracingIncludes: {
    "/*": [
      "./data/dowozy-schedule.json",
      "./data/dowozy-overrides.json",
      "./data/mzk-schedule.json",
      "./data/mzk-schedule-meta.json",
    ],
    "/api/mzk-departures": ["./data/mzk-schedule.json"],
    "/api/push/dispatch": [
      "./data/dowozy-schedule.json",
      "./data/dowozy-overrides.json",
    ],
    "/api/push/subscribe": [
      "./data/dowozy-schedule.json",
      "./data/dowozy-overrides.json",
    ],
  },
};

export default nextConfig;
