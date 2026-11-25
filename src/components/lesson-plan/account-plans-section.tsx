"use client";

import { Bus, Check, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import type { RefObject } from "react";
import { FieldHelpHint } from "@/components/lesson-plan/field-help-hint";
import { cardClass } from "@/components/lesson-plan/styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ACCOUNT_PLAN_NAME_MAX,
  accountPlanLabel,
  type AccountPlan,
} from "@/lib/child-schedule/account-plan";
import type { School } from "@/lib/schools/types";
import { cn } from "cn";

export function AccountPlansSection({
  accountPlans,
  schools,
  maxPlans,
  plusAccess,
  selectedIndex,
  isDraftingNewPlan,
  pending,
  onSelectPlan,
  onAddPlan,
  onRequestDelete,
  onCancelDraft,
}: {
  accountPlans: AccountPlan[];
  /** All schools, to name each plan's school. */
  schools: School[];
  /** 1 without Plus, 5 with Plus. */
  maxPlans: number;
  plusAccess: boolean;
  selectedIndex: number;
  isDraftingNewPlan: boolean;
  pending: boolean;
  onSelectPlan: (index: number) => void;
  onAddPlan: () => void;
  onRequestDelete: () => void;
  onCancelDraft: () => void;
}) {
  const plansSpanSchools =
    new Set(accountPlans.map((plan) => plan.schoolId)).size > 1;
  const selectedPlan = accountPlans[selectedIndex] ?? null;
  function schoolName(schoolId: string): string {
    return schools.find((school) => school.id === schoolId)?.name ?? "Szkoła";
  }
  return (
    <>
      <section
        className={cn(
          cardClass,
          "border-bus/35 bg-white shadow-[0_1px_0_color-mix(in_srgb,var(--bus)_12%,white)] dark:border-bus/25 dark:bg-card dark:shadow-[0_1px_0_rgba(0,0,0,0.35)]",
        )}
      >
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            Plany na koncie
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {plusAccess
              ? `Do ${maxPlans} planów, każdy dla swojej szkoły i z własną trasą MZK — synchronizowane między urządzeniami.`
              : "Jeden plan na koncie: szkoła, godziny i trasa MZK. Więcej planów (np. dla kilku dzieci lub szkół) w Planie Plus."}
          </p>
        </div>
        {accountPlans.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex min-w-0 flex-1 flex-wrap gap-2 overflow-visible rounded-2xl border border-dashed border-border/70 p-2">
              {accountPlans.map((item, index) => {
                const selected = index === selectedIndex;
                return (
                  <button
                    key={`${item.place}-${item.name ?? ""}-${index}`}
                    type="button"
                    onClick={() => onSelectPlan(index)}
                    className={cn(
                      "relative rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                      selected
                        ? "border-bus/50 bg-bus/10 text-foreground"
                        : "border-border/70 bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {accountPlanLabel(item, index)}
                    {plansSpanSchools ? (
                      <span className="ml-1 font-normal text-muted-foreground">
                        · {schoolName(item.schoolId)}
                      </span>
                    ) : null}
                    {selected ? (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute top-0 right-0 z-10 grid size-4 translate-x-1/3 -translate-y-1/3 place-items-center rounded-full bg-bus text-bus-foreground shadow-xs"
                      >
                        <Check className="size-2.5 stroke-[3]" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
              {accountPlans.length < maxPlans ? (
                <button
                  type="button"
                  onClick={onAddPlan}
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
              ) : !plusAccess ? (
                <Link
                  href="/profil?plus=1"
                  className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border/70 bg-background px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-bus/40 hover:text-foreground"
                >
                  <Plus aria-hidden className="size-3.5" />
                  Więcej planów w Planie Plus
                </Link>
              ) : null}
            </div>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="h-11 shrink-0 px-4"
              disabled={pending || isDraftingNewPlan}
              title={
                isDraftingNewPlan
                  ? "Nie można usunąć planu w trakcie dodawania"
                  : undefined
              }
              onClick={onRequestDelete}
            >
              <Trash2 aria-hidden className="size-4" />
              Usuń plan
            </Button>
          </div>
        ) : null}
        {plusAccess && accountPlans.length >= maxPlans ? (
          <p className="text-sm text-muted-foreground">
            Możesz zapisać najwyżej {maxPlans} planów
          </p>
        ) : null}
        {selectedPlan?.id && !isDraftingNewPlan ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <Bus aria-hidden className="size-4 shrink-0 text-mzk-deep" />
            <span>
              {schoolName(selectedPlan.schoolId)} ·{" "}
              {selectedPlan.mzkRoute
                ? "trasa MZK ustawiona"
                : "bez trasy MZK"}
            </span>
            <Link
              href={`/mzk?plan=${encodeURIComponent(selectedPlan.id)}`}
              className="font-medium text-foreground underline underline-offset-2"
            >
              {selectedPlan.mzkRoute ? "Zmień trasę MZK" : "Ustaw trasę MZK"}
            </Link>
          </p>
        ) : null}
      </section>

      {isDraftingNewPlan ? (
        <div className="flex flex-col gap-3 rounded-xl border border-bus/30 bg-bus/5 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
          <div className="min-w-0 space-y-1">
            <p className="text-base font-semibold text-foreground">Nowy plan</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Podaj nazwę i przystanek, uzupełnij godziny, potem zapisz. Bez
              zapisu zniknie po przełączeniu na inny plan lub odświeżeniu strony.
            </p>
          </div>
          {accountPlans.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 w-full shrink-0 px-4 sm:w-auto"
              disabled={pending}
              onClick={onCancelDraft}
            >
              Anuluj
            </Button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export function PlanNameSection({
  planName,
  planNameInputRef,
  onPlanNameChange,
}: {
  planName: string;
  planNameInputRef: RefObject<HTMLInputElement | null>;
  onPlanNameChange: (value: string) => void;
}) {
  return (
    <section className={cn(cardClass, "flex h-full flex-col space-y-0")}>
      <FieldHelpHint
        title="Nazwa planu"
        description="Opcjonalna nazwa (np. imię dziecka) — widać ją w przełączniku i na rozkładzie."
      />
      <div className="mt-auto flex w-full min-w-0 flex-col gap-1.5 pt-2 md:pt-3">
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
          onChange={(event) => onPlanNameChange(event.target.value)}
          className="h-11 bg-background md:h-10"
        />
      </div>
    </section>
  );
}
