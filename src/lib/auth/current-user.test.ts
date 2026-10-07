import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_COOKIE } from "./constants";

const fetchMe = vi.fn();
const cookieGet = vi.fn();

vi.mock("./backend", () => ({
  fetchMe: (...args: unknown[]) => fetchMe(...args),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieGet(name),
  }),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  };
});

const TOKEN = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";

describe("getCurrentUser", () => {
  beforeEach(() => {
    fetchMe.mockReset();
    cookieGet.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  async function load() {
    const mod = await import("./current-user");
    mod.resetCurrentUserWarnCache();
    return mod.getCurrentUser;
  }

  it("returns null without fetching when the cookie is missing", async () => {
    cookieGet.mockReturnValue(undefined);
    const getCurrentUser = await load();
    expect(await getCurrentUser()).toBeNull();
    expect(fetchMe).not.toHaveBeenCalled();
  });

  it("returns null without fetching when the cookie is malformed", async () => {
    cookieGet.mockImplementation((name: string) =>
      name === SESSION_COOKIE ? { value: "old.sealed.value" } : undefined,
    );
    const getCurrentUser = await load();
    expect(await getCurrentUser()).toBeNull();
    expect(fetchMe).not.toHaveBeenCalled();
  });

  it("returns the user on 200", async () => {
    cookieGet.mockImplementation((name: string) =>
      name === SESSION_COOKIE ? { value: TOKEN } : undefined,
    );
    fetchMe.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      email: "parent@example.com",
      role: "user",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const getCurrentUser = await load();
    expect(await getCurrentUser()).toEqual({
      userId: "11111111-1111-4111-8111-111111111111",
      email: "parent@example.com",
      role: "user",
    });
    expect(fetchMe).toHaveBeenCalledWith(TOKEN);
  });

  it("returns null on 401", async () => {
    cookieGet.mockImplementation((name: string) =>
      name === SESSION_COOKIE ? { value: TOKEN } : undefined,
    );
    fetchMe.mockResolvedValue(null);
    const getCurrentUser = await load();
    expect(await getCurrentUser()).toBeNull();
  });

  it("returns null on network unavailable", async () => {
    cookieGet.mockImplementation((name: string) =>
      name === SESSION_COOKIE ? { value: TOKEN } : undefined,
    );
    fetchMe.mockResolvedValue("unavailable");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const getCurrentUser = await load();
    expect(await getCurrentUser()).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
