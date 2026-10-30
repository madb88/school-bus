"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { toast } from "sonner";
import { cn } from "cn";
import {
  AccountPlansSection,
  PlanNameSection,
} from "@/components/lesson-plan/account-plans-section";
import {
  LessonPlanDeleteSheet,
  LessonPlanInlineActions,
  LessonPlanLocalUpsell,
  LessonPlanPrintOutputs,
  LessonPlanPrintSection,
  LessonPlanStickySave,
} from "@/components/lesson-plan/form-actions";
import { HoursSection } from "@/components/lesson-plan/hours-section";
import { PlaceSection } from "@/components/lesson-plan/place-section";
import type { LessonPlanPrintMode } from "@/components/lesson-plan-print";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics/events";
import { MAX_ACCOUNT_PLANS } from "@/lib/billing/constants";
import {
  accountPlanLabel,
  fromAccountPlan,
  isAccountPlanId,
  toAccountPlan,
  type AccountPlan,
} from "@/lib/child-schedule/account-plan";
import { accountPlanMatchesLocal } from "@/lib/child-schedule/plans-equal";
import {
  indexOfPlanId,
  loadSelectedPlanId,
  reconcileSelectedPlanId,
  saveSelectedPlanId,
} from "@/lib/child-schedule/selected-plan";
import {
  clearLessonPlan,
  hasConfiguredLessons,
  loadLessonPlan,
  saveLessonPlan,
} from "@/lib/child-schedule/storage";
import {
  dayHasInvalidTimeRange,
  formatTimeInput,
} from "@/lib/child-schedule/match";
import { savePreferredPlace } from "@/lib/child-schedule/preferred-place";
import {
  EMPTY_LESSON_PLAN,
  WEEKDAY_OPTIONS,
  type ChildLessonPlan,
  type WeekdayKey,
} from "@/lib/child-schedule/types";
import type { Schedule } from "@/lib/dowozy/types";
import { useLessonPlan } from "@/lib/child-schedule/use-lesson-plan";
import { hasConfiguredMzkRoute } from "@/lib/mzk/route-storage";
import type { MzkSchedule } from "@/lib/mzk/types";
import { useMzkRoutePreference } from "@/lib/mzk/use-mzk-route";
import { disablePush, getPushStatus, setPushPlans } from "@/lib/push/browser";

type LessonPlanFormProps = {
  places: string[];
  schedule: Schedule;
  mzkSchedule: MzkSchedule | null;
  mode?: "local" | "account";
  initialPlans?: AccountPlan[];
  loggedIn?: boolean;
  trialEnded?: boolean;
};

function mirrorPlanToDevice(plan: ChildLessonPlan) {
  saveLessonPlan(plan);
  if (plan.place) savePreferredPlace(plan.place);
}

/** Drop deleted plan ids from this device's push set (or disable when none remain). */
async function syncPushAfterPlanSave(
  plans: AccountPlan[],
  opts?: { toastOnChange?: boolean },
): Promise<void> {
  const remainingIds = plans
    .map((plan) => plan.id)
    .filter((id): id is string => isAccountPlanId(id));

  const status = await getPushStatus();
  if (!status.subscribed) return;

  const next = status.planIds.filter((id) => remainingIds.includes(id));
  if (next.length === 0) {
    await disablePush();
    if (opts?.toastOnChange) {
      toast.message("Powiadomienia wyłączono (usunięto plan)");
    }
    return;
  }

  if (next.length === status.planIds.length) return;

  const result = await setPushPlans(next);
  if (!result.ok) return;
  if (opts?.toastOnChange) {
    toast.message("Zaktualizowano powiadomienia (usunięto plan)");
  }
}

function normalizeLocalPlan(source: ChildLessonPlan): ChildLessonPlan {
  const normalized: ChildLessonPlan = { place: source.place, days: {} };
  for (const [key, day] of Object.entries(source.days)) {
    if (!day?.start) continue;
    normalized.days[Number(key) as WeekdayKey] = {
      start: formatTimeInput(day.start),
      ...(day.end ? { end: formatTimeInput(day.end) } : {}),
    };
  }
  return normalized;
}

type LessonPlanFormIssues = {
  place: boolean;
  invalidDayKeys: WeekdayKey[];
  noCompleteDay: boolean;
  messages: string[];
};

