import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resetCheckoutRateLimitCache } from "@/lib/billing/rate-limit";
import { loadPlusPanel } from "@/lib/billing/status";
import { sendComplaintEmail } from "@/lib/feedback/send-email";
import { sendComplaint } from "./complaint";

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/billing/status", () => ({
  loadPlusPanel: vi.fn(),
}));

vi.mock("@/lib/feedback/send-email", () => ({
  sendComplaintEmail: vi.fn(),
}));

const SESSION_USER = "11111111-1111-4111-8111-111111111111";
const idle = { ok: false, message: "" };

function form(message: string, extra?: Record<string, string>) {
  const data = new FormData();
  data.set("message", message);
  for (const [key, value] of Object.entries(extra ?? {})) data.set(key, value);
  return data;
}

describe("sendComplaint", () => {
  beforeEach(() => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    resetCheckoutRateLimitCache();
    vi.mocked(getCurrentUser).mockReset();
    vi.mocked(loadPlusPanel).mockReset();
    vi.mocked(sendComplaintEmail).mockReset();
    vi.mocked(getCurrentUser).mockResolvedValue({
      userId: SESSION_USER,
      email: "parent@example.com",
      role: "user",
    });
    vi.mocked(loadPlusPanel).mockResolvedValue({
      state: "active",
      validUntil: "2027-08-31",
      validUntilLabel: "31 sierpnia 2027",
    });
    vi.mocked(sendComplaintEmail).mockResolvedValue({ ok: true });
  });

  it("sends the session email and the description, not an address from the form", async () => {
    const result = await sendComplaint(
      idle,
      form("Autobus się nie zgadza.", { email: "evil@example.com" }),
    );

    expect(result).toEqual({ ok: true, message: "Reklamacja wysłana." });
    expect(sendComplaintEmail).toHaveBeenCalledWith({
      message: "Autobus się nie zgadza.",
      accountEmail: "parent@example.com",
    });
  });

  it("does not send without a session", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const result = await sendComplaint(idle, form("Opis"));
    expect(result.ok).toBe(false);
    expect(sendComplaintEmail).not.toHaveBeenCalled();
  });

  it("does not send when Plan Plus is not active", async () => {
    vi.mocked(loadPlusPanel).mockResolvedValue({ state: "inactive" });
    const result = await sendComplaint(idle, form("Opis"));
    expect(result.ok).toBe(false);
    expect(sendComplaintEmail).not.toHaveBeenCalled();
  });

  it("does not send an empty description", async () => {
    const result = await sendComplaint(idle, form("   "));
    expect(result.ok).toBe(false);
    expect(sendComplaintEmail).not.toHaveBeenCalled();
    expect(loadPlusPanel).not.toHaveBeenCalled();
  });
});
