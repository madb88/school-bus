import type { ScheduleDateFilter, ScheduleDirection } from "@/lib/dowozy/filter-schedule";
import type { ScheduleSourceMode } from "@/lib/dowozy/filter-url";
import {
  formatDayOptionLabel,
  isAbsoluteDateFilter,
  partsFromYmd,
} from "@/lib/dowozy/schedule-dates";

export function dateLabel(value: ScheduleDateFilter): string {
  if (value === "today") return "Dziś";
  if (value === "tomorrow") return "Jutro";
  if (value === "all") return "Wszystkie dni";
  if (isAbsoluteDateFilter(value)) {
    const parts = partsFromYmd(value);
    return parts ? formatDayOptionLabel(parts) : value;
  }
  return "Wszystkie dni";
}

export function directionLabel(value: ScheduleDirection): string {
  if (value === "pickups") return "Do szkoły";
  if (value === "dropoffs") return "Ze szkoły";
  return "wszystkie kierunki";
}

export function formatTripCount(count: number): string {
  if (count === 1) return "1 kurs";
  if (count >= 2 && count <= 4) return `${count} kursy`;
  return `${count} kursów`;
}

export function sourceModeLabel(value: ScheduleSourceMode): string {
  if (value === "school-mzk") return "Szkolny + MZK";
  return "Autobus szkolny";
}