function collectLessonPlanFormIssues(
  source: ChildLessonPlan,
  mode: "local" | "account",
): LessonPlanFormIssues {
  const messages: string[] = [];
  const place = !source.place?.trim();
  if (place) messages.push("Wybierz przystanek.");

  const invalidDayKeys: WeekdayKey[] = [];
  const invalidLabels: string[] = [];
  for (const { key, label } of WEEKDAY_OPTIONS) {
    const day = source.days[key];
    if (!day?.start || !day.end) continue;
    if (dayHasInvalidTimeRange(day.start, day.end)) {
      invalidDayKeys.push(key);
      invalidLabels.push(label);
    }
  }
  if (invalidLabels.length > 0) {
    messages.push(
      `Koniec lekcji musi być późniejszy niż start (${invalidLabels.join(", ")}).`,
    );
  }

  let noCompleteDay = false;
  if (mode === "account" && !place) {
    const hasCompleteDay = WEEKDAY_OPTIONS.some(({ key }) => {
      const day = source.days[key];
      return Boolean(
        day?.start &&
          day.end &&
          !dayHasInvalidTimeRange(day.start, day.end),
      );
    });
    if (!hasCompleteDay) {
      noCompleteDay = true;
      messages.push(
        "Uzupełnij przynajmniej jeden dzień z godziną początku i końca.",
      );
    }
  }

  return { place, invalidDayKeys, noCompleteDay, messages };
}

