import type { PublicNotice, PublicNoticeKind } from "./types";
import { PUBLIC_NOTICE_KINDS } from "./types";

export const PUBLIC_NOTICE_KIND_LABELS: Record<PublicNoticeKind, string> = {
  info: "Informacja",
  organizational: "Zmiana organizacyjna",
  urgent: "Pilne",
};

export function isPublicNoticeKind(value: unknown): value is PublicNoticeKind {
  return (
    typeof value === "string" &&
    (PUBLIC_NOTICE_KINDS as readonly string[]).includes(value)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isPublicNotice(value: unknown): value is PublicNotice {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || !value.id.trim()) return false;
  if (typeof value.schoolId !== "string" || !value.schoolId.trim()) {
    return false;
  }
  if (typeof value.dateFrom !== "string" || !ISO_DATE_RE.test(value.dateFrom)) {
    return false;
  }
  if (typeof value.dateTo !== "string" || !ISO_DATE_RE.test(value.dateTo)) {
    return false;
  }
  if (!isPublicNoticeKind(value.kind)) return false;
  if (typeof value.title !== "string" || !value.title.trim()) return false;
  if (typeof value.message !== "string" || !value.message.trim()) return false;
  if (typeof value.blocksSchedule !== "boolean") return false;
  return true;
}

export function parsePublicNotices(value: unknown): PublicNotice[] | null {
  if (!Array.isArray(value)) return null;
  const out: PublicNotice[] = [];
  for (const item of value) {
    if (!isPublicNotice(item)) return null;
    out.push({
      id: item.id.trim(),
      schoolId: item.schoolId.trim(),
      dateFrom: item.dateFrom,
      dateTo: item.dateTo,
      kind: item.kind,
      title: item.title.trim(),
      message: item.message.trim(),
      blocksSchedule: item.blocksSchedule,
    });
  }
  return out;
}

/** Legacy omit → treat as blocking (matches dashboard). */
export function publicNoticeBlocksSchedule(
  notice: Pick<PublicNotice, "blocksSchedule">,
): boolean {
  return notice.blocksSchedule !== false;
}

export function publicNoticeCoversDate(
  notice: Pick<PublicNotice, "dateFrom" | "dateTo">,
  date: string,
): boolean {
  return notice.dateFrom <= date && date <= notice.dateTo;
}

export function findNoticesForDate(
  notices: PublicNotice[],
  date: string,
): PublicNotice[] {
  return notices.filter((notice) => publicNoticeCoversDate(notice, date));
}

export function findActiveBlockingNoticeForDate(
  notices: PublicNotice[],
  date: string,
): PublicNotice | null {
  return (
    notices.find(
      (notice) =>
        publicNoticeBlocksSchedule(notice) &&
        publicNoticeCoversDate(notice, date),
    ) ?? null
  );
}

export function findBannerNoticesForDate(
  notices: PublicNotice[],
  date: string,
): PublicNotice[] {
  return findNoticesForDate(notices, date).filter(
    (notice) => !publicNoticeBlocksSchedule(notice),
  );
}

export function formatPublicNoticeSpan(
  dateFrom: string,
  dateTo: string,
): string {
  const from = formatPublicNoticeDate(dateFrom);
  const to = formatPublicNoticeDate(dateTo);
  if (!from || !to) return dateFrom === dateTo ? dateFrom : `${dateFrom} – ${dateTo}`;
  return dateFrom === dateTo ? from : `${from} – ${to}`;
}

export function formatPublicNoticeDate(value: string): string | null {
  if (!ISO_DATE_RE.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  try {
    return new Intl.DateTimeFormat("pl-PL", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  } catch {
    return null;
  }
}
