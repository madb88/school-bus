import { describe, expect, it } from "vitest";
import { magicLinkFromAddress } from "./mail";

describe("magicLinkFromAddress", () => {
  it("keeps the verified address and uses a login display name", () => {
    expect(magicLinkFromAddress("Opinia <hello@example.com>")).toBe(
      "Logowanie <hello@example.com>",
    );
    expect(magicLinkFromAddress("hello@example.com")).toBe(
      "Logowanie <hello@example.com>",
    );
  });
});
