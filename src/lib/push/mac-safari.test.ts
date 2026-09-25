import { describe, expect, it } from "vitest";
import { isMacSafariUserAgent } from "@/lib/push/browser";

const MAC_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15";
const MAC_CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1";

describe("isMacSafariUserAgent", () => {
  it("matches desktop Safari", () => {
    expect(isMacSafariUserAgent(MAC_SAFARI)).toBe(true);
  });

  it("ignores Chrome on Mac and iPhone Safari", () => {
    expect(isMacSafariUserAgent(MAC_CHROME)).toBe(false);
    expect(isMacSafariUserAgent(IPHONE_SAFARI)).toBe(false);
  });
});
