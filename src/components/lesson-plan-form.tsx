"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bus, Clock, Home, MapPin, Plus, Printer, School, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { cn } from "cn";
import {
  LessonPlanPrint,
  type LessonPlanPrintMode,
} from "@/components/lesson-plan-print";
import { PlaceCombobox } from "@/components/place-combobox";
import { SettingsTransferSheet } from "@/components/settings-transfer-sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics/events";
import { MAX_ACCOUNT_PLANS } from "@/lib/billing/constants";
import {
  ACCOUNT_PLAN_NAME_MAX,
  accountPlanLabel,
  fromAccountPlan,
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
import { formatTimeInput, timeToMinutes } from "@/lib/child-schedule/match";
import { savePreferredPlace } from "@/lib/child-schedule/preferred-place";
import {
  EMPTY_LESSON_PLAN,
  WEEKDAY_OPTIONS,
  type ChildLessonPlan,
  type WeekdayKey,
} from "@/lib/child-schedule/types";
import { filtersHref } from "@/lib/dowozy/filter-url";
import type { Schedule } from "@/lib/dowozy/types";
import { useLessonPlan } from "@/lib/child-schedule/use-lesson-plan";
import { hasConfiguredMzkRoute } from "@/lib/mzk/route-storage";
import type { MzkSchedule } from "@/lib/mzk/types";
import { useMzkRoutePreference } from "@/lib/mzk/use-mzk-route";
import { disablePush, repointPush } from "@/lib/push/browser";

const cardClass =
  "space-y-5 rounded-xl border border-border/70 bg-card/90 p-4 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] dark:shadow-[0_1px_0_rgba(0,0,0,0.35)] sm:p-6";

const actionButtonClass = "h-11 w-full px-4 sm:w-auto";

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

async function syncPushLink(
  plans: AccountPlan[],
  selectedId: string | null,
  opts?: { toastOnChange?: boolean },
): Promise<void> {
  if (!selectedId) {
    await disablePush();
    if (opts?.toastOnChange) {
      toast.message("Powiadomienia wyłączone (usunięto plan)");
    }
    return;
  }
  const result = await repointPush(selectedId);
  if (!result.ok) return;
  if (opts?.toastOnChange) {
    const index = indexOfPlanId(plans, selectedId);
    const plan = plans[index];
    const label = plan ? accountPlanLabel(plan, index) : "wybrany plan";
    toast.message(`Powiadomienia przełączono na: ${label}`);
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

function dayHasEndBeforeStart(
  start: string | undefined,
  end: string | undefined,
): boolean {
  if (!start || !end) return false;
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  if (startMin === null || endMin === null) return false;
  return endMin < startMin;
}

function dayTimeSummary(day: { start?: string; end?: string } | undefined): string {
  if (!day?.start) return "Brak";
  if (!day.end) return `${day.start} – …`;
  return `${day.start} – ${day.end}`;
}

function LessonTimeInput({
  id,
  label,
  value,
  disabled,
  invalid,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled?: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label
        htmlFor={id}
        className="text-xs font-medium tracking-wide text-muted-foreground uppercase md:sr-only"
      >
        {label}
      </Label>
      <Input
        id={id}
        type="time"
        value={value}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full bg-background tabular-nums md:h-10"
      />
    </div>
  );
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
  const [planName, setPlanName] = useState(
    () => initialPlans[0]?.name ?? "",
  );
  const [draft, setDraft] = useState<ChildLessonPlan | null>(null);
  const [pending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<LessonPlanPrintMode>("school");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [stickySaveMounted, setStickySaveMounted] = useState(false);
  const accountBootstrapped = useRef(false);
  const previousSelectedIndexRef = useRef(0);
  const planNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStickySaveMounted(true);
  }, []);

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
    return dayHasEndBeforeStart(day?.start, day?.end);
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
      if (next.id) {
        void syncPushLink(nextPlans, next.id);
      }
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
    await syncPushLink(saved, selectedId, {
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

        for (const { key, label } of WEEKDAY_OPTIONS) {
          const day = source.days[key];
          if (!day?.start || !day.end) continue;
          if (dayHasEndBeforeStart(day.start, day.end)) {
            const message = `${label}: koniec lekcji nie może być wcześniejszy niż start.`;
            setSaveError(message);
            toast.error(message);
            return;
          }
        }

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
          const message =
            "Wybierz przystanek i uzupełnij przynajmniej jeden dzień z godziną początku i końca.";
          setSaveError(message);
          toast.error(message);
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
        const preferredIndex = isNew
          ? nextPlans.length - 1
          : selectedIndex;
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
  }

  const deleteTargetLabel =
    mode === "account" && accountPlans[selectedIndex]
      ? accountPlanLabel(accountPlans[selectedIndex]!, selectedIndex)
      : planName.trim() || "Nowy plan";

  function setPlace(next: string | null) {
    setSaveError(null);
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

  const saveDisabled = pending || daysInvalidEnd.length > 0;
  const saveLabel = isDraftingNewPlan ? "Zapisz nowy plan" : "Zapisz plan";

  return (
    <>
      <div className="space-y-6 pb-24 print:hidden md:pb-0">
        {mode === "account" ? (
          <section className={cardClass}>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">
                Plany na koncie
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Do {MAX_ACCOUNT_PLANS} planów, synchronizowanych między
                urządzeniami. Wybrany plan jest też używany w rozkładzie i
                powiadomieniach.
              </p>
            </div>
            {accountPlans.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {accountPlans.map((item, index) => (
                  <button
                    key={`${item.place}-${item.name ?? ""}-${index}`}
                    type="button"
                    onClick={() => selectAccountPlan(index)}
                    className={cn(
                      "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                      index === selectedIndex
                        ? "border-bus/50 bg-bus/10 text-foreground"
                        : "border-border/70 bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {accountPlanLabel(item, index)}
                  </button>
                ))}
                {accountPlans.length < MAX_ACCOUNT_PLANS ? (
                  <button
                    type="button"
                    onClick={handleAddPlan}
                    disabled={isDraftingNewPlan}
                    title={
                      isDraftingNewPlan
                        ? "Najpierw zapisz nowy plan"
                        : undefined
                    }
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border border-dashed px-3.5 py-2 text-sm font-medium transition-colors",
                      isDraftingNewPlan
                        ? "cursor-not-allowed border-border/50 text-muted-foreground/60"
                        : "border-border/70 bg-background text-muted-foreground hover:border-bus/40 hover:text-foreground",
                    )}
                  >
                    <Plus aria-hidden className="size-3.5" />
                    Dodaj plan
                  </button>
                ) : null}
              </div>
            ) : null}
            {accountPlans.length > 0 ? (
              <Button
                type="button"
                variant="destructive"
                size="lg"
                className={actionButtonClass}
                disabled={pending || isDraftingNewPlan}
                title={
                  isDraftingNewPlan
                    ? "Nie można usunąć planu w trakcie dodawania"
                    : undefined
                }
                onClick={() => setDeleteConfirmOpen(true)}
              >
                <Trash2 aria-hidden className="size-4" />
                Usuń plan
              </Button>
            ) : null}
            {accountPlans.length >= MAX_ACCOUNT_PLANS ? (
              <p className="text-sm text-muted-foreground">
                Możesz zapisać najwyżej 5 planów
              </p>
            ) : null}
          </section>
        ) : null}

        {mode === "account" && isDraftingNewPlan ? (
          <div className="flex flex-col gap-3 rounded-xl border border-bus/30 bg-bus/5 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
            <div className="min-w-0 space-y-1">
              <p className="text-base font-semibold text-foreground">
                Nowy plan
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Podaj nazwę i przystanek, uzupełnij godziny, potem zapisz. Bez
                zapisu zniknie po przełączeniu na inny plan lub odświeżeniu
                strony.
              </p>
            </div>
            {accountPlans.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 w-full shrink-0 px-4 sm:w-auto"
                disabled={pending}
                onClick={handleCancelDraft}
              >
                Anuluj
              </Button>
            ) : null}
          </div>
        ) : null}

        <div
          className={cn(
            "grid gap-3 sm:gap-4",
            mode === "account" && "grid-cols-2",
          )}
        >
          {mode === "account" ? (
            <section className={cn(cardClass, "flex h-full flex-col space-y-0")}>
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-foreground">
                  Nazwa planu
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Opcjonalna nazwa (np. imię dziecka) — widać ją w przełączniku i
                  na rozkładzie.
                </p>
              </div>
              <div className="mt-auto flex w-full min-w-0 flex-col gap-1.5 pt-5">
                <Label htmlFor="lesson-plan-name" className="sr-only">
                  Nazwa planu
                </Label>
                <Input
                  ref={planNameInputRef}
                  id="lesson-plan-name"
                  type="text"
                  value={planName}
                  maxLength={ACCOUNT_PLAN_NAME_MAX}
                  placeholder="np. Ania"
                  onChange={(event) => {
                    setSaveError(null);
                    setPlanName(event.target.value);
                  }}
                  className="h-11 bg-background md:h-10"
                />
              </div>
            </section>
          ) : null}

          <section className={cn(cardClass, "flex h-full flex-col space-y-0")}>
            <div className="space-y-1">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <MapPin className="size-4 text-bus-deep" aria-hidden />
                Przystanek
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Wybierz przystanek, z którego dziecko jedzie do szkoły.
              </p>
            </div>
            <div className="mt-auto flex w-full min-w-0 flex-col gap-1.5 pt-5">
              <Label
                id="lesson-place-label"
                htmlFor="lesson-place"
                className="sr-only"
              >
                Przystanek
              </Label>
              <NativeSelect
                id="lesson-place"
                className="w-full max-w-full md:hidden [&_select]:h-11 [&_select]:text-base"
                aria-labelledby="lesson-place-label"
                value={plan.place ?? ""}
                onChange={(event) => {
                  setPlace(event.target.value === "" ? null : event.target.value);
                }}
              >
                <NativeSelectOption value="">Wybierz miejsce</NativeSelectOption>
                {places.map((place) => (
                  <NativeSelectOption key={place} value={place}>
                    {place}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <div className="hidden w-full min-w-0 md:block">
                <PlaceCombobox
                  id="lesson-place-desktop"
                  places={places}
                  value={plan.place}
                  onChange={setPlace}
                  aria-labelledby="lesson-place-label"
                  placeholder="Wybierz lub szukaj miejsca…"
                />
              </div>
            </div>
          </section>
        </div>

        <section className={cardClass}>
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Clock className="size-4 text-bus-deep" aria-hidden />
              Godziny lekcji
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Podaj godziny rozpoczęcia i zakończenia lekcji w poszczególne dni.
            </p>
          </div>

          <Accordion
            multiple
            className="min-w-0 overflow-hidden rounded-xl border border-border/60 md:hidden"
          >
            {WEEKDAY_OPTIONS.map(({ key, label }) => {
              const day = plan.days[key];
              const invalidEnd = dayHasEndBeforeStart(day?.start, day?.end);
              return (
                <AccordionItem key={key} value={String(key)}>
                  <AccordionTrigger className="px-3 py-3.5 font-sans text-base font-medium tracking-normal sm:text-base">
                    <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <span className="text-asphalt">{label}</span>
                      <span
                        className={cn(
                          "shrink-0 tabular-nums text-sm font-normal",
                          invalidEnd
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        {dayTimeSummary(day)}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 px-3 pt-0 pb-4">
                    <LessonTimeInput
                      id={`lesson-start-mobile-${key}`}
                      label="Start lekcji"
                      value={day?.start ?? ""}
                      onChange={(next) => updateDay(key, "start", next)}
                    />
                    <LessonTimeInput
                      id={`lesson-end-mobile-${key}`}
                      label="Koniec lekcji"
                      value={day?.end ?? ""}
                      disabled={!day?.start}
                      invalid={invalidEnd}
                      onChange={(next) => updateDay(key, "end", next)}
                    />
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          <div className="hidden min-w-0 overflow-hidden rounded-xl border border-border/60 md:block">
            <div className="border-b border-border/60 px-4 py-3 text-xs font-medium tracking-wide text-muted-foreground uppercase md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-4">
              <span>Dzień</span>
              <span>Start lekcji</span>
              <span>Koniec lekcji</span>
            </div>
            <div className="divide-y divide-border/40">
              {WEEKDAY_OPTIONS.map(({ key, label }) => {
                const day = plan.days[key];
                const invalidEnd = dayHasEndBeforeStart(day?.start, day?.end);
                return (
                  <div
                    key={key}
                    className="grid min-w-0 grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-4 px-4 py-3"
                  >
                    <div className="font-medium text-asphalt">{label}</div>
                    <LessonTimeInput
                      id={`lesson-start-${key}`}
                      label="Start lekcji"
                      value={day?.start ?? ""}
                      onChange={(next) => updateDay(key, "start", next)}
                    />
                    <LessonTimeInput
                      id={`lesson-end-${key}`}
                      label="Koniec lekcji"
                      value={day?.end ?? ""}
                      disabled={!day?.start}
                      invalid={invalidEnd}
                      onChange={(next) => updateDay(key, "end", next)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-4 sm:px-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Bus className="size-4 text-bus-deep" aria-hidden />
              Jak dobieramy kursy?
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Na podstawie podanych godzin lekcji dopasowujemy odpowiednie
              kursy.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground">
                  <Home className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Dowóz</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Wybieramy kurs przed rozpoczęciem lekcji.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground">
                  <School className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Odwóz</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Wybieramy kurs o godzinie zakończenia lekcji lub późniejszy.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {daysMissingEnd.length > 0 ||
          daysInvalidEnd.length > 0 ||
          saveError ? (
            <div className="space-y-2 text-sm leading-relaxed">
              {daysMissingEnd.length > 0 ? (
                <p className="text-asphalt/80">
                  Brak końca lekcji (
                  {daysMissingEnd.map((d) => d.label).join(", ")}) — odwozy nie
                  dopasują się do planu w te dni
                  {mode === "account"
                    ? "; dni bez godziny końca nie zapiszą się na koncie"
                    : ""}
                  .
                </p>
              ) : null}
              {daysInvalidEnd.length > 0 || saveError ? (
                <p className="text-destructive" role="alert">
                  {saveError ??
                    `Koniec lekcji nie może być wcześniejszy niż start (${daysInvalidEnd.map((d) => d.label).join(", ")}).`}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                type="button"
                size="lg"
                className={cn(actionButtonClass, "hidden md:inline-flex")}
                disabled={saveDisabled}
                onClick={handleSave}
              >
                {saveLabel}
              </Button>
              {mode === "local" ? (
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className={actionButtonClass}
                  disabled={!hasConfiguredLessons(plan) && !plan.place}
                  onClick={handleClear}
                >
                  Wyczyść
                </Button>
              ) : null}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center max-sm:[&_a]:h-11 max-sm:[&_a]:w-full max-sm:[&_a]:px-4 max-sm:[&_button]:h-11 max-sm:[&_button]:w-full max-sm:[&_button]:px-4">
              <SettingsTransferSheet
                canTransfer={
                  hasConfiguredLessons(stored) ||
                  hasConfiguredMzkRoute(mzkRoute)
                }
                triggerLabel="Użyj na innym urządzeniu"
                accountSyncHint={mode === "account"}
              />
              <Link
                href="/przywroc"
                className={buttonVariants({ size: "lg", variant: "outline" })}
              >
                Wpisz kod z kodu QR
              </Link>
            </div>
          </div>

          {hasConfiguredLessons(plan) ? (
            <Link
              href={filtersHref({
                place: plan.place,
                dateFilter: "today",
                direction: "all",
                matchLessonPlan: true,
              })}
              className="text-sm font-medium text-asphalt underline underline-offset-2 hover:text-foreground"
            >
              Zobacz dopasowany rozkład
            </Link>
          ) : null}
        </section>

        {mode === "local" ? (
          <section className={cardClass}>
            {!loggedIn ? (
              <>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Zaloguj się, żeby zapisać plan na koncie i korzystać z niego
                  na każdym urządzeniu.
                </p>
                <Link
                  href="/login"
                  className={buttonVariants({ size: "lg", className: actionButtonClass })}
                >
                  Zaloguj się
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Więcej planów i synchronizacja między urządzeniami w Planie
                  Plus.
                </p>
                {trialEnded ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Plany zapisane na koncie nie znikają — wrócą po wykupieniu
                    Planu Plus.
                  </p>
                ) : null}
                <Link
                  href="/profil?plus=1"
                  className={buttonVariants({ size: "lg", className: actionButtonClass })}
                >
                  Zobacz Plan Plus
                </Link>
              </>
            )}
          </section>
        ) : null}

        <section className={cardClass}>
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Printer className="size-4 text-bus-deep" aria-hidden />
              Wydrukuj plan dojazdów dopasowany do planu lekcji
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Wybierz, jakie połączenia chcesz uwzględnić na wydruku.
            </p>
          </div>

          <fieldset className="space-y-2">
            <legend className="sr-only">Rodzaj wydruku</legend>
            <label
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border border-border/70 bg-card px-4 py-3.5 text-left transition-colors",
                "has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                printMode === "school" && "border-bus/40 bg-muted/40",
                !canPrint && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="radio"
                name="lesson-print-mode"
                value="school"
                checked={printMode === "school"}
                disabled={!canPrint}
                onChange={() => setPrintMode("school")}
                title={
                  canPrint
                    ? undefined
                    : "Wybierz przystanek i uzupełnij godziny lekcji"
                }
                className="mt-1 size-4 accent-bus"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground sm:text-base">
                  Autobus szkolny
                </span>
                <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
                  Pełny rozkład kursów autobusu szkolnego
                </span>
              </span>
            </label>
            <label
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border border-border/70 bg-card px-4 py-3.5 text-left transition-colors",
                "has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                printMode === "school-mzk" && "border-bus/40 bg-muted/40",
                !canPrintMzk && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="radio"
                name="lesson-print-mode"
                value="school-mzk"
                checked={printMode === "school-mzk"}
                disabled={!canPrintMzk}
                onChange={() => setPrintMode("school-mzk")}
                title={
                  canPrintMzk
                    ? undefined
                    : canPrint
                      ? "Najpierw ustaw trasę MZK w zakładce MZK"
                      : "Wybierz przystanek, uzupełnij lekcje i ustaw trasę MZK"
                }
                className="mt-1 size-4 accent-bus"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground sm:text-base">
                  Autobus szkolny + MZK
                </span>
                <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
                  Autobus szkolny oraz najbliższe kursy MZK
                </span>
              </span>
            </label>
            <label
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border border-border/70 bg-card px-4 py-3.5 text-left transition-colors",
                "has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                printMode === "compact" && "border-bus/40 bg-muted/40",
                !canPrint && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="radio"
                name="lesson-print-mode"
                value="compact"
                checked={printMode === "compact"}
                disabled={!canPrint}
                onChange={() => setPrintMode("compact")}
                title={
                  canPrint
                    ? undefined
                    : "Wybierz przystanek i uzupełnij godziny lekcji"
                }
                className="mt-1 size-4 accent-bus"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground sm:text-base">
                  Kompaktowy rozkład do kieszeni
                </span>
                <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
                  Skrócona wersja rozkładu do wycięcia i schowania do kieszeni
                </span>
              </span>
            </label>
          </fieldset>

          {!canPrint ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Uzupełnij godziny lekcji (i wybierz przystanek), żeby wydrukować
              spersonalizowany plan dojazdów.
            </p>
          ) : null}
          {canPrint && !canPrintMzk ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Wydruk ze szkolnym + MZK wymaga zapisanej trasy w zakładce{" "}
              <Link
                href="/mzk"
                className="font-medium text-asphalt underline underline-offset-2 hover:text-foreground"
              >
                MZK
              </Link>
              . Na kartce pojawi się tylko najbliższy kurs MZK do planu lekcji.
            </p>
          ) : canPrintMzk ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Wariant z MZK dodaje najbliższe połączenia MZK na początku i końcu
              trasy, bez pełnego rozkładu linii.
            </p>
          ) : null}

          <Button
            type="button"
            size="lg"
            variant="outline"
            className={actionButtonClass}
            disabled={!selectedPrintReady}
            aria-label={
              printMode === "school"
                ? "Wydrukuj plan dojazdów szkolnych"
                : printMode === "school-mzk"
                  ? "Wydrukuj plan dojazdów szkolnych z najbliższym MZK"
                  : "Wydrukuj kompaktowy plan dojazdów do kieszeni"
            }
            title={
              selectedPrintReady
                ? undefined
                : printMode === "school-mzk"
                  ? canPrint
                    ? "Najpierw ustaw trasę MZK w zakładce MZK"
                    : "Wybierz przystanek, uzupełnij lekcje i ustaw trasę MZK"
                  : "Wybierz przystanek i uzupełnij godziny lekcji"
            }
            onClick={() => handlePrint(printMode)}
          >
            <Printer aria-hidden />
            Drukuj
          </Button>
        </section>
      </div>
      {stickySaveMounted
        ? createPortal(
            <div
              className="fixed bottom-0 left-0 z-40 w-screen max-w-none shrink-0 border-t border-border/70 bg-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-[0_-4px_16px_color-mix(in_srgb,var(--foreground)_6%,transparent)] backdrop-blur-sm print:hidden md:hidden dark:shadow-[0_-4px_16px_rgba(0,0,0,0.35)]"
              style={{ width: "100vw" }}
            >
              <Button
                type="button"
                size="lg"
                className="h-11 w-full max-w-none px-4"
                disabled={saveDisabled}
                onClick={handleSave}
              >
                {saveLabel}
              </Button>
            </div>,
            document.body,
          )
        : null}
      <Sheet open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <SheetContent side="bottom" className="print:hidden">
          <SheetHeader>
            <SheetTitle>Usunąć plan?</SheetTitle>
            <SheetDescription>
              Plan „{deleteTargetLabel}” zostanie trwale usunięty z konta. Tej
              operacji nie da się cofnąć.
            </SheetDescription>
          </SheetHeader>
          <SheetFooter className="flex flex-col items-center gap-3">
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="h-11 w-full max-w-xs px-4"
              disabled={pending}
              onClick={handleClear}
            >
              <Trash2 aria-hidden className="size-4" />
              Usuń plan
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 w-full max-w-xs px-4"
              disabled={pending}
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Anuluj
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <LessonPlanPrint schedule={schedule} plan={plan} mode="school" />
      <LessonPlanPrint schedule={schedule} plan={plan} mode="compact" />
      {mzkSchedule ? (
        <LessonPlanPrint
          schedule={schedule}
          plan={plan}
          mode="school-mzk"
          mzkSchedule={mzkSchedule}
          mzkRoute={mzkRoute}
        />
      ) : null}
    </>
  );
}
