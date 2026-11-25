"use client";

import { Building2 } from "lucide-react";
import { FieldHelpHint } from "@/components/lesson-plan/field-help-hint";
import { cardClass } from "@/components/lesson-plan/styles";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import type { City, School } from "@/lib/schools/types";
import { cn } from "cn";

/** City + school of the plan: the plan picks its school on `/` and `/mzk`. */
export function SchoolSection({
  cities,
  schools,
  cityId,
  schoolId,
  disabled = false,
  onSchoolChange,
}: {
  cities: City[];
  /** All active schools (every city). */
  schools: School[];
  cityId: string;
  schoolId: string;
  disabled?: boolean;
  onSchoolChange: (next: { cityId: string; schoolId: string }) => void;
}) {
  const citySchools = schools.filter((school) => school.city.id === cityId);
  const cityItems = cities.filter((city) =>
    schools.some((school) => school.city.id === city.id),
  );

  return (
    <section className={cn(cardClass, "space-y-0")}>
      <FieldHelpHint
        title="Szkoła"
        description="Szkoła, do której jeździ dziecko. Po wybraniu planu na rozkładzie i w MZK ta szkoła ustawi się sama."
        icon={
          <Building2 className="size-4 shrink-0 text-bus-deep" aria-hidden />
        }
      />
      <div className="grid gap-3 pt-2 sm:grid-cols-2 md:pt-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label
            htmlFor="lesson-plan-city"
            className="text-xs text-muted-foreground"
          >
            Miasto
          </Label>
          <NativeSelect
            id="lesson-plan-city"
            className="w-full max-w-full [&_select]:h-11 md:[&_select]:h-10"
            value={cityId}
            disabled={disabled}
            onChange={(event) => {
              const nextCityId = event.target.value;
              const first = schools.find(
                (school) => school.city.id === nextCityId,
              );
              if (first) {
                onSchoolChange({ cityId: nextCityId, schoolId: first.id });
              }
            }}
          >
            {cityItems.map((city) => (
              <NativeSelectOption key={city.id} value={city.id}>
                {city.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label
            htmlFor="lesson-plan-school"
            className="text-xs text-muted-foreground"
          >
            Szkoła
          </Label>
          <NativeSelect
            id="lesson-plan-school"
            className="w-full max-w-full [&_select]:h-11 md:[&_select]:h-10"
            value={schoolId}
            disabled={disabled}
            onChange={(event) => {
              const next = event.target.value;
              if (next) onSchoolChange({ cityId, schoolId: next });
            }}
          >
            {citySchools.map((school) => (
              <NativeSelectOption key={school.id} value={school.id}>
                {school.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>
    </section>
  );
}
