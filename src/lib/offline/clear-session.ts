import { clearOfflineEntitlement } from "./entitlement";
import { clearSchoolOfflineSnapshot } from "./school-cache";
import { OFFLINE_SHELL_CACHE } from "./warm-shell";

const SHELL_PATHS_TO_DROP = new Set([
  "/",
  "/lekcje",
  "/offline",
  "/offline.html",
]);

/**
 * Drop Plus offline entitlement, IndexedDB snapshots, and cached app documents.
 * Call on logout / when Plus access is revoked so a cold offline open cannot
 * reuse a previously logged-in shell.
 */
export async function clearOfflinePlusSession(): Promise<void> {
  clearOfflineEntitlement();
  await clearSchoolOfflineSnapshot();

  if (typeof caches === "undefined") return;
  try {
    const cache = await caches.open(OFFLINE_SHELL_CACHE);
    const keys = await cache.keys();
    await Promise.all(
      keys.map(async (request) => {
        try {
          const pathname = new URL(request.url).pathname;
          if (SHELL_PATHS_TO_DROP.has(pathname)) {
            await cache.delete(request);
          }
        } catch {
          // ignore bad URLs
        }
      }),
    );
  } catch {
    // Quota / private mode — entitlement clear above is the hard gate.
  }
}
