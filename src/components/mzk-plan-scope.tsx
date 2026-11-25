"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { Building2, Pencil } from "lucide-react";
import { MzkRouteForm } from "@/components/mzk-route-form";
import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import {
  findPlanChoice,
  resolveActivePlanKey,
  type PlanChoice,
} from "@/lib/child-schedule/active-plan";
import type { AccountPlan } from "@/lib/child-schedule/account-plan";
import {
  getSelectedPlanIdServerSnapshot,
  getSelectedPlanIdSnapshot,
  saveSelectedPlanId,
  subscribeSelectedPlan,
} from "@/lib/child-schedule/selected-plan";
import { MZK_DEVELOPER_PAGE_URL, type MzkSchedule } from "@/lib/mzk/types";
import { usePlanChoices } from "@/lib/mzk/use-plan-mzk-route";
import type { City, MzkPlaceStops, School } from "@/lib/schools/types";

type MzkPlanScopeProps = {
  accountPlans: AccountPlan[];
  /** `?plan=` from the URL (account UUID or `local`). */
  urlPlanId: string | null;
  /** School the server loaded (the plan's school once the URL names it). */
  schoolId: string;
  cities: City[];
  allSchools: School[];
  /** MZK snapshot of `schoolId`'s city; null when unavailable. */
  schedule: MzkSchedule | null;
  schoolStopIds: string[];
  placeStops: MzkPlaceStops[];
};

function planHref(choice: PlanChoice, school: School | null): string {
  const params = new URLSearchParams({ plan: choice.key });
  if (school) {
    params.set("miasto", school.city.id);
    params.set("szkola", school.id);
  }
  return `/mzk?${params.toString()}`;
}

/**
 * `/mzk`: the MZK route belongs to a plan. Pick the plan (its city and school
 * are shown read-only), then set its route; without a plan, link to `/lekcje`.
 */
export function MzkPlanScope({
  accountPlans,
  urlPlanId,
  schoolId,
  cities,
  allSchools,
  schedule,
  schoolStopIds,
  placeStops,
}: MzkPlanScopeProps) {
  const router = useRouter();
  // Device plan / remembered plan live in localStorage: wait for the client.
  const clientReady = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const choices = usePlanChoices(accountPlans);
  const storedKey =
    useSyncExternalStore(
      subscribeSelectedPlan,
      getSelectedPlanIdSnapshot,
      getSelectedPlanIdServerSnapshot,
    ) || null;
  const activeKey = resolveActivePlanKey(
    choices,
    urlPlanId ? { kind: "plan", key: urlPlanId } : { kind: "default" },
    storedKey,
  );
  const active = findPlanChoice(choices, activeKey);
  const activeSchool = active
    ? (allSchools.find((school) => school.id === active.schoolId) ?? null)
    : null;
  const activeCity = activeSchool
    ? (cities.find((city) => city.id === activeSchool.city.id) ?? null)
    : null;
  // The server loads the plan's school from the URL; until it does, wait.
  const needsNavigation =
    active != null &&
    (urlPlanId !== active.key ||
      (activeSchool != null && activeSchool.id !== schoolId));

  useEffect(() => {
    if (!clientReady || !active || !needsNavigation) return;
    router.replace(planHref(active, activeSchool), { scroll: false });
  }, [clientReady, active, activeSchool, needsNavigation, router]);

  if (!clientReady) {
    return <ScopeSpinner />;
  }

  if (!active) {
    return (
      <div className="rounded-xl border border-border/70 bg-card px-4 py-5 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Najpierw dodaj plan lekcji</p>
        <p className="mt-1 leading-relaxed">
          Trasa MZK jest zapisywana w planie — razem ze szkołą i godzinami
          lekcji. Dodaj plan, a potem wróć tu, żeby ustawić wsiadanie i
          wysiadanie.
        </p>
        <Link
          href="/lekcje"
          className={buttonVariants({
            size: "sm",
            variant: "secondary",
            className: "mt-3",
          })}
        >
          Dodaj plan
        </Link>
      </div>
    );
  }

  const editHref = active.account
    ? `/lekcje?plan=${encodeURIComponent(active.key)}`
    : "/lekcje";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {choices.length > 1 ? (
          <div className="flex flex-col gap-1.5 sm:max-w-sm">
            <Label htmlFor="mzk-plan" className="text-xs text-muted-foreground">
              Plan
            </Label>
            <NativeSelect
              id="mzk-plan"
              value={active.key}
              onChange={(event) => {
                const choice = findPlanChoice(choices, event.target.value);
                if (!choice) return;
                saveSelectedPlanId(choice.key);
                const school =
                  allSchools.find((item) => item.id === choice.schoolId) ??
                  null;
                router.replace(planHref(choice, school), { scroll: false });
              }}
            >
              {choices.map((choice) => (
                <NativeSelectOption key={choice.key} value={choice.key}>
                  {choice.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        ) : null}
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <Building2 aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate text-foreground">
            {activeCity?.name ?? "Miasto"} · {activeSchool?.name ?? "Szkoła"}
          </span>
          <span className="text-muted-foreground">
            · z planu „{active.label}”
          </span>
          <Link
            href={editHref}
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-bus-deep hover:bg-bus/10"
          >
            <Pencil aria-hidden className="size-3" />
            edytuj plan
          </Link>
        </div>
      </div>

      {needsNavigation ? (
        <ScopeSpinner />
      ) : schedule && schedule.stops.length > 0 ? (
        <MzkRouteForm
          key={active.key}
          schedule={schedule}
          choice={active}
          schoolStopIds={schoolStopIds}
          placeStops={placeStops}
        />
      ) : (
        <p className="text-muted-foreground">
          Rozkład MZK jest chwilowo niedostępny. Spróbuj ponownie później albo
          sprawdź źródło na stronie{" "}
          <a
            href={MZK_DEVELOPER_PAGE_URL}
            className="underline underline-offset-2 hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            MZK Zielona Góra
          </a>
          .
        </p>
      )}
    </div>
  );
}

function ScopeSpinner() {
  return (
    <div
      className="flex min-h-[10rem] items-center justify-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner />
    </div>
  );
}
