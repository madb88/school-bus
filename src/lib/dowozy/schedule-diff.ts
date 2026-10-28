import type {
  Course,
  DayDropoff,
  DriverBlock,
  Schedule,
  Stop,
  WeekdayDropoff,
} from "./types";

export type ScheduleDiffSection =
  | "pickup"
  | "dropoffDate"
  | "dropoffWeekday"
  | "meta";

export type ScheduleDiffChange = "time_changed" | "added" | "removed";

export type ScheduleDiffItem = {
  section: ScheduleDiffSection;
  change: ScheduleDiffChange;
  /** Human-readable path, e.g. "I kurs · Kierowca A". */
  context: string;
  places: string[];
  fromTime?: string;
  toTime?: string;
};

function placesKey(places: string[]): string {
  return [...places].map((p) => p.trim()).sort().join("|");
}

function formatPlaces(places: string[]): string[] {
  return places.map((p) => p.trim()).filter(Boolean);
}

function stopMap(stops: Stop[]): Map<string, Stop> {
  const map = new Map<string, Stop>();
  for (const stop of stops) {
    map.set(placesKey(stop.places), stop);
  }
  return map;
}

function diffStops(
  before: Stop[],
  after: Stop[],
  section: ScheduleDiffSection,
  context: string,
  out: ScheduleDiffItem[],
): void {
  const beforeMap = stopMap(before);
  const afterMap = stopMap(after);

  for (const [key, afterStop] of afterMap) {
    const beforeStop = beforeMap.get(key);
    const places = formatPlaces(afterStop.places);
    if (!beforeStop) {
      out.push({
        section,
        change: "added",
        context,
        places,
        toTime: afterStop.time,
      });
      continue;
    }
    if (beforeStop.time.trim() !== afterStop.time.trim()) {
      out.push({
        section,
        change: "time_changed",
        context,
        places,
        fromTime: beforeStop.time,
        toTime: afterStop.time,
      });
    }
  }

  for (const [key, beforeStop] of beforeMap) {
    if (afterMap.has(key)) continue;
    out.push({
      section,
      change: "removed",
      context,
      places: formatPlaces(beforeStop.places),
      fromTime: beforeStop.time,
    });
  }
}

function courseMap(courses: Course[]): Map<string, Course> {
  const map = new Map<string, Course>();
  for (const course of courses) {
    map.set(course.label.trim(), course);
  }
  return map;
}

function diffCourses(
  before: Course[],
  after: Course[],
  driverName: string,
  out: ScheduleDiffItem[],
): void {
  const beforeMap = courseMap(before);
  const afterMap = courseMap(after);

  for (const [label, afterCourse] of afterMap) {
    const context = `${afterCourse.label} · ${driverName}`;
    const beforeCourse = beforeMap.get(label);
    if (!beforeCourse) {
      for (const stop of afterCourse.stops) {
        out.push({
          section: "pickup",
          change: "added",
          context,
          places: formatPlaces(stop.places),
          toTime: stop.time,
        });
      }
      continue;
    }
    diffStops(beforeCourse.stops, afterCourse.stops, "pickup", context, out);
  }

  for (const [label, beforeCourse] of beforeMap) {
    if (afterMap.has(label)) continue;
    const context = `${beforeCourse.label} · ${driverName}`;
    for (const stop of beforeCourse.stops) {
      out.push({
        section: "pickup",
        change: "removed",
        context,
        places: formatPlaces(stop.places),
        fromTime: stop.time,
      });
    }
  }
}

function driverMap(blocks: DriverBlock[]): Map<string, DriverBlock> {
  const map = new Map<string, DriverBlock>();
  for (const block of blocks) {
    map.set(block.name.trim(), block);
  }
  return map;
}

function diffPickups(
  before: DriverBlock[],
  after: DriverBlock[],
  out: ScheduleDiffItem[],
): void {
  const beforeMap = driverMap(before);
  const afterMap = driverMap(after);

  for (const [name, afterBlock] of afterMap) {
    const beforeBlock = beforeMap.get(name);
    if (!beforeBlock) {
      diffCourses([], afterBlock.courses, afterBlock.name, out);
      continue;
    }
    diffCourses(beforeBlock.courses, afterBlock.courses, afterBlock.name, out);
  }

  for (const [name, beforeBlock] of beforeMap) {
    if (afterMap.has(name)) continue;
    diffCourses(beforeBlock.courses, [], beforeBlock.name, out);
  }
}

