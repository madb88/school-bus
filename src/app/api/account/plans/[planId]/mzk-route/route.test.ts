import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteMyPlanMzkRoute,
  putMyPlanMzkRoute,
  type BackendUser,
} from "@/lib/auth/backend";
import { getCurrentUser } from "@/lib/auth/current-user";
import { DELETE, PUT } from "./route";

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/auth/backend", () => ({
  putMyPlanMzkRoute: vi.fn(),
  deleteMyPlanMzkRoute: vi.fn(),
}));

const TOKEN = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";
const PLAN_ID = "550e8400-e29b-41d4-a716-446655440000";
const ROUTE = { boardStopId: "350", alightStopId: "299", route: "30" };
const PLAN = {
  id: PLAN_ID,
  schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
  place: "Zatonie",
  days: { "1": { start: "08:00", end: "14:00" } },
  mzkRoute: ROUTE,
};
const USER: BackendUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "parent@example.com",
  role: "individual",
  createdAt: "2026-10-01T00:00:00.000Z",
  plans: [PLAN],
  settings: {},
  mzkRoutes: {},
};

function asUser() {
  vi.mocked(getCurrentUser).mockResolvedValue({
    userId: USER.id,
    email: USER.email,
    role: "individual",
    plans: [PLAN],
    settings: {},
    mzkRoutes: {},
    createdAt: USER.createdAt,
    sessionToken: TOKEN,
  });
}

function context(planId: string) {
  return { params: Promise.resolve({ planId }) };
}

function put(planId: string, body: unknown) {
  return PUT(
    new Request(`http://localhost:3000/api/account/plans/${planId}/mzk-route`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    context(planId),
  );
}

describe("/api/account/plans/[planId]/mzk-route", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReset();
    vi.mocked(putMyPlanMzkRoute).mockReset();
    vi.mocked(deleteMyPlanMzkRoute).mockReset();
  });

  it("returns 401 without a user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    expect((await put(PLAN_ID, ROUTE)).status).toBe(401);
    expect(putMyPlanMzkRoute).not.toHaveBeenCalled();
  });

  it("returns 400 for a bad plan id or route", async () => {
    asUser();
    expect((await put("nope", ROUTE)).status).toBe(400);
    expect((await put(PLAN_ID, { boardStopId: "350" })).status).toBe(400);
    expect(
      (await put(PLAN_ID, { boardStopId: "350", alightStopId: "350" })).status,
    ).toBe(400);
    expect(putMyPlanMzkRoute).not.toHaveBeenCalled();
  });

  it("saves the route and returns the plans", async () => {
    asUser();
    vi.mocked(putMyPlanMzkRoute).mockResolvedValue({ ok: true, user: USER });
    const response = await put(PLAN_ID, ROUTE);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ plans: [PLAN] });
    expect(putMyPlanMzkRoute).toHaveBeenCalledWith(TOKEN, PLAN_ID, ROUTE);
  });

  it("passes backend errors through", async () => {
    asUser();
    vi.mocked(putMyPlanMzkRoute).mockResolvedValue({
      ok: false,
      status: 404,
      error: "Nie znaleziono planu",
    });
    const response = await put(PLAN_ID, ROUTE);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Nie znaleziono planu" });
  });

  it("deletes the route", async () => {
    asUser();
    vi.mocked(deleteMyPlanMzkRoute).mockResolvedValue({ ok: true, user: USER });
    const response = await DELETE(
      new Request("http://localhost/x", { method: "DELETE" }),
      context(PLAN_ID),
    );
    expect(response.status).toBe(200);
    expect(deleteMyPlanMzkRoute).toHaveBeenCalledWith(TOKEN, PLAN_ID);
  });
});
