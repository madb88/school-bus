import {
  accountPlanLabel,
  fromAccountPlan,
  type AccountPlan,
} from "@/lib/child-schedule/account-plan";
import { getDayTimes } from "@/lib/child-schedule/match";
import {
  DEFAULT_LESSON_MATCH_WINDOW_MIN,
  effectiveLessonMatchWindowMin,
} from "@/lib/child-schedule/match-window";
import type { ChildLessonPlan } from "@/lib/child-schedule/types";
import {
  buildBestTodayRecommendation,
  type BestTodayRecommendation,
} from "@/lib/dowozy/best-today";
import { filterSchedule } from "@/lib/dowozy/filter-schedule";
import {
  getWarsawParts,
  listUpcomingSchoolDays,
  toAbsoluteYmd,
  type AbsoluteYmd,
} from "@/lib/dowozy/schedule-dates";
import type { Schedule } from "@/lib/dowozy/types";
import { buildMergedTimeline } from "@/lib/mzk/merge-timeline";

export type OfflineScheduleTrip = {
  time: string;
  places: string;
  context: string;
};

export type OfflinePersonalizedSchedule = {
  dayLabel: string;
  dayYmd: AbsoluteYmd;
  showingNextSchoolDay: boolean;
  planLabel: string;
  place: string;
  lessonStart: string | null;
  lessonEnd: string | null;
  best: BestTodayRecommendation | null;
  pickups: OfflineScheduleTrip[];
  dropoffs: OfflineScheduleTrip[];
};

export type OfflinePersonalizedResult =
  | { ok: true; view: OfflinePersonalizedSchedule }
  | { ok: false; reason: "no-plan" | "no-day" };

function resolveLessonPlan(
  accountPlans: AccountPlan[],
  selectedPlanId: string | null,
  localPlan: ChildLessonPlan | null,
): { plan: ChildLessonPlan; label: string } | null {
  if (accountPlans.length > 0) {
    const selected =
      (selectedPlanId
        ? accountPlans.find((plan) => plan.id === selectedPlanId)
        : null) ?? accountPlans[0]!;
    const index = Math.max(0, accountPlans.indexOf(selected));
    return {
      plan: fromAccountPlan(selected),
      label: accountPlanLabel(selected, index),
    };
  }

  if (localPlan?.place?.trim()) {
    return {
      plan: localPlan,
      label: localPlan.place.trim(),
    };
  }

  return null;
}

function tripsFromTimeline(
  entries: ReturnType<typeof buildMergedTimeline>["pickups"],
): OfflineScheduleTrip[] {
  const out: OfflineScheduleTrip[] = [];
  for (const entry of entries) {
    if (entry.kind !== "school") continue;
    out.push({
      time: entry.time,
      places: entry.places.join(", "),
      context: entry.context,
    });
  }
  return out;
}

/**
 * Locked offline view: next school day, lesson match on, school source only.
 */
export function buildOfflinePersonalizedSchedule(options: {
  schedule: Schedule;
  accountPlans: AccountPlan[];
  selectedPlanId?: string | null;
  localPlan?: ChildLessonPlan | null;
  windowMin?: number;
  windowEnabled?: boolean;
  now?: Date;
}): OfflinePersonalizedResult {
  const now = options.now ?? new Date();
  const resolved = resolveLessonPlan(
    options.accountPlans,
    options.selectedPlanId ?? null,
    options.localPlan ?? null,
  );
  if (!resolved) return { ok: false, reason: "no-plan" };
  const place = resolved.plan.place?.trim();
  if (!place) return { ok: false, reason: "no-plan" };

  const schoolDays = listUpcomingSchoolDays(now, 1);
  const day = schoolDays[0];
  if (!day) return { ok: false, reason: "no-day" };

  const todayYmd = toAbsoluteYmd(getWarsawParts(now));
  const showingNextSchoolDay = day.ymd !== todayYmd;

  const dayTimes = getDayTimes(resolved.plan, day.weekday);
  const lessonStart = dayTimes?.start?.trim() || null;
  const lessonEnd = dayTimes?.end?.trim() || null;
  const windowMin = effectiveLessonMatchWindowMin(
    options.windowMin ?? DEFAULT_LESSON_MATCH_WINDOW_MIN,
    options.windowEnabled ?? true,
  );

  const filtered = filterSchedule(options.schedule, {
    place,
    direction: "all",
    dateFilter: day.ymd,
    now,
    lessonPlan: resolved.plan,
    matchLessonPlan: true,
    lessonMatchWindowMin: windowMin,
  });

  const timeline = buildMergedTimeline({
    schedule: filtered,
    mzkPickups: [],
    mzkDropoffs: [],
    direction: "all",
  });

  const best = buildBestTodayRecommendation({
    schedule: options.schedule,
    place,
    dateFilter: day.ymd,
    now,
    lessonPlan: resolved.plan,
    windowMin,
    sourceMode: "school",
    lessonStart,
    lessonEnd,
  });

  return {
    ok: true,
    view: {
      dayLabel: day.label,
      dayYmd: day.ymd,
      showingNextSchoolDay,
      planLabel: resolved.label,
      place,
      lessonStart,
      lessonEnd,
      best,
      pickups: tripsFromTimeline(timeline.pickups),
      dropoffs: tripsFromTimeline(timeline.dropoffs),
    },
  };
}
