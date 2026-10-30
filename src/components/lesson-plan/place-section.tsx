"use client";

import { MapPin } from "lucide-react";
import { FieldHelpHint } from "@/components/lesson-plan/field-help-hint";
import { cardClass } from "@/components/lesson-plan/styles";
import { PlaceCombobox } from "@/components/place-combobox";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { cn } from "cn";

export function PlaceSection({
  places,
  place,
  placeInvalid,
  onPlaceChange,
}: {
  places: string[];
  place: string | null;
  placeInvalid: boolean;
  onPlaceChange: (next: string | null) => void;
}) {
  return (
    <section
      className={cn(
        cardClass,
        "flex h-full flex-col space-y-0",
        placeInvalid && "border-destructive/60",
      )}
    >
      <FieldHelpHint
        title="Przystanek"
        description="Wybierz przystanek, z którego dziecko jedzie do szkoły."
        icon={
          <MapPin className="size-4 shrink-0 text-bus-deep" aria-hidden />
        }
      />
      <div className="mt-auto flex w-full min-w-0 flex-col gap-1.5 pt-2 md:pt-3">
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
          aria-invalid={placeInvalid || undefined}
          value={place ?? ""}
          onChange={(event) => {
            onPlaceChange(
              event.target.value === "" ? null : event.target.value,
            );
          }}
        >
          <NativeSelectOption value="">Wybierz miejsce</NativeSelectOption>
          {places.map((item) => (
            <NativeSelectOption key={item} value={item}>
              {item}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <div className="hidden w-full min-w-0 md:block">
          <PlaceCombobox
            id="lesson-place-desktop"
            places={places}
            value={place}
            onChange={onPlaceChange}
            invalid={placeInvalid}
            aria-labelledby="lesson-place-label"
            placeholder="Wybierz lub szukaj miejsca…"
          />
        </div>
        {placeInvalid ? (
          <p className="text-sm text-destructive" role="alert">
            Wybierz przystanek.
          </p>
        ) : null}
      </div>
    </section>
  );
}
