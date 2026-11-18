"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
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
  initialSchools: School[];
};

export function SchoolSettingsSection({
  initialSettings,
  cities,
  initialSchools,
}: SchoolSettingsSectionProps) {
  const [cityId, setCityId] = useState(
    initialSettings.defaultCityId ?? cities[0]?.id ?? "",
  );
  const [schoolId, setSchoolId] = useState(
    initialSettings.defaultSchoolId ?? initialSchools[0]?.id ?? "",
  );
  const [schools, setSchools] = useState(initialSchools);
  const [saving, setSaving] = useState(false);
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
    </div>
  );
}
