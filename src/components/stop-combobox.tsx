"use client";

import { useId, useMemo } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { cn } from "cn";
import type { MzkStop } from "@/lib/mzk/types";

type StopComboboxProps = {
  stops: MzkStop[];
  value: string | null;
  onChange: (stopId: string) => void;
  placeholder?: string;
  id?: string;
  "aria-label"?: string;
};

export function StopCombobox({
  stops,
  value,
  onChange,
  placeholder = "Szukaj przystanku…",
  id: idProp,
  "aria-label": ariaLabel,
}: StopComboboxProps) {
  const autoId = useId();
  const inputId = idProp ?? autoId;

  const collection = useMemo(
    () =>
      Combobox.createItems(stops, {
        getValue: (stop) => stop.id,
        getLabel: (stop) => stop.name,
      }),
    [stops],
  );

  return (
    <Combobox.Root
      items={collection}
      value={value}
      onValueChange={(next) => {
        onChange(typeof next === "string" ? next : "");
      }}
    >
      <Combobox.InputGroup
        className={cn(
          "relative flex h-11 w-full items-center rounded-lg border border-border bg-card",
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          "[&>input]:pr-16 has-[.combobox-clear]:[&>input]:pr-16",
        )}
      >
        <Combobox.Input
          id={inputId}
          aria-label={ariaLabel}
          placeholder={placeholder}
          className="h-full w-full min-w-0 rounded-lg border-0 bg-transparent px-3 text-base text-foreground outline-none placeholder:text-muted-foreground"
        />
        <div className="absolute inset-y-0 right-0 flex items-center text-muted-foreground">
          <Combobox.Clear
            className="combobox-clear flex size-9 items-center justify-center rounded-md hover:bg-muted hover:text-foreground"
            aria-label="Wyczyść"
          >
            <ClearIcon />
          </Combobox.Clear>
          <Combobox.Trigger
            className="flex size-9 items-center justify-center rounded-md hover:bg-muted hover:text-foreground"
            aria-label="Pokaż listę"
          >
            <ChevronIcon />
          </Combobox.Trigger>
        </div>
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner className="z-50 outline-none" sideOffset={4}>
          <Combobox.Popup
            className={cn(
              "w-[var(--anchor-width)] max-w-[var(--available-width)] overflow-hidden rounded-lg border border-border bg-card text-foreground shadow-lg",
              "origin-[var(--transform-origin)] transition-[scale,opacity] duration-100",
              "data-starting-style:scale-95 data-starting-style:opacity-0",
              "data-ending-style:scale-95 data-ending-style:opacity-0",
            )}
          >
            <Combobox.Empty>
              <div className="px-3 py-4 text-sm text-muted-foreground">
                Brak pasujących przystanków.
              </div>
            </Combobox.Empty>
            <Combobox.List className="max-h-[min(18rem,var(--available-height))] overflow-y-auto overscroll-contain py-1 outline-none data-empty:p-0">
              {(stop: MzkStop) => (
                <Combobox.Item
                  key={stop.id}
                  value={stop.id}
                  className={cn(
                    "grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 px-3 py-2 text-sm outline-none select-none",
                    "data-highlighted:bg-muted data-highlighted:text-foreground",
                    "data-selected:font-medium",
                  )}
                >
                  <Combobox.ItemIndicator className="col-start-1 flex justify-center text-mzk-deep">
                    <CheckIcon />
                  </Combobox.ItemIndicator>
                  <span className="col-start-2 truncate">{stop.name}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="m2.5 8.5 4 4 7-9" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}
