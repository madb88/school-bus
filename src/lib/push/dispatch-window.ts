/** Inclusive start hour in Europe/Warsaw (06:00). */
export const PUSH_DISPATCH_HOUR_START = 6;
/** Exclusive end hour in Europe/Warsaw (runs until 17:00). */
export const PUSH_DISPATCH_HOUR_END = 17;

function warsawHour(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);
  return Number(parts.find((part) => part.type === "hour")?.value ?? "0") % 24;
}

/** Whether push dispatch should run for this instant (school-day hours only). */
export function isWithinPushDispatchHours(now: Date): boolean {
  const hour = warsawHour(now);
  return hour >= PUSH_DISPATCH_HOUR_START && hour < PUSH_DISPATCH_HOUR_END;
}
