"use client";

import { ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "cn";

type PlaceMultiSelectProps = {
  places: string[];
  value: string[] | null;
  onChange: (next: string[] | null) => void;
  labelledBy?: string;
  id?: string;
  className?: string;
};

function summaryLabel(value: string[] | null): string {
  if (!value || value.length === 0) return "Wszystkie miejsca";
  if (value.length === 1) return value[0]!;
  return `${value.length} miejsca`;
}

export function PlaceMultiSelect({
  places,
  value,
  onChange,
  labelledBy,
  id,
  className,
}: PlaceMultiSelectProps) {
  const selected = value ?? [];

  function toggle(place: string) {
    if (selected.includes(place)) {
      const next = selected.filter((item) => item !== place);
      onChange(next.length > 0 ? next : null);
      return;
    }
    onChange([...selected, place]);
  }

  return (
    <Popover>
      <PopoverTrigger
        id={id}
        type="button"
        aria-labelledby={labelledBy}
        className={cn(
          "inline-flex h-9 w-full max-w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 text-sm font-normal outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/50",
          className,
        )}
      >
        <span className="truncate">{summaryLabel(value)}</span>
        <ChevronDown aria-hidden className="size-4 shrink-0 opacity-60" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(100vw-2rem,18rem)] p-2">
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm",
            !value || value.length === 0
              ? "bg-muted/70 font-medium"
              : "hover:bg-muted/50",
          )}
          onClick={() => onChange(null)}
        >
          Wszystkie miejsca
        </button>
        <div className="mt-1 max-h-64 space-y-0.5 overflow-y-auto">
          {places.map((place) => {
            const checked = selected.includes(place);
            return (
              <label
                key={place}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm",
                  checked ? "bg-bus/8" : "hover:bg-muted/50",
                )}
              >
                <input
                  type="checkbox"
                  className="size-4 shrink-0 accent-bus"
                  checked={checked}
                  onChange={() => toggle(place)}
                />
                <span className="min-w-0 truncate">{place}</span>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
