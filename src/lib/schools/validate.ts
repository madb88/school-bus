import type { City, School } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isCity(value: unknown): value is City {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.trim() !== "" &&
    typeof value.name === "string" &&
    value.name.trim() !== ""
  );
}

export function isSchool(value: unknown): value is School {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || !value.id.trim()) return false;
  if (typeof value.name !== "string" || !value.name.trim()) return false;
  if (!isRecord(value.city)) return false;
  if (typeof value.city.id !== "string" || !value.city.id.trim()) return false;
  if (typeof value.city.name !== "string" || !value.city.name.trim()) {
    return false;
  }
  return true;
}

export function parseCities(value: unknown): City[] | null {
  if (!Array.isArray(value)) return null;
  const out: City[] = [];
  for (const item of value) {
    if (!isCity(item)) return null;
    out.push({ id: item.id.trim(), name: item.name.trim() });
  }
  return out;
}

export function parseSchools(value: unknown): School[] | null {
  if (!Array.isArray(value)) return null;
  const out: School[] = [];
  for (const item of value) {
    if (!isSchool(item)) return null;
    const school: School = {
      id: item.id.trim(),
      name: item.name.trim(),
      city: {
        id: item.city.id.trim(),
        name: item.city.name.trim(),
      },
    };
    if (typeof item.address === "string" && item.address.trim()) {
      school.address = item.address.trim();
    }
    if (typeof item.phone === "string" && item.phone.trim()) {
      school.phone = item.phone.trim();
    }
    if (typeof item.email === "string" && item.email.trim()) {
      school.email = item.email.trim();
    }
    if (typeof item.website === "string" && item.website.trim()) {
      school.website = item.website.trim();
    }
    out.push(school);
  }
  return out;
}

export function parsePlacesList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !item.trim()) return null;
    out.push(item.trim());
  }
  return out;
}
