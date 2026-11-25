import { describe, expect, it } from "vitest";
import {
  filterVisibleCities,
  filterVisibleSchools,
} from "./visible-schools";
import type { City, School } from "./types";

const cities: City[] = [
  { id: "c1", name: "Zielona Góra" },
  { id: "c2", name: "Nowa Sól" },
];

const schools: School[] = [
  {
    id: "s1",
    name: "Olimpijczyków",
    city: { id: "c1", name: "Zielona Góra" },
  },
  {
    id: "s2",
    name: "Inna ZG",
    city: { id: "c1", name: "Zielona Góra" },
  },
  {
    id: "s3",
    name: "Nowa Sól 1",
    city: { id: "c2", name: "Nowa Sól" },
  },
];

describe("filterVisibleSchools", () => {
  it("returns all when visible is empty", () => {
    expect(filterVisibleSchools(schools, [], "s1")).toEqual(schools);
    expect(filterVisibleSchools(schools, null, "s1")).toEqual(schools);
  });

  it("keeps the selected school even outside the set", () => {
    expect(filterVisibleSchools(schools, ["s3"], "s1").map((s) => s.id)).toEqual(
      ["s1", "s3"],
    );
  });

  it("ignores stale ids", () => {
    expect(filterVisibleSchools(schools, ["nope", "s2"], "s1").map((s) => s.id)).toEqual(
      ["s1", "s2"],
    );
  });
});

describe("filterVisibleCities", () => {
  it("hides cities without a visible school", () => {
    expect(
      filterVisibleCities(cities, schools, ["s3"], "s3").map((c) => c.id),
    ).toEqual(["c2"]);
  });

  it("keeps the city of the selected school", () => {
    expect(
      filterVisibleCities(cities, schools, ["s3"], "s1").map((c) => c.id).sort(),
    ).toEqual(["c1", "c2"]);
  });
});