export function LessonPlanForm({
  places,
  schedule,
  mzkSchedule,
  mode = "local",
  initialPlans = [],
  loggedIn = false,
  trialEnded = false,
}: LessonPlanFormProps) {
  const router = useRouter();
  const stored = useLessonPlan();
  const mzkRoute = useMzkRoutePreference();
  const [accountPlans, setAccountPlans] = useState<AccountPlan[]>(initialPlans);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [planName, setPlanName] = useState(() => initialPlans[0]?.name ?? "");
  const [draft, setDraft] = useState<ChildLessonPlan | null>(null);
  const [pending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [placeInvalid, setPlaceInvalid] = useState(false);
  const [hoursSectionInvalid, setHoursSectionInvalid] = useState(false);
  const [printMode, setPrintMode] = useState<LessonPlanPrintMode>("school");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const accountBootstrapped = useRef(false);
  const previousSelectedIndexRef = useRef(0);
  const planNameInputRef = useRef<HTMLInputElement>(null);
  // Server=false, client=true — avoids setState-in-effect for the sticky portal.
  const stickySaveMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const accountBase =
    mode === "account" && accountPlans[selectedIndex]
      ? fromAccountPlan(accountPlans[selectedIndex]!)
      : null;
  const plan = draft ?? accountBase ?? stored;

  const isDraftingNewPlan =
    mode === "account" && selectedIndex >= accountPlans.length;
  const daysMissingEnd = WEEKDAY_OPTIONS.filter(({ key }) => {
    const day = plan.days[key];
    return Boolean(day?.start && !day.end);
  });
  const daysInvalidEnd = WEEKDAY_OPTIONS.filter(({ key }) => {
    const day = plan.days[key];
    return dayHasInvalidTimeRange(day?.start, day?.end);
  });

  useEffect(() => {
    if (mode !== "account" || accountBootstrapped.current) return;
    accountBootstrapped.current = true;

    const local = loadLessonPlan();

    async function bootstrap() {
      if (initialPlans.length === 0) {
        const { plan: imported } = toAccountPlan(local);
        if (!imported) {
          setAccountPlans([]);
          setSelectedIndex(0);
          saveSelectedPlanId(null);
          return;
        }
        const response = await fetch("/api/account/plans", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ plans: [imported] }),
        });
        if (!response.ok) return;
        const data = (await response.json().catch(() => null)) as {
          plans?: AccountPlan[];
        } | null;
        const saved = data?.plans ?? [imported];
        setAccountPlans(saved);
        const selectedId = saved[0]?.id ?? null;
        setSelectedIndex(0);
        setPlanName(saved[0]?.name ?? "");
        saveSelectedPlanId(selectedId);
        mirrorPlanToDevice(fromAccountPlan(saved[0]!));
        toast.success("Twój plan lekcji został zapisany na koncie");
        return;
      }

      const selectedId = loadSelectedPlanId(initialPlans);
      const index = indexOfPlanId(initialPlans, selectedId);
      setAccountPlans(initialPlans);
      setSelectedIndex(index);
      setPlanName(initialPlans[index]?.name ?? "");
      saveSelectedPlanId(selectedId);
      const selected = initialPlans[index]!;
      const localDiffers = !accountPlanMatchesLocal(selected, local);
      mirrorPlanToDevice(fromAccountPlan(selected));
      if (localDiffers && hasConfiguredLessons(local)) {
        toast.message("Wczytano plany z konta");
      }
    }

    void bootstrap();
  }, [mode, initialPlans]);

  function basePlan(): ChildLessonPlan {
    return draft ?? accountBase ?? stored;
  }

  function updateDay(key: WeekdayKey, field: "start" | "end", value: string) {
    setSaveError(null);
    setHoursSectionInvalid(false);
    setDraft((prev) => {
      const base = prev ?? accountBase ?? stored;
      const nextDays = { ...base.days };
      const current = nextDays[key] ?? { start: "" };

      if (field === "start") {
        if (!value) {
          delete nextDays[key];
        } else {
          nextDays[key] = {
            start: value,
            ...(current.end ? { end: current.end } : {}),
          };
        }
      } else {
        if (!current.start) return base;
        if (!value) {
          nextDays[key] = { start: current.start };
        } else {
          nextDays[key] = { start: current.start, end: value };
        }
      }

      return { ...base, days: nextDays };
    });
  }

  function selectAccountPlan(index: number) {
    if (index === selectedIndex) return;
    const current = basePlan();
    const existing = accountPlans[selectedIndex];
    const { plan: asAccount } = toAccountPlan(current, {
      name: planName,
      existing,
    });
    const nextPlans = [...accountPlans];
    if (asAccount && nextPlans[selectedIndex]) {
      nextPlans[selectedIndex] = asAccount;
    }
    setAccountPlans(nextPlans);
    setSelectedIndex(index);
    const next = nextPlans[index];
    if (next) {
      saveSelectedPlanId(next.id ?? null);
      setPlanName(next.name ?? "");
      const local = fromAccountPlan(next);
      setDraft(null);
      mirrorPlanToDevice(local);
    } else {
      saveSelectedPlanId(null);
      setPlanName("");
      setDraft({ ...EMPTY_LESSON_PLAN, days: {} });
    }
  }

  function focusPlanNameInput() {
    requestAnimationFrame(() => {
      const input = planNameInputRef.current;
      if (!input) return;
      input.focus();
      input.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function handleAddPlan() {
    if (accountPlans.length >= MAX_ACCOUNT_PLANS || isDraftingNewPlan) return;
    const current = basePlan();
    const existing = accountPlans[selectedIndex];
    const { plan: asAccount } = toAccountPlan(current, {
      name: planName,
      existing,
    });
    const nextPlans = [...accountPlans];
    if (asAccount) {
      if (nextPlans.length === 0) nextPlans.push(asAccount);
      else if (selectedIndex < nextPlans.length) {
        nextPlans[selectedIndex] = asAccount;
      }
    }
    if (nextPlans.length >= MAX_ACCOUNT_PLANS) {
      setAccountPlans(nextPlans);
      toast.message("Możesz zapisać najwyżej 5 planów");
      return;
    }
    previousSelectedIndexRef.current = selectedIndex;
    setAccountPlans(nextPlans);
    setSelectedIndex(nextPlans.length);
    setPlanName("");
    setDraft({ ...EMPTY_LESSON_PLAN, days: {} });
    setSaveError(null);
    focusPlanNameInput();
  }

  function handleCancelDraft() {
    if (!isDraftingNewPlan || accountPlans.length === 0) return;
    const index = Math.min(
      Math.max(previousSelectedIndexRef.current, 0),
      accountPlans.length - 1,
    );
    const next = accountPlans[index];
    setSelectedIndex(index);
    setPlanName(next?.name ?? "");
    setDraft(null);
    setSaveError(null);
    if (next?.id) {
      saveSelectedPlanId(next.id);
      mirrorPlanToDevice(fromAccountPlan(next));
    } else {
      saveSelectedPlanId(null);
    }
  }

  async function persistAccountPlans(
    nextPlans: AccountPlan[],
    preferredId: string | null,
    opts?: { toastPushChange?: boolean; preferredIndex?: number },
  ) {
    const response = await fetch("/api/account/plans", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plans: nextPlans }),
    });
    const data = (await response.json().catch(() => null)) as {
      plans?: AccountPlan[];
      error?: string;
    } | null;
    if (response.status === 403) {
      toast.error(data?.error ?? "Zapisywanie planów wymaga Planu Plus");
      router.refresh();
      return false;
    }
    if (!response.ok) {
      const message = data?.error ?? "Nie udało się zapisać planów na koncie.";
      setSaveError(message);
      toast.error(message);
      return false;
    }
    const saved = data?.plans ?? nextPlans;
    let selectedId = reconcileSelectedPlanId(saved, preferredId);
    // New plans have no id until the server mints one — pick by list index.
    if (
      !preferredId &&
      opts?.preferredIndex != null &&
      saved[opts.preferredIndex]?.id
    ) {
      selectedId = saved[opts.preferredIndex]!.id!;
    }
    const safeIndex = indexOfPlanId(saved, selectedId);
    setAccountPlans(saved);
    setSelectedIndex(safeIndex);
    setPlanName(saved[safeIndex]?.name ?? "");
    saveSelectedPlanId(selectedId);
    if (saved[safeIndex]) {
      mirrorPlanToDevice(fromAccountPlan(saved[safeIndex]!));
    } else {
      clearLessonPlan();
    }
    await syncPushAfterPlanSave(saved, {
      toastOnChange: opts?.toastPushChange,
    });
    setDraft(null);
    setSaveError(null);
    return true;
  }

  function handleSave() {
    startTransition(() => {
      void (async () => {
        const source = basePlan();
        const issues = collectLessonPlanFormIssues(source, mode);

        if (issues.messages.length > 0) {
          setPlaceInvalid(issues.place);
          setHoursSectionInvalid(
            issues.invalidDayKeys.length > 0 || issues.noCompleteDay,
          );
          const detail = issues.messages.join(" ");
          setSaveError(detail);
          toast.error("Błędne dane formularza", { description: detail });
          return;
        }

        setPlaceInvalid(false);
        setHoursSectionInvalid(false);
        const normalized = normalizeLocalPlan(source);

        if (mode === "local") {
          mirrorPlanToDevice(normalized);
          trackEvent(AnalyticsEvent.lessonPlanSaved, {
            day_count: Object.keys(normalized.days).length,
          });
          setDraft(null);
          setSaveError(null);
          const missingEnd = WEEKDAY_OPTIONS.filter(({ key }) => {
            const day = normalized.days[key];
            return Boolean(day?.start && !day.end);
          });
          if (missingEnd.length > 0) {
            toast.success("Plan lekcji zapisany", {
              description:
                "Bez godziny końca odwozy nie dopasują się do planu — uzupełnij koniec lekcji, gdy znasz godzinę.",
            });
          } else {
            toast.success("Plan lekcji zapisany");
          }
          return;
        }

        const existing =
          selectedIndex < accountPlans.length
            ? accountPlans[selectedIndex]
            : null;
        const { plan: asAccount, droppedDaysWithoutEnd } = toAccountPlan(
          normalized,
          { name: planName, existing },
        );
        if (!asAccount) {
          setHoursSectionInvalid(true);
          const message =
            "Uzupełnij przynajmniej jeden dzień z godziną początku i końca.";
          setSaveError(message);
          toast.error("Błędne dane formularza", { description: message });
          return;
        }

        const nextPlans = [...accountPlans];
        const isNew =
          selectedIndex >= nextPlans.length || nextPlans.length === 0;
        if (isNew) {
          nextPlans.push(asAccount);
        } else {
          nextPlans[selectedIndex] = asAccount;
        }

        const preferredId = asAccount.id ?? null;
        const preferredIndex = isNew ? nextPlans.length - 1 : selectedIndex;
        const ok = await persistAccountPlans(nextPlans, preferredId, {
          preferredIndex,
        });
        if (!ok) return;

        trackEvent(AnalyticsEvent.lessonPlanSaved, {
          day_count: Object.keys(asAccount.days).length,
        });

        if (droppedDaysWithoutEnd.length > 0) {
          toast.success("Plan lekcji zapisany na koncie", {
            description:
              "Dni bez godziny końca nie zapiszą się na koncie — uzupełnij koniec lekcji, gdy znasz godzinę.",
          });
        } else {
          toast.success("Plan lekcji zapisany na koncie");
        }
      })();
    });
  }

  function handleClear() {
    if (mode === "account") {
      setDeleteConfirmOpen(false);
      if (accountPlans.length <= 1) {
        startTransition(() => {
          void (async () => {
            const ok = await persistAccountPlans([], null, {
              toastPushChange: true,
            });
            if (!ok) return;
            setDraft({ ...EMPTY_LESSON_PLAN, days: {} });
            toast.success("Usunięto plany z konta");
          })();
        });
        return;
      }
      startTransition(() => {
        void (async () => {
          const removedId = accountPlans[selectedIndex]?.id ?? null;
          const nextPlans = accountPlans.filter((_, i) => i !== selectedIndex);
          const fallbackId =
            nextPlans[Math.min(selectedIndex, nextPlans.length - 1)]?.id ??
            null;
          const ok = await persistAccountPlans(nextPlans, fallbackId, {
            toastPushChange: Boolean(removedId),
          });
          if (!ok) return;
          toast.success("Usunięto plan");
        })();
      });
      return;
    }

    const cleared = { ...EMPTY_LESSON_PLAN, days: {} };
    clearLessonPlan();
    setDraft(cleared);
    setSaveError(null);
    setPlaceInvalid(false);
    setHoursSectionInvalid(false);
  }

  const deleteTargetLabel =
    mode === "account" && accountPlans[selectedIndex]
      ? accountPlanLabel(accountPlans[selectedIndex]!, selectedIndex)
      : planName.trim() || "Nowy plan";

  function setPlace(next: string | null) {
    setSaveError(null);
    setPlaceInvalid(false);
    setDraft((prev) => ({
      ...(prev ?? accountBase ?? stored),
      place: next,
    }));
  }

  const canPrint = Boolean(plan.place) && hasConfiguredLessons(plan);
  const canPrintMzk =
    canPrint && Boolean(mzkSchedule) && hasConfiguredMzkRoute(mzkRoute);
  const selectedPrintReady =
    printMode === "school-mzk" ? canPrintMzk : canPrint;

  useEffect(() => {
    function clearPrintMode() {
      delete document.body.dataset.printMode;
    }
    window.addEventListener("afterprint", clearPrintMode);
    return () => window.removeEventListener("afterprint", clearPrintMode);
  }, []);

  function handlePrint(mode: LessonPlanPrintMode) {
    trackEvent(AnalyticsEvent.lessonPlanPrintClicked, { mode });
    document.body.dataset.printMode = mode;
    window.print();
  }

  const saveDisabled = pending;
  const saveLabel = isDraftingNewPlan ? "Zapisz nowy plan" : "Zapisz plan";

  return (
    <>
      <div className="space-y-6 pb-24 print:hidden md:pb-0">
        {mode === "account" ? (
          <AccountPlansSection
            accountPlans={accountPlans}
            selectedIndex={selectedIndex}
            isDraftingNewPlan={isDraftingNewPlan}
            pending={pending}
            onSelectPlan={selectAccountPlan}
            onAddPlan={handleAddPlan}
            onRequestDelete={() => setDeleteConfirmOpen(true)}
            onCancelDraft={handleCancelDraft}
          />
        ) : null}

        <div
          className={cn(
            "grid gap-3 sm:gap-4",
            mode === "account" && "grid-cols-2",
          )}
        >
          {mode === "account" ? (
            <PlanNameSection
              planName={planName}
              planNameInputRef={planNameInputRef}
              onPlanNameChange={(value) => {
                setSaveError(null);
                setPlanName(value);
              }}
            />
          ) : null}

          <PlaceSection
            places={places}
            place={plan.place}
            placeInvalid={placeInvalid}
            onPlaceChange={setPlace}
          />
        </div>

        <HoursSection
          plan={plan}
          mode={mode}
          hoursSectionInvalid={hoursSectionInvalid}
          daysMissingEnd={daysMissingEnd}
          daysInvalidEnd={daysInvalidEnd}
          saveError={saveError}
          onUpdateDay={updateDay}
        >
          <LessonPlanInlineActions
            mode={mode}
            plan={plan}
            stored={stored}
            mzkRoute={mzkRoute}
            pending={pending}
            saveDisabled={saveDisabled}
            saveLabel={saveLabel}
            onSave={handleSave}
            onClear={handleClear}
          />
        </HoursSection>

        {mode === "local" ? (
          <LessonPlanLocalUpsell loggedIn={loggedIn} trialEnded={trialEnded} />
        ) : null}

        <LessonPlanPrintSection
          printMode={printMode}
          canPrint={canPrint}
          canPrintMzk={canPrintMzk}
          selectedPrintReady={selectedPrintReady}
          onPrintModeChange={setPrintMode}
          onPrint={handlePrint}
        />
      </div>
      <LessonPlanStickySave
        mounted={stickySaveMounted}
        pending={pending}
        saveDisabled={saveDisabled}
        saveLabel={saveLabel}
        onSave={handleSave}
      />
      <LessonPlanDeleteSheet
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        deleteTargetLabel={deleteTargetLabel}
        pending={pending}
        onConfirm={handleClear}
      />
      <LessonPlanPrintOutputs
        schedule={schedule}
        plan={plan}
        mzkSchedule={mzkSchedule}
        mzkRoute={mzkRoute}
      />
    </>
  );
}
