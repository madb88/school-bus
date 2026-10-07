import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { GET, POST } from "./route";

const TOKEN = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";
const PREV = "zyxwvutsrqponmlkjihgfedcba9876543210ZYXWVUT";

const verifyLink = vi.fn();
const verifyCode = vi.fn();

vi.mock("@/lib/auth/backend", () => ({
  verifyLink: (...args: unknown[]) => verifyLink(...args),
  verifyCode: (...args: unknown[]) => verifyCode(...args),
}));

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "parent@example.com",
  role: "user" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("GET /api/auth/magic-link/verify", () => {
  beforeEach(() => {
    verifyLink.mockReset();
    verifyCode.mockReset();
  });

  it("sets the cookie and redirects to /profil on success", async () => {
    verifyLink.mockResolvedValue({
      ok: true,
      status: 200,
      data: { sessionToken: TOKEN, expiresAt: "2099-01-01T00:00:00.000Z", user },
    });

    const response = await GET(
      new Request(
        "http://localhost:3000/api/auth/magic-link/verify?token=magic-token",
        { headers: { cookie: `${SESSION_COOKIE}=${PREV}` } },
      ),
    );

    expect(verifyLink).toHaveBeenCalledWith("magic-token", PREV);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/profil");
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${SESSION_COOKIE}=${TOKEN}`);
  });

  it("redirects to ?login=invalid on 400", async () => {
    verifyLink.mockResolvedValue({
      ok: false,
      status: 400,
      error: "bad",
    });
    const response = await GET(
      new Request("http://localhost:3000/api/auth/magic-link/verify?token=x"),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?login=invalid",
    );
  });

  it("redirects to ?login=unavailable on 503", async () => {
    verifyLink.mockResolvedValue({
      ok: false,
      status: 503,
      error: "down",
    });
    const response = await GET(
      new Request("http://localhost:3000/api/auth/magic-link/verify?token=x"),
    );
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?login=unavailable",
    );
  });
});

describe("POST /api/auth/magic-link/verify", () => {
  beforeEach(() => {
    verifyLink.mockReset();
    verifyCode.mockReset();
  });

  it("passes errors through and forwards the previous cookie as Bearer", async () => {
    verifyCode.mockResolvedValue({
      ok: false,
      status: 429,
      error: "Zbyt wiele prób. Spróbuj ponownie za chwilę.",
      retryAfterSec: 12,
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/magic-link/verify", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${SESSION_COOKIE}=${PREV}`,
        },
        body: JSON.stringify({ email: "parent@example.com", code: "123456" }),
      }),
    );

    expect(verifyCode).toHaveBeenCalledWith(
      "parent@example.com",
      "123456",
      "unknown",
      PREV,
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("12");
    await expect(response.json()).resolves.toEqual({
      error: "Zbyt wiele prób. Spróbuj ponownie za chwilę.",
    });
  });

  it("sets the cookie on success", async () => {
    verifyCode.mockResolvedValue({
      ok: true,
      status: 200,
      data: { sessionToken: TOKEN, user },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/magic-link/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "parent@example.com", code: "123456" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.headers.get("set-cookie") ?? "").toContain(`${SESSION_COOKIE}=${TOKEN}`);
  });
});
