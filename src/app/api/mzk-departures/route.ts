import { NextResponse } from "next/server";
import type { ScheduleDateFilter } from "@/lib/dowozy/filter-schedule";
import { parseAbsoluteYmd } from "@/lib/dowozy/schedule-dates";
import { findOdDepartures } from "@/lib/mzk/filter-departures";
import { loadMzkScheduleSnapshot } from "@/lib/mzk/load-schedule";

const RELATIVE_DATE_FILTERS = new Set<ScheduleDateFilter>([
  "today",
  "tomorrow",
  "all",
]);

function parseDateFilter(value: string | null): ScheduleDateFilter | null {
  if (!value) return null;
  if (RELATIVE_DATE_FILTERS.has(value as ScheduleDateFilter)) {
    return value as ScheduleDateFilter;
  }
  return parseAbsoluteYmd(value);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const boardStopId = searchParams.get("board");
  const alightStopId = searchParams.get("alight");
  const dateFilter = parseDateFilter(searchParams.get("date"));
  const route = searchParams.get("route");

  if (!boardStopId || !alightStopId || !dateFilter) {
    return NextResponse.json(
      { error: "Wymagane parametry: board, alight, date." },
      { status: 400 },
    );
  }

  const schedule = await loadMzkScheduleSnapshot();
  if (!schedule) {
    return NextResponse.json(
      { error: "Brak rozkładu MZK." },
      { status: 503 },
    );
  }

  const routeFilter = route && route.trim() ? route.trim() : null;
  const now = new Date();

  const pickups = findOdDepartures(
    schedule,
    boardStopId,
    alightStopId,
    dateFilter,
    now,
    routeFilter,
  );
  const dropoffs = findOdDepartures(
    schedule,
    alightStopId,
    boardStopId,
    dateFilter,
    now,
    routeFilter,
  );

  return NextResponse.json(
    { pickups, dropoffs },
    {
      headers: {
        // Same day timetable; short private cache cuts repeat filter toggles.
        "Cache-Control": "private, max-age=60",
      },
    },
  );
}
