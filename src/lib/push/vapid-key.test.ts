import { describe, expect, it } from "vitest";
import {
  normalizeVapidPublicKey,
  parseApplicationServerKey,
} from "./vapid-key";

const VALID =
  "BA2RgoeKvCjWFPtv_GSwA1jBUXVlKhanYRkYX1cE3l55yf8U1yQjcpoNwYgozjMKhSB40rglSF2dAQzszThCZQw";

describe("vapid-key", () => {
  it("accepts a valid public key and quoted env values", () => {
    expect(parseApplicationServerKey(VALID)).not.toBeNull();
    expect(parseApplicationServerKey(`"${VALID}"`)).not.toBeNull();
    expect(normalizeVapidPublicKey(`  '${VALID}'  `)).toBe(VALID);
  });

  it("rejects private-key-sized or garbage values", () => {
    expect(parseApplicationServerKey("not-a-key")).toBeNull();
    expect(
      parseApplicationServerKey("h6td88k-fPRpYGSFcuz7kFsbIogfI9AVncKgWCVZnAE"),
    ).toBeNull();
  });
});
