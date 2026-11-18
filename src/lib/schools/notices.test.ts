import { describe, expect, it } from "vitest";
import {
  findActiveBlockingNoticeForDate,
  findBannerNoticesForDate,
  findNoticesForDate,
  formatPublicNoticeSpan,
  parsePublicNotices,
  publicNoticeBlocksSchedule,
  publicNoticeCoversDate,
} from "./notices";
import type { PublicNotice } from "./types";

const baseNotice: PublicNotice = {
  id: "schedule_notice_1",
  schoolId: "sp1",
  dateFrom: "2026-11-16",
  dateTo: "2026-11-20",
  kind: "info",
  title: "Komunikat",
  message: "Treść komunikatu",
  blocksSchedule: false,
};

describe("parsePublicNotices", () => {
  it("parses a valid notices list", () => {
    const parsed = parsePublicNotices([
      {
        ...baseNotice,
        kind: "urgent",
        blocksSchedule: true,
      },
    ]);
    expect(parsed).toEqual([
      {
        ...baseNotice,
        kind: "urgent",
        blocksSchedule: true,
      },
    ]);
  });

  it("rejects invalid shapes", () => {
    expect(parsePublicNotices(null)).toBeNull();
    expect(parsePublicNotices([{ ...baseNotice, kind: "nope" }])).toBeNull();
    expect(
      parsePublicNotices([{ ...baseNotice, dateFrom: "16.11.2026" }]),
    ).toBeNull();
    expect(
      parsePublicNotices([{ ...baseNotice, blocksSchedule: "yes" }]),
    ).toBeNull();
  });
});

describe("date and blocksSchedule helpers", () => {
  it("covers inclusive date range", () => {
    expect(publicNoticeCoversDate(baseNotice, "2026-11-16")).toBe(true);
    expect(publicNoticeCoversDate(baseNotice, "2026-11-18")).toBe(true);
    expect(publicNoticeCoversDate(baseNotice, "2026-11-20")).toBe(true);
    expect(publicNoticeCoversDate(baseNotice, "2026-11-15")).toBe(false);
    expect(publicNoticeCoversDate(baseNotice, "2026-11-21")).toBe(false);
  });

  it("treats missing blocksSchedule as blocking", () => {
    expect(
      publicNoticeBlocksSchedule({ blocksSchedule: undefined as never }),
    ).toBe(true);
    expect(publicNoticeBlocksSchedule({ blocksSchedule: false })).toBe(false);
    expect(publicNoticeBlocksSchedule({ blocksSchedule: true })).toBe(true);
  });

  it("finds notices for a day and picks blocking vs banners", () => {
    const notices: PublicNotice[] = [
      { ...baseNotice, id: "a", blocksSchedule: false, title: "Info" },
      {
        ...baseNotice,
        id: "b",
        kind: "urgent",
        blocksSchedule: true,
        title: "Blokada",
      },
      {
        ...baseNotice,
        id: "c",
        dateFrom: "2026-11-23",
        dateTo: "2026-11-23",
        title: "Później",
      },
    ];

    expect(findNoticesForDate(notices, "2026-11-18").map((n) => n.id)).toEqual([
      "a",
      "b",
    ]);
    expect(findActiveBlockingNoticeForDate(notices, "2026-11-18")?.id).toBe(
      "b",
    );
    expect(findBannerNoticesForDate(notices, "2026-11-18").map((n) => n.id)).toEqual(
      ["a"],
    );
    expect(findActiveBlockingNoticeForDate(notices, "2026-11-23")).toBeNull();
    expect(findBannerNoticesForDate(notices, "2026-11-23").map((n) => n.id)).toEqual(
      ["c"],
    );
  });

  it("formats a date span in Polish", () => {
    expect(formatPublicNoticeSpan("2026-11-16", "2026-11-16")).toMatch(/16/);
    expect(formatPublicNoticeSpan("2026-11-16", "2026-11-20")).toContain("–");
  });
});
