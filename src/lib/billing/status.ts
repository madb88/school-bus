import { fetchPlus, type PlusStatus } from "@/lib/auth/backend";
import { formatPolishYmd, formatRemainingMonthsLabel } from "./format";

export type PlusPanelState =
  | {
      state: "active";
      validUntil: string;
      validUntilLabel: string;
      remainingLabel: string | null;
    }
  | { state: "pending" }
  | { state: "inactive" }
  | { state: "unknown" };

export function plusPanelFromStatus(
  status: PlusStatus | "unavailable",
  now: Date = new Date(),
): PlusPanelState {
  if (status === "unavailable") return { state: "unknown" };
  if (status.state === "active") {
    const validUntil = status.validUntil ?? "";
    return {
      state: "active",
      validUntil,
      validUntilLabel: formatPolishYmd(validUntil) ?? validUntil,
      remainingLabel: formatRemainingMonthsLabel(validUntil, now),
    };
  }
  return { state: status.state };
}

export async function loadPlusPanel(
  sessionToken: string,
  now = new Date(),
): Promise<PlusPanelState> {
  return plusPanelFromStatus(await fetchPlus(sessionToken), now);
}
