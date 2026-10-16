import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateMyPlans } from "@/lib/auth/backend";
import { getCurrentUser } from "@/lib/auth/current-user";
import { PUT } from "./route";

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/auth/backend", () => ({
  updateMyPlans: vi.fn(),
}));

const TOKEN = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";
const PLAN = {
  place: "Zatonie",
  days: { "1": { start: "08:00", end: "14:00" } },
};

function asUser() {
  vi.mocked(getCurrentUser).mockResolvedValue({
    userId: "11111111-1111-4111-8111-111111111111",
    email: "parent@example.com",
    role: "individual",
    plans: [],
    createdAt: "2026-10-01T00:00:00.000Z",
    sessionToken: TOKEN,
  });
}

function put(body: unknown) {
  return PUT(
    new Request("http://localhost:3000/api/account/plans", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("PUT /api/account/plans", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReset();
    vi.mocked(updateMyPlans).mockReset();
  });

  it("returns 401 without a user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await put({ plans: [] });
    expect(response.status).toBe(401);
    expect(updateMyPlans).not.toHaveBeenCalled();
  });

  it("returns 400 for a bad body", async () => {
    asUser();
    expect((await put({})).status).toBe(400);
    expect((await put({ plans: "x" })).status).toBe(400);
    expect(
      (await put({ plans: [{ place: "X", days: {} }] })).status,
    ).toBe(400);
    expect(updateMyPlans).not.toHaveBeenCalled();
  });

  it("passes 403 / 422 / 503 through", async () => {
    asUser();
    vi.mocked(updateMyPlans).mockResolvedValueOnce({
      ok: false,
      status: 403,
      error: "Zapisywanie planów wymaga Planu Plus",
    });
    const forbidden = await put({ plans: [PLAN] });
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toEqual({
      error: "Zapisywanie planów wymaga Planu Plus",
    });

    vi.mocked(updateMyPlans).mockResolvedValueOnce({
      ok: false,
      status: 422,
      error: "Możesz zapisać najwyżej 5 planów",
    });
    expect((await put({ plans: [PLAN] })).status).toBe(422);

    vi.mocked(updateMyPlans).mockResolvedValueOnce({
      ok: false,
      status: 503,
      error: "Serwis chwilowo niedostępny.",
    });
    expect((await put({ plans: [] })).status).toBe(503);
  });

  it("returns the visible plans on 200", async () => {
    asUser();
    vi.mocked(updateMyPlans).mockResolvedValue({
      ok: true,
      user: {
        id: "11111111-1111-4111-8111-111111111111",
        email: "parent@example.com",
        role: "individual",
        createdAt: "2026-10-01T00:00:00.000Z",
        plans: [PLAN],
      },
    });
    const response = await put({ plans: [PLAN] });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ plans: [PLAN] });
    expect(updateMyPlans).toHaveBeenCalledWith(TOKEN, [PLAN]);
  });
});
