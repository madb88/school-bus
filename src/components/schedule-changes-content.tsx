import Link from "next/link";
import { ArrowRight, Plus, Minus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  diffSchedules,
  type ScheduleDiffItem,
  type ScheduleDiffSection,
} from "@/lib/dowozy/schedule-diff";
import type { Schedule } from "@/lib/dowozy/types";
import { cn } from "cn";

const SECTION_LABELS: Record<ScheduleDiffSection, string> = {
  pickup: "Dowozy",
  dropoffDate: "Odwozy (data)",
  dropoffWeekday: "Odwozy (dzień tygodnia)",
  meta: "Inne",
};

const SECTION_ORDER: ScheduleDiffSection[] = [
  "pickup",
  "dropoffDate",
  "dropoffWeekday",
  "meta",
];

function formatActiveUntil(ymd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) return ymd;
  const [, y, m, d] = match;
  return `${Number(d)}.${Number(m)}.${y}`;
}

function placesLabel(places: string[]): string {
  return places.length > 0 ? places.join(", ") : "—";
}

function ChangeRow({ item }: { item: ScheduleDiffItem }) {
  const places = placesLabel(item.places);

  if (item.change === "time_changed") {
    return (
      <li className="flex flex-col gap-1 border-b border-border/60 py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium text-foreground">{places}</p>
          <p className="text-xs text-muted-foreground">{item.context}</p>
        </div>
        <p className="flex shrink-0 items-center gap-1.5 font-display text-base tabular-nums tracking-tight">
          <span className="text-muted-foreground line-through decoration-muted-foreground/60">
            {item.fromTime}
          </span>
          <ArrowRight
            aria-hidden
            className="size-3.5 text-muted-foreground/70"
          />
          <span className="font-semibold text-bus-deep dark:text-bus">
            {item.toTime}
          </span>
        </p>
      </li>
    );
  }

  const isAdded = item.change === "added";
  const Icon = isAdded ? Plus : Minus;
  const time = isAdded ? item.toTime : item.fromTime;

  return (
    <li className="flex flex-col gap-1 border-b border-border/60 py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <div className="min-w-0 space-y-0.5">
        <p className="flex items-center gap-1.5 font-medium text-foreground">
          <Icon
            aria-hidden
            className={cn(
              "size-3.5 shrink-0",
              isAdded ? "text-bus" : "text-destructive",
            )}
          />
          <span>{places}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {isAdded ? "Dodano" : "Usunięto"} · {item.context}
        </p>
      </div>
      {time ? (
        <p
          className={cn(
            "shrink-0 font-display text-base tabular-nums tracking-tight",
            isAdded
              ? "font-semibold text-bus-deep dark:text-bus"
              : "text-muted-foreground line-through",
          )}
        >
          {time}
        </p>
      ) : null}
    </li>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-8 text-center sm:px-6"
      role="status"
    >
      <p className="font-display text-lg font-semibold tracking-tight text-asphalt">
        {title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: "outline", size: "default" }),
          "mt-5",
        )}
      >
        Wróć do rozkładu
      </Link>
    </div>
  );
}

type ScheduleChangesContentProps = {
  correction: {
    original: Schedule;
    modified: Schedule | null;
    activeUntil?: string;
  } | null;
};

export function ScheduleChangesContent({
  correction,
}: ScheduleChangesContentProps) {
  if (!correction) {
    return (
      <EmptyState
        title="Rozkład niedostępny"
        description="Nie udało się pobrać danych o korekcie. Spróbuj ponownie za chwilę."
      />
    );
  }

  if (!correction.modified) {
    return (
      <EmptyState
        title="Brak aktywnej korekty"
        description="Obecnie wyświetlany jest oficjalny rozkład bez tymczasowych zmian."
      />
    );
  }

  const items = diffSchedules(correction.original, correction.modified);

  if (items.length === 0) {
    return (
      <EmptyState
        title="Brak różnic"
        description="Aktywna korekta jest już zgodna z oficjalnym rozkładem — nie ma godzin do porównania."
      />
    );
  }

  const grouped = SECTION_ORDER.map((section) => ({
    section,
    items: items.filter((item) => item.section === section),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="space-y-8">
      {correction.activeUntil ? (
        <p className="text-sm text-muted-foreground">
          Korekta obowiązuje do{" "}
          <span className="font-medium text-foreground">
            {formatActiveUntil(correction.activeUntil)}
          </span>{" "}
          włącznie.
        </p>
      ) : null}

      {grouped.map((group) => (
        <section key={group.section} className="space-y-2">
          <h2 className="font-display text-lg font-semibold tracking-tight text-asphalt">
            {SECTION_LABELS[group.section]}
          </h2>
          <ul className="rounded-2xl border border-border/70 bg-card/70 px-4 sm:px-5">
            {group.items.map((item, index) => (
              <ChangeRow
                key={`${item.section}-${item.change}-${item.context}-${item.places.join("|")}-${item.fromTime ?? ""}-${item.toTime ?? ""}-${index}`}
                item={item}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
