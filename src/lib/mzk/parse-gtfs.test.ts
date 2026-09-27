import { describe, expect, it } from "vitest";
import {
  buildMzkScheduleFromGtfs,
  formatGtfsTime,
  isSchoolWeekdayService,
  parseCsv,
  type GtfsFiles,
} from "./parse-gtfs";

describe("parseCsv", () => {
  it("splits plain rows and skips empty lines", () => {
    expect(parseCsv("a,b\n1,2\n\n3,4\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("handles quoted commas and escaped quotes", () => {
    expect(parseCsv('name,note\n"Zatonie, os.","say ""hi"""\n')).toEqual([
      ["name", "note"],
      ["Zatonie, os.", 'say "hi"'],
    ]);
  });

  it("strips BOM", () => {
    expect(parseCsv("\uFEFFa,b\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("formatGtfsTime", () => {
  it("formats HH:MM:SS to H:MM and drops seconds", () => {
    expect(formatGtfsTime("07:15:00")).toBe("7:15");
    expect(formatGtfsTime("14:05:30")).toBe("14:05");
  });

  it("rejects overnight hours and junk", () => {
    expect(formatGtfsTime("24:00:00")).toBeNull();
    expect(formatGtfsTime("25:10:00")).toBeNull();
    expect(formatGtfsTime("noon")).toBeNull();
  });
});

describe("isSchoolWeekdayService", () => {
  it("keeps RO/RW school weekday services", () => {
    expect(isSchoolWeekdayService("W_RO")).toBe(true);
    expect(isSchoolWeekdayService("W_RW")).toBe(true);
  });

  it("skips weekend / other services", () => {
    expect(isSchoolWeekdayService("W_SO")).toBe(false);
    expect(isSchoolWeekdayService("W_NI")).toBe(false);
    expect(isSchoolWeekdayService("SPECIAL")).toBe(false);
  });
});

function minimalGtfs(overrides?: Partial<GtfsFiles>): GtfsFiles {
  return {
    stops: [
      "stop_id,stop_name",
      "350,Zatonie",
      "299,Drzonków Olimpijska",
      "999,Irrelevant Stop",
    ].join("\n"),
    routes: ["route_id,route_short_name", "R30,30"].join("\n"),
    trips: [
      "route_id,service_id,trip_id,trip_headsign",
      "R30,W_RO,t1,Drzonków",
      "R30,W_SO,t_weekend,Drzonków",
      "R30,W_RO,t_other,Elsewhere",
    ].join("\n"),
    stopTimes: [
      "trip_id,arrival_time,departure_time,stop_id,stop_sequence",
      "t1,07:10:00,07:10:00,350,1",
      "t1,07:40:00,07:40:00,299,2",
      "t_weekend,08:00:00,08:00:00,350,1",
      "t_weekend,08:30:00,08:30:00,299,2",
      "t_other,09:00:00,09:00:00,999,1",
      "t_other,09:20:00,09:20:00,999,2",
    ].join("\n"),
    feedInfo: [
      "feed_publisher_name,feed_start_date,feed_end_date",
      "MZK,20260901,20261231",
    ].join("\n"),
    calendarDates: [
      "service_id,date,exception_type",
      "W_RO,20260908,1",
      "W_RO,20260909,1",
      "W_SO,20260912,1",
      "W_RO,20260910,2",
    ].join("\n"),
    ...overrides,
  };
}

describe("buildMzkScheduleFromGtfs", () => {
  const meta = {
    sourceUrl: "https://example.test/gtfs.zip",
    attribution: "MZK Zielona Góra",
    fetchedAt: "2026-09-27T06:00:00.000Z",
  };

  it("keeps school-weekday trips that visit seed stops and drops the rest", () => {
    const schedule = buildMzkScheduleFromGtfs(minimalGtfs(), meta);

    expect(schedule.sourceUrl).toBe(meta.sourceUrl);
    expect(schedule.fetchedAt).toBe(meta.fetchedAt);
    expect(schedule.feedStartDate).toBe("20260901");
    expect(schedule.feedEndDate).toBe("20261231");

    expect(schedule.trips).toHaveLength(1);
    expect(schedule.trips[0]).toMatchObject({
      route: "30",
      headsign: "Drzonków",
      serviceId: "W_RO",
    });
    expect(schedule.trips[0].stops.map((s) => s.stopId)).toEqual([
      "350",
      "299",
    ]);
    expect(schedule.trips[0].stops.map((s) => s.time)).toEqual([
      "7:10",
      "7:40",
    ]);

    expect(schedule.stops.map((s) => s.id).sort()).toEqual(["299", "350"]);
    expect(schedule.serviceDates).toEqual({
      W_RO: ["20260908", "20260909"],
    });
  });

  it("dedupes identical trip signatures", () => {
    const files = minimalGtfs({
      trips: [
        "route_id,service_id,trip_id,trip_headsign",
        "R30,W_RO,t1,Drzonków",
        "R30,W_RO,t1b,Drzonków",
      ].join("\n"),
      stopTimes: [
        "trip_id,arrival_time,departure_time,stop_id,stop_sequence",
        "t1,07:10:00,07:10:00,350,1",
        "t1,07:40:00,07:40:00,299,2",
        "t1b,07:10:00,07:10:00,350,1",
        "t1b,07:40:00,07:40:00,299,2",
      ].join("\n"),
    });

    const schedule = buildMzkScheduleFromGtfs(files, meta);
    expect(schedule.trips).toHaveLength(1);
  });

  it("skips trips with fewer than two timed stops", () => {
    const files = minimalGtfs({
      trips: [
        "route_id,service_id,trip_id,trip_headsign",
        "R30,W_RO,t_short,Drzonków",
      ].join("\n"),
      stopTimes: [
        "trip_id,arrival_time,departure_time,stop_id,stop_sequence",
        "t_short,07:10:00,07:10:00,350,1",
      ].join("\n"),
    });

    expect(buildMzkScheduleFromGtfs(files, meta).trips).toHaveLength(0);
  });

  it("returns empty trips for empty GTFS tables", () => {
    const empty: GtfsFiles = {
      stops: "stop_id,stop_name\n",
      trips: "route_id,service_id,trip_id,trip_headsign\n",
      routes: "route_id,route_short_name\n",
      stopTimes:
        "trip_id,arrival_time,departure_time,stop_id,stop_sequence\n",
      feedInfo: "feed_publisher_name,feed_start_date,feed_end_date\n",
      calendarDates: "service_id,date,exception_type\n",
    };

    const schedule = buildMzkScheduleFromGtfs(empty, meta);
    expect(schedule.trips).toEqual([]);
    expect(schedule.stops).toEqual([]);
    expect(schedule.serviceDates).toEqual({});
    expect(schedule.feedEndDate).toBe("");
  });
});
