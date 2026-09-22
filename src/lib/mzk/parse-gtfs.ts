import type { MzkSchedule, MzkStop, MzkTrip, MzkTripStop } from "./types";
import { seedMzkStopIds } from "./place-map";

type TripInfo = {
  routeId: string;
  serviceId: string;
  headsign: string;
};

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, "");
}

/** Minimal CSV splitter for GTFS (handles quoted fields). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of stripBom(text).split(/\r?\n/)) {
    if (!line) continue;
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        cells.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    cells.push(current);
    rows.push(cells);
  }
  return rows;
}

function rowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = row[i] ?? "";
    }
    return obj;
  });
}

export function formatGtfsTime(gtfsTime: string): string | null {
  const match = gtfsTime.match(/^(\d+):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  if (hour >= 24) return null;
  return `${hour}:${match[2]}`;
}

/** Mon–Fri school / working timetables only (skip weekends & holidays). */
export function isSchoolWeekdayService(serviceId: string): boolean {
  return serviceId.endsWith("_RO") || serviceId.endsWith("_RW");
}

function tripSignature(trip: MzkTrip): string {
  const stops = trip.stops.map((s) => `${s.stopId}@${s.time}`).join(">");
  return `${trip.serviceId}|${trip.route}|${trip.headsign}|${stops}`;
}

export type GtfsFiles = {
  stops: string;
  trips: string;
  routes: string;
  stopTimes: string;
  feedInfo: string;
  calendarDates: string;
};

export function buildMzkScheduleFromGtfs(
  files: GtfsFiles,
  meta: { sourceUrl: string; attribution: string; fetchedAt: string },
): MzkSchedule {
  const stops = rowsToObjects(parseCsv(files.stops));
  const trips = rowsToObjects(parseCsv(files.trips));
  const routes = rowsToObjects(parseCsv(files.routes));
  const stopTimes = rowsToObjects(parseCsv(files.stopTimes));
  const calendarDates = rowsToObjects(parseCsv(files.calendarDates));
  const feedInfo = rowsToObjects(parseCsv(files.feedInfo))[0] ?? {};

  const stopNameById = new Map<string, string>();
  for (const stop of stops) {
    stopNameById.set(stop.stop_id, stop.stop_name.trim());
  }

  const routeShortById = new Map<string, string>();
  for (const route of routes) {
    routeShortById.set(
      route.route_id,
      route.route_short_name || route.route_id,
    );
  }

  const tripById = new Map<string, TripInfo>();
  for (const trip of trips) {
    if (!isSchoolWeekdayService(trip.service_id)) continue;
    tripById.set(trip.trip_id, {
      routeId: trip.route_id,
      serviceId: trip.service_id,
      headsign: (trip.trip_headsign || "").trim(),
    });
  }

  const serviceDates: Record<string, string[]> = {};
  for (const row of calendarDates) {
    if (row.exception_type !== "1") continue;
    if (!isSchoolWeekdayService(row.service_id)) continue;
    const list = serviceDates[row.service_id] ?? [];
    list.push(row.date);
    serviceDates[row.service_id] = list;
  }
  for (const sid of Object.keys(serviceDates)) {
    serviceDates[sid].sort();
  }

  const seedIds = new Set(seedMzkStopIds());

  const relevantTripIds = new Set<string>();
  for (const row of stopTimes) {
    if (!seedIds.has(row.stop_id)) continue;
    if (!tripById.has(row.trip_id)) continue;
    relevantTripIds.add(row.trip_id);
  }

  const legsByTrip = new Map<string, MzkTripStop[]>();
  const catalogIds = new Set<string>();

  for (const row of stopTimes) {
    if (!relevantTripIds.has(row.trip_id)) continue;
    const time = formatGtfsTime(row.departure_time);
    if (!time) continue;
    const sequence = Number(row.stop_sequence);
    if (!Number.isFinite(sequence)) continue;

    const list = legsByTrip.get(row.trip_id) ?? [];
    list.push({ stopId: row.stop_id, time, sequence });
    legsByTrip.set(row.trip_id, list);
    catalogIds.add(row.stop_id);
  }

  const uniqueTrips = new Map<string, MzkTrip>();

  for (const [tripId, legs] of legsByTrip) {
    const info = tripById.get(tripId);
    if (!info) continue;
    if (legs.length < 2) continue;

    const sorted = [...legs].sort((a, b) => a.sequence - b.sequence);
    const trip: MzkTrip = {
      route: routeShortById.get(info.routeId) ?? info.routeId,
      headsign: info.headsign,
      serviceId: info.serviceId,
      stops: sorted,
    };
    uniqueTrips.set(tripSignature(trip), trip);
  }

  const usedServiceIds = new Set(
    [...uniqueTrips.values()].map((t) => t.serviceId),
  );
  const trimmedDates: Record<string, string[]> = {};
  for (const sid of usedServiceIds) {
    if (serviceDates[sid]?.length) trimmedDates[sid] = serviceDates[sid];
  }

  const stopCatalog: MzkStop[] = [...catalogIds]
    .map((id) => ({
      id,
      name: stopNameById.get(id) ?? id,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pl"));

  const tripList = [...uniqueTrips.values()].sort((a, b) => {
    if (a.route !== b.route) {
      return a.route.localeCompare(b.route, "pl", { numeric: true });
    }
    const at = a.stops[0]?.time ?? "";
    const bt = b.stops[0]?.time ?? "";
    const [ah, am] = at.split(":").map(Number);
    const [bh, bm] = bt.split(":").map(Number);
    return ah * 60 + am - (bh * 60 + bm);
  });

  return {
    sourceUrl: meta.sourceUrl,
    attribution: meta.attribution,
    fetchedAt: meta.fetchedAt,
    feedStartDate: feedInfo.feed_start_date ?? "",
    feedEndDate: feedInfo.feed_end_date ?? "",
    stops: stopCatalog,
    trips: tripList,
    serviceDates: trimmedDates,
  };
}