function dayDropoffKey(item: DayDropoff): string {
  return `${item.dateLabel.trim()}::${item.driver.trim()}`;
}

function weekdayDropoffKey(item: WeekdayDropoff): string {
  return `${item.title.trim()}::${item.driver.trim()}`;
}

function diffDayDropoffs(
  before: DayDropoff[],
  after: DayDropoff[],
  out: ScheduleDiffItem[],
): void {
  const beforeMap = new Map(before.map((d) => [dayDropoffKey(d), d]));
  const afterMap = new Map(after.map((d) => [dayDropoffKey(d), d]));

  for (const [key, afterItem] of afterMap) {
    const context = `${afterItem.dateLabel} · ${afterItem.driver}`;
    const beforeItem = beforeMap.get(key);
    if (!beforeItem) {
      for (const stop of afterItem.runs) {
        out.push({
          section: "dropoffDate",
          change: "added",
          context,
          places: formatPlaces(stop.places),
          toTime: stop.time,
        });
      }
      continue;
    }
    diffStops(
      beforeItem.runs,
      afterItem.runs,
      "dropoffDate",
      context,
      out,
    );
  }

  for (const [key, beforeItem] of beforeMap) {
    if (afterMap.has(key)) continue;
    const context = `${beforeItem.dateLabel} · ${beforeItem.driver}`;
    for (const stop of beforeItem.runs) {
      out.push({
        section: "dropoffDate",
        change: "removed",
        context,
        places: formatPlaces(stop.places),
        fromTime: stop.time,
      });
    }
  }
}

function diffWeekdayDropoffs(
  before: WeekdayDropoff[],
  after: WeekdayDropoff[],
  out: ScheduleDiffItem[],
): void {
  const beforeMap = new Map(before.map((d) => [weekdayDropoffKey(d), d]));
  const afterMap = new Map(after.map((d) => [weekdayDropoffKey(d), d]));

  for (const [key, afterItem] of afterMap) {
    const context = `${afterItem.title} · ${afterItem.driver}`;
    const beforeItem = beforeMap.get(key);
    if (!beforeItem) {
      for (const stop of afterItem.runs) {
        out.push({
          section: "dropoffWeekday",
          change: "added",
          context,
          places: formatPlaces(stop.places),
          toTime: stop.time,
        });
      }
      continue;
    }
    diffStops(
      beforeItem.runs,
      afterItem.runs,
      "dropoffWeekday",
      context,
      out,
    );
  }

  for (const [key, beforeItem] of beforeMap) {
    if (afterMap.has(key)) continue;
    const context = `${beforeItem.title} · ${beforeItem.driver}`;
    for (const stop of beforeItem.runs) {
      out.push({
        section: "dropoffWeekday",
        change: "removed",
        context,
        places: formatPlaces(stop.places),
        fromTime: stop.time,
      });
    }
  }
}

/**
 * Structural diff of two school schedules (original vs correction).
 * Ignores sourceUrl / fetchedAt / title; reports periodLabel when it differs.
 */
export function diffSchedules(
  original: Schedule,
  modified: Schedule,
): ScheduleDiffItem[] {
  const out: ScheduleDiffItem[] = [];

  const periodBefore = original.periodLabel.trim();
  const periodAfter = modified.periodLabel.trim();
  if (periodBefore !== periodAfter) {
    out.push({
      section: "meta",
      change: "time_changed",
      context: "Okres rozkładu",
      places: [],
      fromTime: periodBefore || "—",
      toTime: periodAfter || "—",
    });
  }

  diffPickups(original.pickups, modified.pickups, out);
  diffDayDropoffs(original.dropoffsByDate, modified.dropoffsByDate, out);
  diffWeekdayDropoffs(
    original.dropoffsWeekday,
    modified.dropoffsWeekday,
    out,
  );

  return out;
}
