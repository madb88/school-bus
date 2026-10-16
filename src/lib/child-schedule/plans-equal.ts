import type { AccountPlan } from "./account-plan";
import type { ChildLessonPlan } from "./types";
import { fromAccountPlan } from "./account-plan";

function sortedDayKeys(days: ChildLessonPlan["days"]): string[] {
  return Object.keys(days)
    .map(Number)
    .sort((a, b) => a - b)
    .map(String);
}

export function lessonPlansEqual(a: ChildLessonPlan, b: ChildLessonPlan): boolean {
  if ((a.place ?? null) !== (b.place ?? null)) return false;
  const keysA = sortedDayKeys(a.days);
  const keysB = sortedDayKeys(b.days);
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i += 1) {
    if (keysA[i] !== keysB[i]) return false;
    const dayA = a.days[Number(keysA[i]) as 1 | 2 | 3 | 4 | 5];
    const dayB = b.days[Number(keysB[i]) as 1 | 2 | 3 | 4 | 5];
    if (!dayA || !dayB) return false;
    if (dayA.start !== dayB.start || (dayA.end ?? "") !== (dayB.end ?? "")) {
      return false;
    }
  }
  return true;
}

export function accountPlanMatchesLocal(
  account: AccountPlan,
  local: ChildLessonPlan,
): boolean {
  return lessonPlansEqual(fromAccountPlan(account), local);
}
