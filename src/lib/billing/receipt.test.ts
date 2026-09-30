import { describe, expect, it } from "vitest";
import { PLUS_RECEIPT_SUBJECT, PLUS_RENEWAL_SUBJECT, plusPurchaseEmailText } from "./receipt";

describe("plus purchase email", () => {
  it("fills the access dates and keeps the confirmation copy", () => {
    const text = plusPurchaseEmailText({
      startedOn: "2026-09-15",
      endsOn: "2027-08-31",
    });
    expect(PLUS_RECEIPT_SUBJECT).toBe(
      "Potwierdzenie zakupu Planu Plus – Autobus Szkolny",
    );
    expect(text).toContain("Data rozpoczęcia świadczenia usługi: 15 września 2026");
    expect(text).toContain("Data zakończenia dostępu: 31 sierpnia 2027");
    expect(text).toContain("Cena: 30,00 zł");
    expect(text).toContain("https://www.autobusszkolny.pl");
    expect(text).not.toContain("przedłużenie");
  });

  it("marks an extension in the subject and the body", () => {
    const text = plusPurchaseEmailText({
      startedOn: "2026-10-01",
      endsOn: "2028-08-31",
      renewal: true,
    });
    expect(PLUS_RENEWAL_SUBJECT).toBe(
      "Potwierdzenie przedłużenia Planu Plus – Autobus Szkolny",
    );
    expect(text).toContain("potwierdzamy przedłużenie Planu Plus");
    expect(text).toContain("Rodzaj: przedłużenie");
    expect(text).toContain("Data przedłużenia: 1 października 2026");
    expect(text).toContain("Data zakończenia dostępu: 31 sierpnia 2028");
  });
});
