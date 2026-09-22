/**
 * Seed stops near school-bus places + school (Drzonków).
 * Pipeline keeps full paths of trips that visit any of these,
 * so the user can pick other stops along the same lines.
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
