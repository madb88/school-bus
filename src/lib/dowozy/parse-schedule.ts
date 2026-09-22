import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type {
  Course,
  DayDropoff,
  DriverBlock,
  Schedule,
  Stop,
  WeekdayDropoff,
} from "./types";
import { DOWOZY_SOURCE_URL } from "./types";

type Section = "pickups" | "dropoffsByDate" | "dropoffsWeekday";

function normalizeText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripLeadingEmoji(value: string): string {
  return normalizeText(
    value.replace(
      /^(?:\p{Extended_Pictographic}|\uFE0F|\u200D|\s)+/gu,
      "",
    ),
  );
}

function parseStopLine(raw: string): Stop | null {
  const text = normalizeText(raw);
  const match = text.match(/^(\d{1,2}:\d{2})\s*[–-]\s*(.+)$/u);
  if (!match) return null;

  const time = match[1];
  const places = match[2]
    .split(",")
    .map((place) => normalizeText(place))
    .filter(Boolean);

  if (!places.length) return null;
  return { time, places };
}

function parseCourseLabel(raw: string): { label: string; note?: string } | null {
  const text = normalizeText(raw);
  if (!/kurs/i.test(text)) return null;

  const dashMatch = text.match(/^(.*?)\s*[–-]\s*(.+)$/u);
  if (dashMatch && /kurs/i.test(dashMatch[1])) {
    return {
      label: normalizeText(dashMatch[1]),
      note: normalizeText(dashMatch[2]),
    };
  }

  return { label: text };
}

function isVehicleName(name: string): boolean {
  return /^bus$/i.test(name);
}

function extractPeriodLabel(title: string, fallbackHtml: string): string {
  const fromTitle = title.match(
    /(styczeń|luty|marzec|kwiecień|maj|czerwiec|lipiec|sierpień|wrzesień|październik|listopad|grudzień)\s+\d{4}(?:\s*r\.?)?/i,
  );
  if (fromTitle) return normalizeText(fromTitle[0]);

  const fromBody = fallbackHtml.match(
    /(styczeń|luty|marzec|kwiecień|maj|czerwiec|lipiec|sierpień|wrzesień|październik|listopad|grudzień)\s+\d{4}(?:\s*r\.?)?/i,
  );
  return fromBody ? normalizeText(fromBody[0]) : "";
}

function readStopsFromList($: cheerio.CheerioAPI, ul: Element): Stop[] {
  const stops: Stop[] = [];
  $(ul)
    .children("li")
    .each((_, li) => {
      const stop = parseStopLine($(li).text());
      if (stop) stops.push(stop);
    });
  return stops;
}

