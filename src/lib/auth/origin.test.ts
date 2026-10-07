import { afterEach, describe, expect, it, vi } from "vitest";
import { loginLinkOrigin } from "./origin";

describe("loginLinkOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the local request origin instead of the public site", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://autobusszkolny.pl");
    expect(loginLinkOrigin("http://localhost:3000/api/auth/magic-link")).toBe(
      "http://localhost:3000",
    );
    expect(loginLinkOrigin("http://192.168.100.251:3000/login")).toBe(
      "http://192.168.100.251:3000",
    );
  });

  it("keeps the public site when the request host is not local", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://autobusszkolny.pl");
    expect(loginLinkOrigin("https://evil.example/api/auth/magic-link")).toBe(
      "https://autobusszkolny.pl",
    );
    expect(loginLinkOrigin("https://autobusszkolny.pl/api/auth/magic-link")).toBe(
      "https://autobusszkolny.pl",
    );
  });
});
