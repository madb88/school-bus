import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

const deletePushRecordsForUser = vi.fn<(userId: string) => Promise<void>>(
  async () => undefined,
);

vi.mock("@/lib/push/store", () => ({
  deletePushRecordsForUser: (userId: string) => deletePushRecordsForUser(userId),
}));
import { userEmailKey, userKey } from "@/lib/auth/constants";
import type { AuthKv } from "@/lib/auth/store";
import { entitlementKey } from "./constants";
import { readEntitlement } from "./store";
import { handleStripeWebhook, priceIdFromLineItems } from "./webhook";

const SECRET = "whsec_test_secret_value_0001";
const API_KEY = "unit_test_stripe_secret_key_0001";
const PRICE = "price_PlanPlus0001";
const OTHER_PRICE = "price_OtherProduct1";
const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_D = "22222222-2222-4222-8222-222222222222";
const NOW = new Date("2026-09-30T10:00:00.000Z");
const PI = "pi_3TestOrder1001aa";
const CUSTOMER = "cus_TestCustomer01";
const SESSION = "cs_test_session0001";

class MemoryKv implements AuthKv {
  private values = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | null> {
    if (!this.values.has(key)) return null;
    return structuredClone(this.values.get(key)) as T;
  }

  async set(key: string, value: unknown, opts?: { ex: number } | { nx: true }) {
    if (opts && "nx" in opts && this.values.has(key)) return null;
    this.values.set(key, structuredClone(value));
    return "OK";
  }

  async getdel<T>(key: string): Promise<T | null> {
    const value = await this.get<T>(key);
    this.values.delete(key);
    return value;
  }

  async del(...keys: string[]) {
    for (const key of keys) this.values.delete(key);
  }

  async sadd() {}

  async expire() {
    return 1;
  }

  async incr() {
    return 1;
  }
}

