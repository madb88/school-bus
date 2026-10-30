"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import type { RefObject } from "react";
import { FieldHelpHint } from "@/components/lesson-plan/field-help-hint";
import { cardClass } from "@/components/lesson-plan/styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_ACCOUNT_PLANS } from "@/lib/billing/constants";
import {
  ACCOUNT_PLAN_NAME_MAX,
  accountPlanLabel,
  type AccountPlan,
} from "@/lib/child-schedule/account-plan";
import { cn } from "cn";

export function AccountPlansSection({
  accountPlans,
  selectedIndex,
  isDraftingNewPlan,
  pending,
  onSelectPlan,
  onAddPlan,
  onRequestDelete,
  onCancelDraft,
}: {
  accountPlans: AccountPlan[];
  selectedIndex: number;
  isDraftingNewPlan: boolean;
  pending: boolean;
  onSelectPlan: (index: number) => void;
  onAddPlan: () => void;
  onRequestDelete: () => void;
  onCancelDraft: () => void;
}) {
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
            Do {MAX_ACCOUNT_PLANS} planów, synchronizowanych między urządzeniami.
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
              {accountPlans.length < MAX_ACCOUNT_PLANS ? (
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
        {accountPlans.length >= MAX_ACCOUNT_PLANS ? (
          <p className="text-sm text-muted-foreground">
            Możesz zapisać najwyżej 5 planów
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
