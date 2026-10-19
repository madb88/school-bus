import { formatTimeInput } from "./match";
import type { ChildLessonPlan, WeekdayKey } from "./types";

export type AccountWeekdayKey = "1" | "2" | "3" | "4" | "5";

export type AccountDayTimes = {
  start: string;
  end: string;
};

export type AccountPlan = {
  /** Stable server-minted UUID; omitted for unsaved new plans. */
  id?: string;
  place: string;
  /** Optional display name; omitted when empty (backend + Mongo). */
  name?: string;
  days: Partial<Record<AccountWeekdayKey, AccountDayTimes>>;
};

export type ToAccountPlanOptions = {
  name?: string | null;
  /** When editing, echo the existing plan's id so push links survive. */
  existing?: AccountPlan | null;
};

export const ACCOUNT_PLAN_NAME_MAX = 80;

/** UUID (any version) as minted/validated by the backend. */
const ACCOUNT_PLAN_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ACCOUNT_WEEKDAY_KEYS: AccountWeekdayKey[] = ["1", "2", "3", "4", "5"];

const TIME_RE = /^\d{2}:\d{2}$/;

export function isAccountPlanId(value: unknown): value is string {
  return typeof value === "string" && ACCOUNT_PLAN_ID_RE.test(value);
}

function isAccountWeekdayKey(value: string): value is AccountWeekdayKey {
  return (
    value === "1" ||
    value === "2" ||
    value === "3" ||
    value === "4" ||
    value === "5"
  );
}

function isAccountDayTimes(value: unknown): value is AccountDayTimes {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.start === "string" &&
    TIME_RE.test(record.start) &&
    typeof record.end === "string" &&
    TIME_RE.test(record.end)
  );
}

/** Trim and validate optional name. `null` = field absent/empty; `false` = invalid (> max). */
export function normalizeAccountPlanName(value: unknown): string | null | false {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > ACCOUNT_PLAN_NAME_MAX) return false;
  return trimmed;
}

export function accountPlanLabel(plan: AccountPlan, index: number): string {
  const name = plan.name?.trim();
  if (name) return name;
  const place = plan.place?.trim();
  if (place) return place;
  return `Plan ${index + 1}`;
}

export function parseAccountPlan(value: unknown): AccountPlan | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.place !== "string" || !record.place.trim()) return null;
  if (!record.days || typeof record.days !== "object" || Array.isArray(record.days)) {
    return null;
  }

  const name = normalizeAccountPlanName(record.name);
  if (name === false) return null;

  if (record.id !== undefined && record.id !== null) {
    if (!isAccountPlanId(record.id)) return null;
  }

  const rawDays = record.days as Record<string, unknown>;
  const days: AccountPlan["days"] = {};
  for (const [key, day] of Object.entries(rawDays)) {
    if (!isAccountWeekdayKey(key)) continue;
    if (!isAccountDayTimes(day)) continue;
    days[key] = { start: day.start, end: day.end };
  }
  if (Object.keys(days).length === 0) return null;

  const plan: AccountPlan = { place: record.place.trim(), days };
  if (isAccountPlanId(record.id)) plan.id = record.id;
  if (name) plan.name = name;
  return plan;
}

/** Accepts `[]` or a list of valid plans. `null` when the shape is wrong. */
export function parseAccountPlans(value: unknown): AccountPlan[] | null {
  if (!Array.isArray(value)) return null;
  const plans: AccountPlan[] = [];
  for (const item of value) {
    const plan = parseAccountPlan(item);
    if (!plan) return null;
    plans.push(plan);
  }
  return plans;
}

/**
 * Serialize for PATCH: omit empty `name`; echo `id` when present (never mint client-side).
 */
export function serializeAccountPlan(plan: AccountPlan): AccountPlan {
  const name = normalizeAccountPlanName(plan.name);
  const out: AccountPlan = { place: plan.place.trim(), days: plan.days };
  if (isAccountPlanId(plan.id)) out.id = plan.id;
  if (name) out.name = name;
  return out;
}

export function serializeAccountPlans(plans: AccountPlan[]): AccountPlan[] {
  return plans.map(serializeAccountPlan);
}

export type ToAccountPlanResult = {
  plan: AccountPlan | null;
  /** Weekdays that had a start but no end (dropped for the account). */
  droppedDaysWithoutEnd: WeekdayKey[];
};

/**
 * Convert a device lesson plan for the account API.
 * Returns `plan: null` when place is missing or no day has both start and end.
 * Pass `existing` so edits keep a stable `id` for push links.
 */
export function toAccountPlan(
  plan: ChildLessonPlan,
  opts?: ToAccountPlanOptions | string | null,
): ToAccountPlanResult {
  const options: ToAccountPlanOptions =
    typeof opts === "string" || opts === null || opts === undefined
      ? { name: opts }
      : opts;

  const droppedDaysWithoutEnd: WeekdayKey[] = [];
  if (!plan.place?.trim()) {
    return { plan: null, droppedDaysWithoutEnd };
  }

  const days: AccountPlan["days"] = {};
  for (const key of [1, 2, 3, 4, 5] as WeekdayKey[]) {
    const day = plan.days[key];
    if (!day?.start) continue;
    if (!day.end) {
      droppedDaysWithoutEnd.push(key);
      continue;
    }
    const start = formatTimeInput(day.start);
    const end = formatTimeInput(day.end);
    if (!TIME_RE.test(start) || !TIME_RE.test(end)) continue;
    days[String(key) as AccountWeekdayKey] = { start, end };
  }

  if (Object.keys(days).length === 0) {
    return { plan: null, droppedDaysWithoutEnd };
  }

  const normalizedName = normalizeAccountPlanName(options.name ?? null);
  const account: AccountPlan = { place: plan.place.trim(), days };
  if (isAccountPlanId(options.existing?.id)) account.id = options.existing.id;
  if (normalizedName) account.name = normalizedName;

  return {
    plan: account,
    droppedDaysWithoutEnd,
  };
}

export function fromAccountPlan(plan: AccountPlan): ChildLessonPlan {
  const days: ChildLessonPlan["days"] = {};
  for (const key of ACCOUNT_WEEKDAY_KEYS) {
    const day = plan.days[key];
    if (!day) continue;
    days[Number(key) as WeekdayKey] = { start: day.start, end: day.end };
  }
  return { place: plan.place, days };
}
