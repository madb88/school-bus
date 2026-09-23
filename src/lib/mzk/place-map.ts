/**
 * Seed stops near school-bus places + school (Drzonków).
 * Pipeline keeps full paths of trips that visit any of these,
 * so the user can pick other stops along the same lines.
 *
 * Książ / Marzęcin have no MZK stop of their own — mapped to the
 * nearest villages that share the school-bus run (for route suggestions).
 */
export const SCHOOL_PLACE_TO_MZK_STOP_IDS: Record<string, string[]> = {
  "Barcikowice D.": ["353"],
  "Barcikowice M.": ["987"],
  Zatonie: ["350", "356"],
  Ługowo: ["720", "381"],
  Sucha: ["379", "722"],
  "Złote Piaski": ["921", "922"],
  "Nowy Kisielin": ["808", "750"],
  "Stary Kisielin": ["203", "215"],
  // Same pickup time as Zatonie on the school bus.
  Marzęcin: ["350", "356"],
  // Next village after Barcikowice D. on the afternoon run.
  Książ: ["353", "987"],
};

/** Shown on /mzk when suggestions come from a neighbouring MZK stop. */
export const SCHOOL_PLACE_MZK_NEAREST_NOTE: Partial<Record<string, string>> = {
  Marzęcin: "Brak przystanku MZK w Marzęcinie — propozycje z Zatonia.",
  Książ: "Brak przystanku MZK w Książu — propozycje z Barcikowic.",
};

/** Przystanki przy Szkole Olimpijczyków / WOSiR Drzonków. */
export const SCHOOL_AREA_MZK_STOP_IDS = [
  "299", // Drzonków Olimpijska
  "307", // Drzonków - WOSiR
  "914", // Drzonków - WOSiR
  "303", // DRZONKÓW
  "300", // Drzonków Strumykowa
  "306", // Drzonków Strumykowa
] as const;

export function seedMzkStopIds(): string[] {
  return [
    ...new Set([
      ...Object.values(SCHOOL_PLACE_TO_MZK_STOP_IDS).flat(),
      ...SCHOOL_AREA_MZK_STOP_IDS,
    ]),
  ];
}

export function mzkStopIdsForPlace(schoolPlace: string): string[] {
  return SCHOOL_PLACE_TO_MZK_STOP_IDS[schoolPlace] ?? [];
}

export function mzkNearestPlaceNote(schoolPlace: string | null): string | null {
  if (!schoolPlace) return null;
  return SCHOOL_PLACE_MZK_NEAREST_NOTE[schoolPlace] ?? null;
}
