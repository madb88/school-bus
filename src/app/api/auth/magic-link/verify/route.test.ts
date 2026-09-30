import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/auth/flow", () => ({
  loginWithMagicToken: vi.fn(async () => ({ ok: false, reason: "invalid" })),
  loginWithMagicCode: vi.fn(),
}));

describe("GET /api/auth/magic-link/verify", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "test-auth-secret");
  });

  it("redirects to /login without the token", async () => {
    const response = await GET(
      new Request(
        "http://localhost:3000/api/auth/magic-link/verify?token=super-secret-token",
      ),
    );

    expect(response.status).toBe(303);
    const location = response.headers.get("location");
    expect(location).toBe("http://localhost:3000/login?login=invalid");
    expect(location).not.toContain("super-secret-token");
    expect(location).not.toContain("token=");
  });
});
