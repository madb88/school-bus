/** Next.js Data Cache revalidate window for schedule API GETs (seconds). */
export const SCHEDULE_API_REVALIDATE_SEC = 120;

/** Shorter window for GET /health probes. */
export const SCHEDULE_API_HEALTH_REVALIDATE_SEC = 30;

export const SCHEDULE_API_TAGS = {
  health: "schedule-api-health",
  dowozy: "dowozy-schedule",
  mzk: "mzk-schedule",
  mzkMeta: "mzk-meta",
  cities: "cities",
  schools: "schools",
  places: "school-places",
  notices: "school-notices",
} as const;

export function schoolScheduleTag(schoolId: string): string {
  return `${SCHEDULE_API_TAGS.dowozy}:${schoolId}`;
}

export function schoolPlacesTag(schoolId: string): string {
  return `${SCHEDULE_API_TAGS.places}:${schoolId}`;
}

export function schoolNoticesTag(schoolId: string): string {
  return `${SCHEDULE_API_TAGS.notices}:${schoolId}`;
}

export function mzkScheduleTag(schoolId: string): string {
  return `${SCHEDULE_API_TAGS.mzk}:${schoolId}`;
}

export function mzkMetaTag(schoolId: string): string {
  return `${SCHEDULE_API_TAGS.mzkMeta}:${schoolId}`;
}
