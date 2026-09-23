import { describe, expect, it } from "vitest";
import { parseSchedule } from "./parse-schedule";

const SAMPLE_HTML = `
<!doctype html>
<html>
  <body>
    <div class="et_pb_text_inner">
      <h1>DOWOZY — wrzesień 2026</h1>
      <h2>Dowozy</h2>
      <h4>🚌 p. Jan Kowalski</h4>
      <p><strong>I kurs – od poniedziałku do czwartku</strong></p>
      <ul>
        <li>7:10 – Zatonie, Marzęcin</li>
        <li>7:30 – Ługowo</li>
      </ul>
      <h2>Odwozy</h2>
      <h3>Poniedziałek, 7 września</h3>
      <p><strong>p. Jan Kowalski</strong></p>
      <ul>
        <li>14:00 – Zatonie, Marzęcin</li>
        <li>14:20 – Ługowo</li>
      </ul>
    </div>
  </body>
</html>
`;

describe("parseSchedule", () => {
  it("extracts pickups, dropoffs and period from school HTML", () => {
    const schedule = parseSchedule(SAMPLE_HTML, {
      sourceUrl: "https://example.test/dowozy",
      fetchedAt: "2026-09-22T10:00:00.000Z",
    });

    expect(schedule.periodLabel.toLowerCase()).toContain("wrzesień 2026");
    expect(schedule.pickups).toHaveLength(1);
    expect(schedule.pickups[0].name).toContain("Jan Kowalski");
    expect(schedule.pickups[0].courses[0]).toMatchObject({
      label: "I kurs",
      note: "od poniedziałku do czwartku",
    });
    expect(schedule.pickups[0].courses[0].stops[0]).toEqual({
      time: "7:10",
      places: ["Zatonie", "Marzęcin"],
    });
    expect(schedule.dropoffsByDate[0]?.dateLabel).toContain("Poniedziałek");
    expect(schedule.dropoffsByDate[0]?.runs).toHaveLength(2);
  });
});
