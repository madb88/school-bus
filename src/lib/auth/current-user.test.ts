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

describe("getAuthSession / getCurrentUser", () => {
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
    return mod;
  }

  it("returns anonymous without fetching when the cookie is missing", async () => {
    cookieGet.mockReturnValue(undefined);
    const { getAuthSession, getCurrentUser } = await load();
    expect(await getAuthSession()).toEqual({ status: "anonymous" });
    expect(await getCurrentUser()).toBeNull();
    expect(fetchMe).not.toHaveBeenCalled();
  });

  it("returns anonymous without fetching when the cookie is malformed", async () => {
    cookieGet.mockImplementation((name: string) =>
      name === SESSION_COOKIE ? { value: "old.sealed.value" } : undefined,
    );
    const { getAuthSession, getCurrentUser } = await load();
    expect(await getAuthSession()).toEqual({ status: "anonymous" });
    expect(await getCurrentUser()).toBeNull();
    expect(fetchMe).not.toHaveBeenCalled();
  });

  it("returns authenticated user on 200", async () => {
    cookieGet.mockImplementation((name: string) =>
      name === SESSION_COOKIE ? { value: TOKEN } : undefined,
    );
    fetchMe.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      email: "parent@example.com",
      role: "individual",
      createdAt: "2026-01-01T00:00:00.000Z",
      plans: [],
    });
    const { getAuthSession, getCurrentUser } = await load();
    const user = {
      userId: "11111111-1111-4111-8111-111111111111",
      email: "parent@example.com",
      role: "individual",
      plans: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      sessionToken: TOKEN,
    };
    expect(await getAuthSession()).toEqual({
      status: "authenticated",
      user,
    });
    expect(await getCurrentUser()).toEqual(user);
    expect(fetchMe).toHaveBeenCalledWith(TOKEN);
  });

  it("returns anonymous on 401", async () => {
    cookieGet.mockImplementation((name: string) =>
      name === SESSION_COOKIE ? { value: TOKEN } : undefined,
    );
    fetchMe.mockResolvedValue(null);
    const { getAuthSession, getCurrentUser } = await load();
    expect(await getAuthSession()).toEqual({ status: "anonymous" });
    expect(await getCurrentUser()).toBeNull();
  });

  it("returns unavailable on network error (not logged out)", async () => {
    cookieGet.mockImplementation((name: string) =>
      name === SESSION_COOKIE ? { value: TOKEN } : undefined,
    );
    fetchMe.mockResolvedValue("unavailable");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { getAuthSession, getCurrentUser } = await load();
    expect(await getAuthSession()).toEqual({ status: "unavailable" });
    expect(await getCurrentUser()).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
