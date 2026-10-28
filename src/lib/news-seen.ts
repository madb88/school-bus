import { NEWS_ITEMS } from "@/components/news-list";

const STORAGE_KEY = "school-bus.news-seen.v1";
const CHANGE_EVENT = "school-bus-news-seen";

export function getLatestNewsId(): string {
  return NEWS_ITEMS[0]?.id ?? "";
}

export function getSeenNewsId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** How many NEWS_ITEMS are newer than the last seen id (newest-first list). */
export function getUnreadNewsCount(): number {
  const seenId = getSeenNewsId();
  if (!seenId) return NEWS_ITEMS.length;

  const index = NEWS_ITEMS.findIndex((item) => item.id === seenId);
  if (index < 0) return NEWS_ITEMS.length;
  return index;
}

export function formatUnreadNewsCount(count: number): string {
  if (count > 9) return "9+";
  return String(count);
}

export function markNewsSeen(id: string = getLatestNewsId()): void {
  if (typeof window === "undefined" || !id) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // ignore quota / private mode
  }
}

export function subscribeNewsSeen(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onChange = () => onStoreChange();
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function getUnreadNewsCountSnapshot(): number {
  return getUnreadNewsCount();
}
