/** Next.js Data Cache revalidate window for schedule API GETs (seconds). */
export const SCHEDULE_API_REVALIDATE_SEC = 120;

/** Shorter window for GET /health probes. */
export const SCHEDULE_API_HEALTH_REVALIDATE_SEC = 30;

export const SCHEDULE_API_TAGS = {
  health: "schedule-api-health",
  dowozy: "dowozy-schedule",
  mzk: "mzk-schedule",
  mzkMeta: "mzk-meta",
} as const;
