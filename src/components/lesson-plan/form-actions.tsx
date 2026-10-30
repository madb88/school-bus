"use client";

import Link from "next/link";
import { Printer, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import {
  actionButtonClass,
  cardClass,
} from "@/components/lesson-plan/styles";
import {
  LessonPlanPrint,
  type LessonPlanPrintMode,
} from "@/components/lesson-plan-print";
import { SettingsTransferSheet } from "@/components/settings-transfer-sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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
import { hasConfiguredLessons } from "@/lib/child-schedule/storage";
import type { ChildLessonPlan } from "@/lib/child-schedule/types";
import { filtersHref } from "@/lib/dowozy/filter-url";
import type { Schedule } from "@/lib/dowozy/types";
import type { MzkRoutePreference } from "@/lib/mzk/route-preference";
import { hasConfiguredMzkRoute } from "@/lib/mzk/route-storage";
import type { MzkSchedule } from "@/lib/mzk/types";
import { cn } from "cn";

export function LessonPlanInlineActions({
  mode,
  plan,
  stored,
  mzkRoute,
  pending,
  saveDisabled,
  saveLabel,
  onSave,
  onClear,
}: {
  mode: "local" | "account";
  plan: ChildLessonPlan;
  stored: ChildLessonPlan;
  mzkRoute: MzkRoutePreference;
  pending: boolean;
  saveDisabled: boolean;
  saveLabel: string;
  onSave: () => void;
  onClear: () => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            size="lg"
            className={cn(actionButtonClass, "hidden md:inline-flex")}
            disabled={saveDisabled}
            aria-busy={pending}
            onClick={onSave}
          >
            <span className="relative inline-flex items-center justify-center">
              {pending ? (
                <span
                  className="absolute right-full mr-2 inline-flex size-4 items-center justify-center"
                  aria-hidden
                >
                  <Spinner />
                </span>
              ) : null}
              <span>{saveLabel}</span>
            </span>
          </Button>
          {mode === "local" ? (
            <Button
              type="button"
              size="lg"
              variant="outline"
              className={actionButtonClass}
              disabled={!hasConfiguredLessons(plan) && !plan.place}
              onClick={onClear}
            >
              Wyczyść
            </Button>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center max-sm:[&_a]:h-11 max-sm:[&_a]:w-full max-sm:[&_a]:px-4 max-sm:[&_button]:h-11 max-sm:[&_button]:w-full max-sm:[&_button]:px-4">
          <SettingsTransferSheet
            canTransfer={
              hasConfiguredLessons(stored) || hasConfiguredMzkRoute(mzkRoute)
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
    </>
  );
}

export function LessonPlanLocalUpsell({
  loggedIn,
  trialEnded,
}: {
  loggedIn: boolean;
  trialEnded: boolean;
}) {
  return (
    <section className={cardClass}>
      {!loggedIn ? (
        <>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Zaloguj się, żeby zapisać plan na koncie i korzystać z niego na
            każdym urządzeniu.
          </p>
          <Link
            href="/login"
            className={buttonVariants({
              size: "lg",
              className: actionButtonClass,
            })}
          >
            Zaloguj się
          </Link>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Więcej planów i synchronizacja między urządzeniami w Planie Plus.
          </p>
          {trialEnded ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Plany zapisane na koncie nie znikają — wrócą po wykupieniu Planu
              Plus.
            </p>
          ) : null}
          <Link
            href="/profil?plus=1"
            className={buttonVariants({
              size: "lg",
              className: actionButtonClass,
            })}
          >
            Zobacz Plan Plus
          </Link>
        </>
      )}
    </section>
  );
}

export function LessonPlanPrintSection({
  printMode,
  canPrint,
  canPrintMzk,
  selectedPrintReady,
  onPrintModeChange,
  onPrint,
}: {
  printMode: LessonPlanPrintMode;
  canPrint: boolean;
  canPrintMzk: boolean;
  selectedPrintReady: boolean;
  onPrintModeChange: (mode: LessonPlanPrintMode) => void;
  onPrint: (mode: LessonPlanPrintMode) => void;
}) {
  return (
    <Accordion
      className={cn(
        cardClass,
        "space-y-0 overflow-hidden p-0 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] sm:p-0 dark:shadow-[0_1px_0_rgba(0,0,0,0.35)]",
      )}
    >
      <AccordionItem value="print" className="border-0">
        <AccordionTrigger className="w-full rounded-none px-4 py-4 font-sans text-sm font-semibold tracking-normal hover:bg-muted/50 sm:px-6 sm:text-sm">
          <span className="flex items-center gap-2">
            <Printer className="size-4 text-bus-deep" aria-hidden />
            Wydrukuj plan dojazdów dopasowany do planu lekcji
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-5 px-4 pt-0 pb-4 sm:px-6 sm:pb-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Wybierz, jakie połączenia chcesz uwzględnić na wydruku.
          </p>

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
                onChange={() => onPrintModeChange("school")}
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
                onChange={() => onPrintModeChange("school-mzk")}
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
                onChange={() => onPrintModeChange("compact")}
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
            onClick={() => onPrint(printMode)}
          >
            <Printer aria-hidden />
            Drukuj
          </Button>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function LessonPlanStickySave({
  mounted,
  pending,
  saveDisabled,
  saveLabel,
  onSave,
}: {
  mounted: boolean;
  pending: boolean;
  saveDisabled: boolean;
  saveLabel: string;
  onSave: () => void;
}) {
  if (!mounted) return null;
  return createPortal(
    <div
      className="fixed bottom-0 left-0 z-40 w-screen max-w-none shrink-0 border-t border-border/70 bg-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-[0_-4px_16px_color-mix(in_srgb,var(--foreground)_6%,transparent)] backdrop-blur-sm print:hidden md:hidden dark:shadow-[0_-4px_16px_rgba(0,0,0,0.35)]"
      style={{ width: "100vw" }}
    >
      <Button
        type="button"
        size="lg"
        className="h-11 w-full max-w-none px-4"
        disabled={saveDisabled}
        aria-busy={pending}
        onClick={onSave}
      >
        <span className="relative flex w-full items-center justify-center">
          {pending ? (
            <span
              className="absolute left-0 inline-flex size-4 items-center justify-center"
              aria-hidden
            >
              <Spinner />
            </span>
          ) : null}
          <span>{saveLabel}</span>
        </span>
      </Button>
    </div>,
    document.body,
  );
}

export function LessonPlanDeleteSheet({
  open,
  onOpenChange,
  deleteTargetLabel,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleteTargetLabel: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
            onClick={onConfirm}
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
            onClick={() => onOpenChange(false)}
          >
            Anuluj
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function LessonPlanPrintOutputs({
  schedule,
  plan,
  mzkSchedule,
  mzkRoute,
}: {
  schedule: Schedule;
  plan: ChildLessonPlan;
  mzkSchedule: MzkSchedule | null;
  mzkRoute: MzkRoutePreference;
}) {
  return (
    <>
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
