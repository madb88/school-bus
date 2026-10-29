import { describe, expect, it } from "vitest";
import type { AccountPlan } from "@/lib/child-schedule/account-plan";
import type { Schedule } from "@/lib/dowozy/types";
import { buildOfflinePersonalizedSchedule } from "./personalized-schedule";

const schedule: Schedule = {
  title: "Test",
  periodLabel: "2026",
  fetchedAt: "2026-10-27T10:00:00.000Z",
  sourceUrl: "https://example.test",
  pickups: [
    {
      name: "Kierowca A",
      kind: "driver",
      courses: [
        {
          label: "Kurs 1",
          stops: [
            { time: "07:10", places: ["Zatonie"] },
            { time: "07:40", places: ["Szkoła"] },
          ],
        },
      ],
    },
  ],
  dropoffsByDate: [],
  dropoffsWeekday: [
    {
      title: "Odwozy",
      driver: "Kierowca A",
      runs: [{ time: "14:20", places: ["Zatonie"] }],
    },
  ],
};

const plan: AccountPlan = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  place: "Zatonie",
  name: "Ania",
  days: {
    "1": { start: "08:00", end: "14:00" },
    "2": { start: "08:00", end: "14:00" },
    "3": { start: "08:00", end: "14:00" },
    "4": { start: "08:00", end: "14:00" },
    "5": { start: "08:00", end: "14:00" },
  },
};

describe("buildOfflinePersonalizedSchedule", () => {
  it("returns no-plan without account or local plan", () => {
    expect(
      buildOfflinePersonalizedSchedule({
        schedule,
        accountPlans: [],
        localPlan: { place: null, days: {} },
        now: new Date("2026-10-27T10:00:00+01:00"),
      }),
    ).toEqual({ ok: false, reason: "no-plan" });
  });

  it("builds a matched school-day view from an account plan", () => {
    const result = buildOfflinePersonalizedSchedule({
      schedule,
      accountPlans: [plan],
      selectedPlanId: plan.id,
      now: new Date("2026-10-27T10:00:00+01:00"), // Tuesday? Oct 27 2026 is Tuesday
      windowMin: 240,
      windowEnabled: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.view.place).toBe("Zatonie");
    expect(result.view.planLabel).toBe("Ania");
    expect(result.view.dayYmd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("uses the next school day on weekend", () => {
    const result = buildOfflinePersonalizedSchedule({
      schedule,
      accountPlans: [plan],
      now: new Date("2026-10-24T12:00:00+02:00"), // Saturday
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.view.showingNextSchoolDay).toBe(true);
    expect(result.view.dayYmd).toBe("2026-10-26"); // Monday
  });
});
