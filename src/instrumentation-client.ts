import posthog from "posthog-js";

/**
 * Client analytics (PostHog). Runs before hydration (Next.js instrumentation-client).
 * Memory persistence only — no PostHog cookies / localStorage (no consent banner).
 * Disable in env by leaving NEXT_PUBLIC_POSTHOG_KEY empty.
 */
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
const host =
  process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://eu.i.posthog.com";

if (key) {
  posthog.init(key, {
    api_host: host,
    ui_host: "https://eu.posthog.com",
    defaults: "2025-05-24",
    persistence: "memory",
    person_profiles: "identified_only",
    disable_session_recording: true,
  });
}
