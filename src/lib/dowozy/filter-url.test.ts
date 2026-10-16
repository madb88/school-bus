import { describe, expect, it } from "vitest";
import {
  filtersHref,
  parseFilterParams,
  serializeFilterParams,
} from "./filter-url";

describe("parseFilterParams", () => {
  it("returns empty defaults when no keys present", () => {
    expect(parseFilterParams({})).toEqual({
      places: undefined,
      dateFilter: undefined,
      direction: undefined,
      planMatch: undefined,
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
      planMatch: "all",
      matchLessonPlan: true,
      dateFilter: "tomorrow",
      places: ["Zatonie"],
      direction: "dropoffs",
      sourceMode: "school-mzk",
      hasExplicit: true,
    });
  });

  it("parses a single plan index", () => {
    expect(parseFilterParams({ dopasuj: "1", plan: "2" }).planMatch).toBe(2);
    expect(parseFilterParams({ plan: "0" }).planMatch).toBe(0);
  });

  it("parses comma-separated places", () => {
    expect(parseFilterParams({ miejsce: "Zatonie,Ochla" }).places).toEqual([
      "Zatonie",
      "Ochla",
    ]);
  });

  it("treats empty miejsce as explicit null", () => {
    expect(parseFilterParams({ miejsce: "" }).places).toBeNull();
  });

  it("parses absolute YYYY-MM-DD day", () => {
    expect(parseFilterParams({ dzien: "2026-09-15" }).dateFilter).toBe(
      "2026-09-15",
    );
  });

  it("turns dopasuj=0 off", () => {
    expect(parseFilterParams({ dopasuj: "0" }).planMatch).toBe("off");
    expect(parseFilterParams({ dopasuj: "0" }).matchLessonPlan).toBe(false);
  });
});

describe("serializeFilterParams", () => {
  it("omits today and direction=all defaults", () => {
    expect(
      serializeFilterParams({
        places: null,
        dateFilter: "today",
        direction: "all",
        planMatch: "off",
      }),
    ).toBe("");
  });

  it("writes non-default filters", () => {
    const qs = serializeFilterParams({
      places: ["Zatonie"],
      dateFilter: "tomorrow",
      direction: "pickups",
      planMatch: "all",
      sourceMode: "school-mzk",
    });
    const params = new URLSearchParams(qs);
    expect(params.get("miejsce")).toBe("Zatonie");
    expect(params.get("dzien")).toBe("jutro");
    expect(params.get("kierunek")).toBe("dowozy");
    expect(params.get("dopasuj")).toBe("1");
    expect(params.get("plan")).toBeNull();
    expect(params.get("zrodlo")).toBe("szkolny-mzk");
  });

  it("serializes a single plan index", () => {
    const qs = serializeFilterParams({
      places: null,
      dateFilter: "today",
      direction: "all",
      planMatch: 1,
    });
    const params = new URLSearchParams(qs);
    expect(params.get("dopasuj")).toBe("1");
    expect(params.get("plan")).toBe("1");
  });

  it("serializes multiple places", () => {
    const qs = serializeFilterParams({
      places: ["Zatonie", "Ochla"],
      dateFilter: "today",
      direction: "all",
      planMatch: "off",
    });
    expect(new URLSearchParams(qs).get("miejsce")).toBe("Zatonie,Ochla");
  });

  it("can persist explicit school-only and match-off", () => {
    const qs = serializeFilterParams({
      places: null,
      dateFilter: "today",
      direction: "all",
      planMatch: "off",
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