function sign(body: string, secret = SECRET, now = NOW): string {
  const timestamp = Math.floor(now.getTime() / 1000);
  const digest = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`, "utf8")
    .digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

function sessionBody(
  input: {
    event?: string;
    orderId?: string;
    sessionId?: string;
    email?: string;
    userId?: string | null;
    paymentStatus?: string;
    createdAt?: string;
    mode?: string;
  } = {},
): string {
  const metadata =
    input.userId === null
      ? {}
      : { user_id: input.userId === undefined ? USER_A : input.userId };
  const created = Math.floor(
    Date.parse(input.createdAt ?? "2026-09-15T10:00:00.000Z") / 1000,
  );
  return JSON.stringify({
    id: "evt_test_paid",
    object: "event",
    type: input.event ?? "checkout.session.completed",
    data: {
      object: {
        id: input.sessionId ?? SESSION,
        object: "checkout.session",
        mode: input.mode ?? "payment",
        payment_status: input.paymentStatus ?? "paid",
        customer: CUSTOMER,
        customer_details: { email: input.email ?? "parent@example.com" },
        metadata,
        payment_intent: input.orderId ?? PI,
        created,
      },
    },
  });
}

function refundBody(
  input: {
    orderId?: string;
    refunded?: boolean;
    userId?: string;
  } = {},
): string {
  return JSON.stringify({
    id: "evt_test_refund",
    object: "event",
    type: "charge.refunded",
    data: {
      object: {
        id: "ch_3TestCharge0001aa",
        object: "charge",
        payment_intent: input.orderId ?? PI,
        refunded: input.refunded ?? true,
        metadata: input.userId ? { user_id: input.userId } : {},
      },
    },
  });
}

function throwingKv(): AuthKv {
  const fail = () => {
    throw new Error("redis touched");
  };
  return {
    get: fail,
    set: fail,
    getdel: fail,
    del: fail,
    sadd: fail,
    expire: fail,
    incr: fail,
  };
}

async function deliver(
  kv: AuthKv | null,
  body: string,
  signature: string | null = sign(body),
  lookupPrice: (sessionId: string) => Promise<string | "mixed" | null> = async () => PRICE,
  sendReceipt: (mail: {
    to: string;
    startedOn: string;
    endsOn: string;
    renewal: boolean;
  }) => Promise<boolean> = async () => true,
) {
  return handleStripeWebhook({
    rawBody: body,
    signature,
    secret: SECRET,
    priceId: PRICE,
    apiKey: API_KEY,
    kv,
    now: NOW,
    lookupPrice,
    sendReceipt,
  });
}

async function seedUser(kv: MemoryKv, id: string, email: string) {
  await kv.set(userKey(id), { email, createdAt: "2026-01-01T00:00:00.000Z" });
  await kv.set(userEmailKey(email), id);
}

describe("stripe webhook", () => {
  it("rejects a missing, wrong, or stale signature before Redis", async () => {
    const body = sessionBody();
    const lookup = () => {
      throw new Error("lookup touched");
    };
    expect(await deliver(throwingKv(), body, null, lookup)).toEqual({ ok: false, status: 401 });
    expect(await deliver(throwingKv(), body, sign(body, "whsec_other_secret"), lookup)).toEqual({
      ok: false,
      status: 401,
    });
    const stale = new Date(NOW.getTime() - 10 * 60 * 1000);
    expect(await deliver(throwingKv(), body, sign(body, SECRET, stale), lookup)).toEqual({
      ok: false,
      status: 401,
    });
  });

  it("does not acknowledge a paid session when Redis is down", async () => {
    expect(await deliver(null, sessionBody())).toEqual({ ok: false, status: 503 });
  });

  it("grants Plus until 31 August and ignores the same payment the second time", async () => {
    const kv = new MemoryKv();
    await seedUser(kv, USER_A, "parent@example.com");
    const body = sessionBody();

    expect(await deliver(kv, body)).toEqual({ ok: true });
    const first = await readEntitlement(USER_A, kv);
    expect(first).toMatchObject({
      status: "active",
      validUntil: "2027-08-31",
      stripePaymentIntentId: PI,
      stripeCustomerId: CUSTOMER,
    });

    expect(await deliver(kv, body)).toEqual({ ok: true });
    expect(await readEntitlement(USER_A, kv)).toEqual(first);
  });

  it("moves an expired plan to the next school year and adds a year while Plus is active", async () => {
    const kv = new MemoryKv();
    await seedUser(kv, USER_A, "parent@example.com");
    const later = "pi_3TestOrder1002aa";

    await deliver(
      kv,
      sessionBody({ orderId: PI, createdAt: "2027-01-10T10:00:00.000Z" }),
    );
    await deliver(
      kv,
      sessionBody({
        orderId: later,
        sessionId: "cs_test_session0002",
        createdAt: "2027-09-02T10:00:00.000Z",
      }),
    );
    expect(await readEntitlement(USER_A, kv)).toMatchObject({
      status: "active",
      validUntil: "2028-08-31",
      stripePaymentIntentId: later,
    });

    const extended = new MemoryKv();
    await seedUser(extended, USER_A, "parent@example.com");
    const first = "pi_3TestOrder2001aa";
    const second = "pi_3TestOrder2002aa";
    await deliver(
      extended,
      sessionBody({ orderId: first, createdAt: "2026-09-15T10:00:00.000Z" }),
    );
    await deliver(
      extended,
      sessionBody({
        orderId: second,
        sessionId: "cs_test_session0003",
        createdAt: "2026-10-01T10:00:00.000Z",
      }),
    );
    expect(await readEntitlement(USER_A, extended)).toMatchObject({
      status: "active",
      validUntil: "2028-08-31",
      stripePaymentIntentId: second,
    });
  });

  it("refunds the user stored for that payment, not the user id in the payload", async () => {
    const kv = new MemoryKv();
    await seedUser(kv, USER_A, "parent@example.com");
    await seedUser(kv, USER_D, "other@example.com");
    await kv.set(entitlementKey(USER_D), {
      status: "active",
      validUntil: "2028-08-31",
      stripePaymentIntentId: "pi_3OtherOrder9999aa",
    });

    await deliver(kv, sessionBody({ email: "stranger@example.com" }));
    expect(await deliver(kv, refundBody({ userId: USER_D }))).toEqual({ ok: true });

    expect(deletePushRecordsForUser).toHaveBeenCalledWith(USER_A);
    expect(deletePushRecordsForUser).not.toHaveBeenCalledWith(USER_D);
    expect(await readEntitlement(USER_A, kv)).toMatchObject({
      status: "revoked",
      stripePaymentIntentId: PI,
    });
    expect(await readEntitlement(USER_D, kv)).toMatchObject({
      status: "active",
      stripePaymentIntentId: "pi_3OtherOrder9999aa",
    });
    expect(await kv.get(userEmailKey("stranger@example.com"))).toBeNull();
  });

  it("keeps Plus when an older payment is refunded after a renewal", async () => {
    const kv = new MemoryKv();
    await seedUser(kv, USER_A, "parent@example.com");
    const later = "pi_3TestOrder1002aa";
    await deliver(
      kv,
      sessionBody({ orderId: PI, createdAt: "2027-01-10T10:00:00.000Z" }),
    );
    await deliver(
      kv,
      sessionBody({
        orderId: later,
        sessionId: "cs_test_session0002",
        createdAt: "2027-09-02T10:00:00.000Z",
      }),
    );
    deletePushRecordsForUser.mockClear();
    await deliver(kv, refundBody({ orderId: PI, userId: USER_D }));
    expect(deletePushRecordsForUser).not.toHaveBeenCalled();
    expect(await readEntitlement(USER_A, kv)).toMatchObject({
      status: "active",
      validUntil: "2028-08-31",
      stripePaymentIntentId: later,
    });
  });

  it("ignores another price and a user id that is not an account", async () => {
    const kv = new MemoryKv();
    await seedUser(kv, USER_A, "parent@example.com");
    const otherPrice = sessionBody({ email: "stranger@example.com" });
    expect(await deliver(kv, otherPrice, sign(otherPrice), async () => OTHER_PRICE)).toEqual({
      ok: true,
    });
    expect(await readEntitlement(USER_A, kv)).toBeNull();
    expect(await kv.get(userEmailKey("stranger@example.com"))).toBeNull();

    const unknown = "33333333-3333-4333-8333-333333333333";
    const body = sessionBody({
      orderId: "pi_3TestOrder1002aa",
      sessionId: "cs_test_session0002",
      userId: unknown,
      email: "stranger@example.com",
    });
    expect(await deliver(kv, body)).toEqual({ ok: true });
    expect(await kv.get(userEmailKey("stranger@example.com"))).toBeNull();
    expect(await readEntitlement(unknown, kv)).toBeNull();
  });

  it("creates an account from the session email when checkout had no user id", async () => {
    const kv = new MemoryKv();
    const orderId = "pi_3TestOrder3001aa";
    expect(
      await deliver(
        kv,
        sessionBody({
          userId: null,
          email: "New.Parent@Example.com",
          orderId,
          sessionId: "cs_test_session3001",
        }),
      ),
    ).toEqual({ ok: true });
    const userId = await kv.get<string>(userEmailKey("new.parent@example.com"));
    expect(userId).toEqual(expect.any(String));
    expect(await readEntitlement(String(userId), kv)).toMatchObject({
      status: "active",
      validUntil: "2027-08-31",
      stripePaymentIntentId: orderId,
    });
  });

  it("does not grant a payment that was refunded first", async () => {
    const kv = new MemoryKv();
    await seedUser(kv, USER_A, "parent@example.com");
    await deliver(kv, refundBody());
    await deliver(kv, sessionBody());
    expect(await readEntitlement(USER_A, kv)).toBeNull();
  });

  it("does not grant a session that is not paid yet and ignores a partial refund", async () => {
    const kv = new MemoryKv();
    await seedUser(kv, USER_A, "parent@example.com");
    const pending = sessionBody({ paymentStatus: "unpaid" });
    expect(await deliver(kv, pending, sign(pending), async () => {
      throw new Error("lookup touched");
    })).toEqual({ ok: true });
    await deliver(kv, sessionBody());
    expect(await deliver(kv, refundBody({ refunded: false }))).toEqual({ ok: true });
    expect(await readEntitlement(USER_A, kv)).toMatchObject({ status: "active" });
  });

  it("emails the buying account once per payment, including a renewal", async () => {
    const kv = new MemoryKv();
    await seedUser(kv, USER_A, "parent@example.com");
    const sent: { to: string; startedOn: string; endsOn: string; renewal: boolean }[] = [];
    const sendReceipt = async (mail: {
      to: string;
      startedOn: string;
      endsOn: string;
      renewal: boolean;
    }) => {
      sent.push(mail);
      return true;
    };

    const body = sessionBody({ email: "stranger@example.com" });
    expect(await deliver(kv, body, sign(body), async () => PRICE, sendReceipt)).toEqual({
      ok: true,
    });
    expect(await deliver(kv, body, sign(body), async () => PRICE, sendReceipt)).toEqual({
      ok: true,
    });
    expect(sent).toEqual([
      {
        to: "parent@example.com",
        startedOn: "2026-09-15",
        endsOn: "2027-08-31",
        renewal: false,
      },
    ]);

    const renewal = sessionBody({
      orderId: "pi_3TestOrder1002aa",
      sessionId: "cs_test_session0002",
      createdAt: "2026-10-01T10:00:00.000Z",
    });
    expect(await deliver(kv, renewal, sign(renewal), async () => PRICE, sendReceipt)).toEqual({
      ok: true,
    });
    expect(sent[1]).toEqual({
      to: "parent@example.com",
      startedOn: "2026-10-01",
      endsOn: "2028-08-31",
      renewal: true,
    });
  });

  it("retries the confirmation when the mail is not sent", async () => {
    const kv = new MemoryKv();
    await seedUser(kv, USER_A, "parent@example.com");
    let sent = 0;
    const sendReceipt = async () => {
      sent += 1;
      return sent > 1;
    };
    const body = sessionBody();
    expect(await deliver(kv, body, sign(body), async () => PRICE, sendReceipt)).toEqual({
      ok: false,
      status: 500,
    });
    expect(await readEntitlement(USER_A, kv)).toMatchObject({ status: "active" });
    expect(await deliver(kv, body, sign(body), async () => PRICE, sendReceipt)).toEqual({
      ok: true,
    });
    expect(sent).toBe(2);
  });

  it("does not email a payment that was refunded first", async () => {
    const kv = new MemoryKv();
    await seedUser(kv, USER_A, "parent@example.com");
    const sendReceipt = async () => {
      throw new Error("receipt touched");
    };
    await deliver(kv, refundBody(), sign(refundBody()), async () => PRICE, sendReceipt);
    expect(
      await deliver(kv, sessionBody(), sign(sessionBody()), async () => PRICE, sendReceipt),
    ).toEqual({ ok: true });
    expect(await readEntitlement(USER_A, kv)).toBeNull();
  });

  it("asks Stripe for the session price and retries when that call fails", async () => {
    const kv = new MemoryKv();
    await seedUser(kv, USER_A, "parent@example.com");
    const body = sessionBody();
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe(
        `https://api.stripe.com/v1/checkout/sessions/${SESSION}/line_items?limit=10`,
      );
      expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${API_KEY}`);
      return new Response(JSON.stringify({ data: [{ price: { id: PRICE } }] }), { status: 200 });
    });
    expect(
      await handleStripeWebhook({
        rawBody: body,
        signature: sign(body),
        secret: SECRET,
        priceId: PRICE,
        apiKey: API_KEY,
        kv,
        now: NOW,
        fetchImpl,
        sendReceipt: async () => true,
      }),
    ).toEqual({ ok: true });
    expect(await readEntitlement(USER_A, kv)).toMatchObject({ status: "active" });

    const down = vi.fn(async () => new Response("no", { status: 500 }));
    expect(
      await handleStripeWebhook({
        rawBody: body,
        signature: sign(body),
        secret: SECRET,
        priceId: PRICE,
        apiKey: API_KEY,
        kv: new MemoryKv(),
        now: NOW,
        fetchImpl: down,
      }),
    ).toEqual({ ok: false, status: 500 });
  });
});

describe("priceIdFromLineItems", () => {
  it("reads one price and rejects a mixed cart", () => {
    expect(priceIdFromLineItems({ data: [{ price: { id: PRICE } }] })).toBe(PRICE);
    expect(priceIdFromLineItems({ data: [{ price: PRICE }] })).toBe(PRICE);
    expect(
      priceIdFromLineItems({
        data: [{ price: { id: PRICE } }, { price: { id: OTHER_PRICE } }],
      }),
    ).toBe("mixed");
    expect(priceIdFromLineItems({ has_more: true, data: [{ price: { id: PRICE } }] })).toBe(
      "mixed",
    );
  });
});
