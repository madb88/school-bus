import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const requestMagicLink = vi.fn();

vi.mock("@/lib/auth/backend", () => ({
  requestMagicLink: (...args: unknown[]) => requestMagicLink(...args),
}));

describe("POST /api/auth/magic-link", () => {
  beforeEach(() => {
    requestMagicLink.mockReset();
  });

  it("returns ok when the backend accepts the request", async () => {
    requestMagicLink.mockResolvedValue({ ok: true });
    const response = await POST(
      new Request("http://localhost:3000/api/auth/magic-link", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.10",
        },
        body: JSON.stringify({ email: "parent@example.com" }),
      }),
    );
    expect(requestMagicLink).toHaveBeenCalledWith("parent@example.com", "203.0.113.10");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("passes through backend errors", async () => {
    requestMagicLink.mockResolvedValue({
      ok: false,
      status: 422,
      error: "Podaj prawidłowy adres e-mail.",
    });
    const response = await POST(
      new Request("http://localhost:3000/api/auth/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "nope" }),
      }),
    );
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: "Podaj prawidłowy adres e-mail.",
    });
  });
});
