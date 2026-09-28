import type { MzkSchedule, MzkScheduleMetaFile } from "./types";

export function mzkMetaFromSchedule(
  schedule: MzkSchedule,
): MzkScheduleMetaFile {
  return {
    sourceUrl: schedule.sourceUrl,
    attribution: schedule.attribution,
    fetchedAt: schedule.fetchedAt,
    feedStartDate: schedule.feedStartDate,
    feedEndDate: schedule.feedEndDate,
    stopCount: schedule.stops.length,
    tripCount: schedule.trips.length,
  };
}
