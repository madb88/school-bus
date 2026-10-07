import type { Kv } from "@/lib/redis/kv";
import { isUserId } from "./constants";
import { formatPolishYmd, isActiveUntil } from "./school-year";
import {
  clearPaymentReturn,
  getBillingKv,
  hasPaymentReturn,
  readEntitlement,
  type Entitlement,
} from "./store";

export type PlusPanelState =
  | { state: "active"; validUntil: string; validUntilLabel: string }
  | { state: "pending" }
  | { state: "inactive" }
  | { state: "unknown" };

export function plusPanelState(input: {
  entitlement: Entitlement | null;
  paidReturn: boolean;
  pending: boolean;
  now: Date;
}): PlusPanelState {
  const { entitlement, paidReturn, pending, now } = input;
  if (entitlement?.status === "active" && isActiveUntil(entitlement.validUntil, now)) {
    return {
      state: "active",
      validUntil: entitlement.validUntil,
      validUntilLabel: formatPolishYmd(entitlement.validUntil) ?? entitlement.validUntil,
    };
  }
  if (paidReturn || pending) return { state: "pending" };
  return { state: "inactive" };
}

export async function loadPlusPanel(
  userId: string,
  paidReturn: boolean,
  now = new Date(),
  client?: Kv,
): Promise<PlusPanelState> {
  const kv = client ?? getBillingKv();
  if (!isUserId(userId) || !kv) {
    return paidReturn ? { state: "pending" } : { state: "unknown" };
  }

  try {
    const entitlement = await readEntitlement(userId, kv);
    const view = plusPanelState({
      entitlement,
      paidReturn,
      pending: await hasPaymentReturn(userId, kv),
      now,
    });
    if (view.state === "active") await clearPaymentReturn(userId, kv);
    return view;
  } catch {
    console.error("Billing status read failed");
    return paidReturn ? { state: "pending" } : { state: "unknown" };
  }
}
