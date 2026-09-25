export type PushKinds = {
  departure: boolean;
  return: boolean;
  schedule: boolean;
};

export const DEFAULT_PUSH_KINDS: PushKinds = {
  departure: true,
  return: true,
  schedule: true,
};

const STORAGE_KEY = "school-bus.push-kinds.v1";
const CHANGE_EVENT = "school-bus-push-kinds";

/** Missing fields stay on, so older subscriptions keep every reminder. */
export function parsePushKinds(raw: unknown): PushKinds {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PUSH_KINDS };
  const record = raw as Record<string, unknown>;
  return {
    departure: record.departure !== false,
    return: record.return !== false,
    schedule: record.schedule !== false,
  };
}

export function loadPushKinds(): PushKinds {
  if (typeof window === "undefined") return { ...DEFAULT_PUSH_KINDS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PUSH_KINDS };
    return parsePushKinds(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PUSH_KINDS };
  }
}

export function savePushKinds(kinds: PushKinds): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(kinds));
  } catch {
    // ignore quota / private mode
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribePushKinds(onStoreChange: () => void): () => void {
  const onChange = () => onStoreChange();
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function getPushKindsServerSnapshot(): string {
  return "1|1|1";
}

export function getPushKindsSnapshot(): string {
  const kinds = loadPushKinds();
  return `${kinds.departure ? "1" : "0"}|${kinds.return ? "1" : "0"}|${kinds.schedule ? "1" : "0"}`;
}

export function pushKindsFromSnapshot(snapshot: string): PushKinds {
  const [departure, returnKind, schedule] = snapshot.split("|");
  return {
    departure: departure !== "0",
    return: returnKind !== "0",
    schedule: schedule !== "0",
  };
}
