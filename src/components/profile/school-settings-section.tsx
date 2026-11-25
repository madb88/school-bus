"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BackendUserSettings } from "@/lib/auth/backend";
import { MAX_VISIBLE_SCHOOLS } from "@/lib/schools/constants";
import {
  getHideSchoolFilterSnapshot,
  saveHideSchoolFilter,
  saveSchoolSelection,
  subscribeSchoolSelection,
} from "@/lib/schools/storage";
import type { City, School } from "@/lib/schools/types";

type SchoolSettingsSectionProps = {
  initialSettings: BackendUserSettings;
  cities: City[];
  /** Schools for the current default city (select). */
  initialSchools: School[];
  /** All schools across cities (visible-schools checklist). */
  allSchools: School[];
};

export function SchoolSettingsSection({
  initialSettings,
  cities,
  initialSchools,
  allSchools,
}: SchoolSettingsSectionProps) {
  const [cityId, setCityId] = useState(
    initialSettings.defaultCityId ?? cities[0]?.id ?? "",
  );
  const [schoolId, setSchoolId] = useState(
    initialSettings.defaultSchoolId ?? initialSchools[0]?.id ?? "",
  );
  const [schools, setSchools] = useState(initialSchools);
  const [visibleIds, setVisibleIds] = useState<string[]>(
    initialSettings.visibleSchoolIds ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [savingVisible, setSavingVisible] = useState(false);
  const hideRaw = useSyncExternalStore(
    subscribeSchoolSelection,
    getHideSchoolFilterSnapshot,
    () => "",
  );
  const hideFilter = hideRaw === "1";

  useEffect(() => {
    if (!cityId) return;
    let cancelled = false;
    void fetch(`/api/schools?cityId=${encodeURIComponent(cityId)}`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as School[];
        if (cancelled || !Array.isArray(data)) return;
        setSchools(data);
        if (!data.some((s) => s.id === schoolId)) {
          setSchoolId(data[0]?.id ?? "");
        }
      })
      .catch(() => {
        // ignore — keep current list
      });
    return () => {
      cancelled = true;
    };
  }, [cityId, schoolId]);

  const schoolsByCity = useMemo(() => {
    const byCity = new Map<string, School[]>();
    for (const school of allSchools) {
      const list = byCity.get(school.city.id) ?? [];
      list.push(school);
      byCity.set(school.city.id, list);
    }
    return cities
      .map((city) => ({
        city,
        schools: byCity.get(city.id) ?? [],
      }))
      .filter((group) => group.schools.length > 0);
  }, [allSchools, cities]);

  const atVisibleCap = visibleIds.length >= MAX_VISIBLE_SCHOOLS;

  function toggleVisible(id: string, checked: boolean) {
    setVisibleIds((prev) => {
      if (checked) {
        if (prev.includes(id) || prev.length >= MAX_VISIBLE_SCHOOLS) return prev;
        return [...prev, id];
      }
      return prev.filter((item) => item !== id);
    });
  }

  async function save() {
    if (!cityId || !schoolId) {
      toast.error("Wybierz miasto i szkołę.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/account/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          defaultCityId: cityId,
          defaultSchoolId: schoolId,
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(data?.error ?? "Nie udało się zapisać ustawień.");
        return;
      }
      saveSchoolSelection({ cityId, schoolId });
      toast.success("Zapisano szkołę domyślną.");
    } catch {
      toast.error("Nie udało się połączyć z serwerem.");
    } finally {
      setSaving(false);
    }
  }

  async function saveVisibleSchools() {
    setSavingVisible(true);
    try {
      const response = await fetch("/api/account/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visibleSchoolIds: visibleIds }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(data?.error ?? "Nie udało się zapisać listy szkół.");
        return;
      }
      toast.success(
        visibleIds.length === 0
          ? "Filtr szkół wyczyszczony — widać wszystkie."
          : "Zapisano szkoły widoczne w filtrze.",
      );
    } catch {
      toast.error("Nie udało się połączyć z serwerem.");
    } finally {
      setSavingVisible(false);
    }
  }

  const cityItems = cities.map((c) => ({ label: c.name, value: c.id }));
  const schoolItems = schools.map((s) => ({ label: s.name, value: s.id }));

  return (
    <div className="space-y-5 rounded-2xl bg-muted/55 px-5 py-5 sm:px-6 sm:py-6 dark:bg-muted/30">
      <div className="space-y-1">
        <h3 className="font-display text-base font-semibold text-asphalt dark:text-foreground">
          Szkoła
        </h3>
        <p className="text-sm text-muted-foreground">
          Domyślne miasto i szkoła na koncie. Możesz też ukryć ich wybór na
          stronie głównej (tylko na tym urządzeniu).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="profile-city">Miasto</Label>
          <Select
            items={cityItems}
            value={cityId}
            onValueChange={(next) => {
              if (next) setCityId(next);
            }}
          >
            <SelectTrigger id="profile-city" className="w-full bg-card">
              <SelectValue placeholder="Wybierz miasto" />
            </SelectTrigger>
            <SelectContent>
              {cityItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profile-school">Szkoła</Label>
          <Select
            items={schoolItems}
            value={schoolId}
            onValueChange={(next) => {
              if (next) setSchoolId(next);
            }}
          >
            <SelectTrigger id="profile-school" className="w-full bg-card">
              <SelectValue placeholder="Wybierz szkołę" />
            </SelectTrigger>
            <SelectContent>
              {schoolItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4 rounded border-border"
          checked={hideFilter}
          onChange={(event) => {
            saveHideSchoolFilter(event.target.checked);
          }}
        />
        <span>
          Nie pokazuj wyboru szkoły na stronie głównej
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Zapisane tylko na tym urządzeniu.
          </span>
        </span>
      </label>

      <Button
        type="button"
        size="lg"
        className="w-full sm:w-auto"
        disabled={saving || !cityId || !schoolId}
        onClick={() => void save()}
      >
        {saving ? "Zapisywanie…" : "Zapisz szkołę"}
      </Button>

      <div className="space-y-3 border-t border-border/50 pt-5">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-foreground">
            Szkoły widoczne w filtrze
          </h4>
          <p className="text-sm text-muted-foreground">
            Wybierz najwyżej {MAX_VISIBLE_SCHOOLS} szkół pokazywanych w wyborze
            miasta i szkoły na rozkładzie. Bez zaznaczenia widać wszystkie.
          </p>
        </div>

        <div className="space-y-4">
          {schoolsByCity.map(({ city, schools: citySchools }) => (
            <div key={city.id} className="space-y-2">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {city.name}
              </p>
              <ul className="space-y-2">
                {citySchools.map((school) => {
                  const checked = visibleIds.includes(school.id);
                  const disabled = !checked && atVisibleCap;
                  return (
                    <li key={school.id}>
                      <label
                        className={`flex cursor-pointer items-start gap-2.5 text-sm ${
                          disabled ? "cursor-not-allowed opacity-60" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4 rounded border-border"
                          checked={checked}
                          disabled={disabled}
                          onChange={(event) => {
                            toggleVisible(school.id, event.target.checked);
                          }}
                        />
                        <span>{school.name}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {atVisibleCap ? (
          <p className="text-xs text-muted-foreground">
            Wybrano już {MAX_VISIBLE_SCHOOLS} szkół — odznacz jedną, żeby
            dodać inną.
          </p>
        ) : null}

        <Button
          type="button"
          size="lg"
          variant="outline"
          className="w-full sm:w-auto"
          disabled={savingVisible}
          onClick={() => void saveVisibleSchools()}
        >
          {savingVisible ? "Zapisywanie…" : "Zapisz widoczne szkoły"}
        </Button>
      </div>
    </div>
  );
}
