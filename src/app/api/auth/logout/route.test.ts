import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { POST } from "./route";

const TOKEN = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";
const logout = vi.fn();

vi.mock("@/lib/auth/backend", () => ({
  logout: (...args: unknown[]) => logout(...args),
}));

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    logout.mockReset();
  });

  it("clears the cookie even when the backend fails", async () => {
    logout.mockRejectedValue(new Error("backend down"));
    const response = await POST(
      new Request("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: { cookie: `${SESSION_COOKIE}=${TOKEN}` },
      }),
    );

    expect(logout).toHaveBeenCalledWith(TOKEN);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie.toLowerCase()).toContain("max-age=0");
  });

  it("returns ok without calling the backend when there is no cookie", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/auth/logout", { method: "POST" }),
    );
    expect(logout).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
