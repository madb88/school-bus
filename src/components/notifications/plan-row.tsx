"use client";

import { cn } from "cn";
import {
  Bus,
  CalendarClock,
  Check,
  School,
  type LucideIcon,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { CARD_CLASS } from "@/components/notifications/styles";
import {
  accountPlanLabel,
  isAccountPlanId,
  type AccountPlan,
} from "@/lib/child-schedule/account-plan";
import type { PushKinds } from "@/lib/push/kinds";

export const KINDS: {
  id: keyof PushKinds;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    id: "departure",
    title: "Odjazd do szkoły",
    description: "Około 20 minut przed kursem do szkoły.",
    icon: School,
  },
  {
    id: "return",
    title: "Autobus powrotny",
    description: "Około 20 minut przed odjazdem ze szkoły.",
    icon: Bus,
  },
  {
    id: "schedule",
    title: "Zmiana rozkładu",
    description: "Gdy zaktualizują się godziny dowozów i odwozów.",
    icon: CalendarClock,
  },
];

export type DeviceRow = {
  id: string;
  endpoint: string;
  planIds: string[];
  kinds: PushKinds;
  title: string;
  isCurrent: boolean;
};

export function planIdsFromAccount(plans: AccountPlan[]): string[] {
  return plans
    .map((plan) => plan.id)
    .filter((id): id is string => isAccountPlanId(id));
}

export function planNamesForIds(
  accountPlans: AccountPlan[],
  planIds: string[],
): string[] {
  const names: string[] = [];
  for (const id of planIds) {
    const index = accountPlans.findIndex((plan) => plan.id === id);
    if (index < 0) continue;
    names.push(accountPlanLabel(accountPlans[index]!, index));
  }
  return names;
}

export function PlanRow({
  label,
  checked,
  disabled,
  onToggle,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        checked
          ? "border-bus/40 bg-bus/5 text-foreground"
          : "border-border/50 bg-background text-foreground hover:bg-muted/40",
      )}
    >
      <span className="min-w-0 text-sm font-medium">{label}</span>
      <span
        aria-hidden
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full transition-colors",
          checked
            ? "bg-bus text-bus-foreground"
            : "border border-border/70 bg-transparent",
        )}
      >
        {checked ? <Check className="size-3 stroke-[3]" /> : null}
      </span>
    </button>
  );
}

export function KindRow({
  title,
  description,
  icon: Icon,
  checked,
  disabled,
  onCheckedChange,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1 py-2 has-disabled:cursor-not-allowed has-disabled:opacity-50">
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-md bg-bus/10 text-bus"
      >
        <Icon className="size-4" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">
          {title}
        </span>
        <span className="block text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {description}
        </span>
      </span>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </label>
  );
}

export function PlansOverview({
  accountPlans,
  deviceRows,
  currentSubscribed,
  currentPlanIds,
  currentTitle,
  loading,
}: {
  accountPlans: AccountPlan[];
  deviceRows: DeviceRow[];
  currentSubscribed: boolean;
  currentPlanIds: string[];
  currentTitle: string;
  loading: boolean;
}) {
  return (
    <section className={cn(CARD_CLASS, "sm:space-y-4")}>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">
          Gdzie włączone powiadomienia
        </h3>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Podsumowanie: na których urządzeniach dany plan dostaje przypomnienia.
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Ładowanie…</p>
      ) : (
        <ul className="space-y-3 sm:space-y-4">
          {accountPlans.map((plan, index) => {
            if (!isAccountPlanId(plan.id)) return null;
            const id = plan.id;
            const names = new Set<string>();
            for (const row of deviceRows) {
              if (!row.planIds.includes(id)) continue;
              names.add(row.title);
            }
            // Current device may not be in listMyDevices yet after enable,
            // or list is stale — also reflect local subscribe state.
            if (currentSubscribed && currentPlanIds.includes(id)) {
              names.add(currentTitle);
            }
            const list = [...names];
            return (
              <li
                key={id}
                className="flex flex-col gap-2 border-b border-border/30 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:gap-5 sm:pb-4"
              >
                <span className="shrink-0 text-sm font-medium leading-relaxed text-foreground sm:min-w-[8rem]">
                  {accountPlanLabel(plan, index)}
                </span>
                {list.length > 0 ? (
                  <span className="flex flex-wrap gap-2">
                    {list.map((name) => (
                      <span
                        key={name}
                        className="inline-flex max-w-full rounded-full bg-muted px-2.5 py-1 text-xs font-medium leading-relaxed text-foreground"
                      >
                        {name}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    Brak urządzeń
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