export function parseSchedule(
  html: string,
  options?: { sourceUrl?: string; fetchedAt?: string },
): Schedule {
  const $ = cheerio.load(html);
  const root =
    $(".et_pb_text_inner")
      .filter((_, el) => /DOWOZY/i.test($(el).text()))
      .first()
      .get(0) ??
    $(".et_pb_text_inner").first().get(0) ??
    $("body").get(0);

  if (!root) {
    throw new Error("Could not find schedule content in HTML");
  }

  const pickups: DriverBlock[] = [];
  const dropoffsByDate: DayDropoff[] = [];
  const dropoffsWeekday: WeekdayDropoff[] = [];

  let section: Section = "pickups";
  let weekdayTitle = "";
  let currentPickup: DriverBlock | null = null;
  let resumePickup: DriverBlock | null = null;
  let currentCourse: Course | null = null;
  let currentDayLabel = "";
  let currentDropoffDriver = "";
  let currentWeekdayDriver = "";

  const title = normalizeText($("h1", root).last().text() || $("h1").last().text());
  const periodLabel = extractPeriodLabel(title, $(root).text());

  const children = $(root).children().toArray() as Element[];

  for (const node of children) {
    const tag = node.tagName?.toLowerCase();
    if (!tag) continue;

    if (tag === "h1" || tag === "hr" || (tag === "h3" && !normalizeText($(node).text()))) {
      continue;
    }

    if (tag === "h2") {
      const heading = stripLeadingEmoji($(node).text());
      if (/odwozy/i.test(heading) && /poniedziałek/i.test(heading)) {
        section = "dropoffsWeekday";
        weekdayTitle = heading;
        currentCourse = null;
        continue;
      }
      if (/odwozy/i.test(heading)) {
        section = "dropoffsByDate";
        currentCourse = null;
        continue;
      }
      if (/dowozy/i.test(heading)) {
        section = "pickups";
        currentCourse = null;
        continue;
      }
    }

    if (tag === "h3") {
      const heading = stripLeadingEmoji($(node).text());
      if (section === "pickups" && /dowozy/i.test(heading)) {
        continue;
      }
      if (section === "dropoffsByDate") {
        currentDayLabel = heading;
        currentDropoffDriver = "";
        continue;
      }
      if (section === "dropoffsWeekday") {
        currentWeekdayDriver = heading;
        continue;
      }
    }

    if (tag === "h4" && section === "pickups") {
      const name = stripLeadingEmoji($(node).text());
      if (!name) continue;

      if (isVehicleName(name)) {
        resumePickup = currentPickup;
        currentPickup = { name, kind: "vehicle", courses: [] };
        pickups.push(currentPickup);
        currentCourse = {
          label: "kurs",
          stops: [],
        };
        currentPickup.courses.push(currentCourse);
        continue;
      }

      currentPickup = { name, kind: "driver", courses: [] };
      pickups.push(currentPickup);
      resumePickup = null;
      currentCourse = null;
      continue;
    }

    if (tag === "p") {
      const strongText = normalizeText($(node).find("strong").first().text());
      const fullText = normalizeText($(node).text());
      const labelSource = strongText || fullText;
      const course = parseCourseLabel(labelSource);

      if (course && section === "pickups") {
        if (currentPickup?.kind === "vehicle" && resumePickup) {
          currentPickup = resumePickup;
          resumePickup = null;
        }
        if (!currentPickup) {
          currentPickup = {
            name: "Nieznany kierowca",
            kind: "driver",
            courses: [],
          };
          pickups.push(currentPickup);
        }
        currentCourse = { label: course.label, note: course.note, stops: [] };
        currentPickup.courses.push(currentCourse);
        continue;
      }

      if (section === "dropoffsByDate" && strongText) {
        currentDropoffDriver = stripLeadingEmoji(strongText);
        continue;
      }
    }

    if (tag === "ul") {
      const stops = readStopsFromList($, node);

      if (section === "pickups") {
        if (!currentPickup) continue;
        if (!currentCourse) {
          currentCourse = { label: "kurs", stops: [] };
          currentPickup.courses.push(currentCourse);
        }
        currentCourse.stops.push(...stops);
        continue;
      }

      if (section === "dropoffsByDate") {
        if (!currentDayLabel) continue;
        dropoffsByDate.push({
          dateLabel: currentDayLabel,
          driver: currentDropoffDriver || "Nieznany kierowca",
          runs: stops,
        });
        continue;
      }

      if (section === "dropoffsWeekday") {
        dropoffsWeekday.push({
          title: weekdayTitle || "Odwozy – poniedziałek–piątek",
          driver: currentWeekdayDriver || "Nieznany kierowca",
          runs: stops,
        });
      }
    }
  }

  if (!pickups.length && !dropoffsByDate.length && !dropoffsWeekday.length) {
    throw new Error("Parsed schedule is empty — markup may have changed");
  }

  return {
    sourceUrl: options?.sourceUrl ?? DOWOZY_SOURCE_URL,
    fetchedAt: options?.fetchedAt ?? new Date().toISOString(),
    title: title || "Rozkład jazdy autobusów szkolnych",
    periodLabel,
    pickups,
    dropoffsByDate,
    dropoffsWeekday,
  };
}
