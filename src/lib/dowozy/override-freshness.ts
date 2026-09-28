import type { FreshnessInfo } from "@/lib/schedule-freshness";
import type { OverrideStatus, ScheduleSnapshotResult } from "./types";

const CONFLICT_DETAIL =
  "Korekta została wprowadzona na podstawie aktualizacji przekazanej rodzicom. Oficjalna strona dowozów może jeszcze zawierać poprzednią wersję.";

const CONFLICT_DETAIL_COMPACT =
  "Aktualizacja została przekazana rodzicom. Oficjalna strona może jeszcze zawierać poprzednią wersję.";

/**
 * User-facing freshness row when a manual override is in effect.
 * Returns null when override is inactive/expired/absent.
 */
export function overrideFreshnessInfo(
  loaded: Pick<ScheduleSnapshotResult, "source" | "overrideStatus">,
): FreshnessInfo | null {
  if (loaded.source !== "override") return null;

  const status: OverrideStatus = loaded.overrideStatus;
  if (status === "override_matches_source") {
    return {
      level: "ok",
      message: "Korekta jest już zgodna z oficjalnym rozkładem.",
    };
  }

  if (status === "override_active_conflict") {
    return {
      level: "stale",
      message: "Rozkład zawiera tymczasową korektę.",
      detail: CONFLICT_DETAIL,
      messageCompact: "Tymczasowa korekta rozkładu",
      detailCompact: CONFLICT_DETAIL_COMPACT,
    };
  }

  return null;
}
