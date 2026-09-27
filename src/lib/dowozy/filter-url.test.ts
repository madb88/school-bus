import { describe, expect, it } from "vitest";
import {
  filtersHref,
  parseFilterParams,
  serializeFilterParams,
} from "./filter-url";

describe("parseFilterParams", () => {
  it("returns empty defaults when no keys present", () => {
    expect(parseFilterParams({})).toEqual({
      place: undefined,
      dateFilter: undefined,
      direction: undefined,
      matchLessonPlan: undefined,
      sourceMode: undefined,
      hasExplicit: false,
    });
  });

  it("parses Polish query aliases", () => {
    const parsed = parseFilterParams({
      dopasuj: "tak",
      dzien: "jutro",
      miejsce: "Zatonie",
      kierunek: "odwozy",
      zrodlo: "szkolny-mzk",
    });

    expect(parsed).toMatchObject({
      matchLessonPlan: true,
      dateFilter: "tomorrow",
      place: "Zatonie",
      direction: "dropoffs",
      sourceMode: "school-mzk",
      hasExplicit: true,
    });
  });

  it("treats empty miejsce as explicit null", () => {
    expect(parseFilterParams({ miejsce: "" }).place).toBeNull();
  });

  it("parses absolute YYYY-MM-DD day", () => {
    expect(parseFilterParams({ dzien: "2026-09-15" }).dateFilter).toBe(
      "2026-09-15",
    );
  });

  it("turns dopasuj=0 off", () => {
    expect(parseFilterParams({ dopasuj: "0" }).matchLessonPlan).toBe(false);
  });
});

describe("serializeFilterParams", () => {
  it("omits today and direction=all defaults", () => {
    expect(
      serializeFilterParams({
        place: null,
        dateFilter: "today",
        direction: "all",
        matchLessonPlan: false,
      }),
    ).toBe("");
  });

  it("writes non-default filters", () => {
    const qs = serializeFilterParams({
      place: "Zatonie",
      dateFilter: "tomorrow",
      direction: "pickups",
      matchLessonPlan: true,
      sourceMode: "school-mzk",
    });
    const params = new URLSearchParams(qs);
    expect(params.get("miejsce")).toBe("Zatonie");
    expect(params.get("dzien")).toBe("jutro");
    expect(params.get("kierunek")).toBe("dowozy");
    expect(params.get("dopasuj")).toBe("1");
    expect(params.get("zrodlo")).toBe("szkolny-mzk");
  });

  it("can persist explicit school-only and match-off", () => {
    const qs = serializeFilterParams({
      place: null,
      dateFilter: "today",
      direction: "all",
      matchLessonPlan: false,
      persistMatchOff: true,
      persistSourceSchool: true,
    });
    const params = new URLSearchParams(qs);
    expect(params.get("dopasuj")).toBe("0");
    expect(params.get("zrodlo")).toBe("szkolny");
  });
});

describe("filtersHref", () => {
  it("returns root when empty", () => {
    expect(
      filtersHref({
        place: null,
        dateFilter: "today",
        direction: "all",
      }),
    ).toBe("/");
  });

  it("prefixes query with /?", () => {
    expect(
      filtersHref({
        place: "Zatonie",
        dateFilter: "today",
        direction: "all",
        matchLessonPlan: true,
      }),
    ).toBe("/?dopasuj=1&miejsce=Zatonie");
  });
});
