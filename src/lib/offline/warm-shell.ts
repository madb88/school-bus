/** Keep in sync with `SHELL_CACHE` in `public/sw.js`. */
export const OFFLINE_SHELL_CACHE = "school-bus-shell-v3" as const;

const WARM_PATHS = ["/", "/offline", "/offline.html", "/lekcje"] as const;

const STATIC_MEDIA = [
  "/icons/logo-bus-sm.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/images/weekend-bus.webp",
  "/images/schedule-unavailable.webp",
] as const;

function collectDocumentAssetUrls(): string[] {
  if (typeof document === "undefined") return [];
  const urls = new Set<string>();
  document
    .querySelectorAll<HTMLScriptElement>("script[src]")
    .forEach((el) => {
      if (el.src) urls.add(el.src);
    });
  document
    .querySelectorAll<HTMLLinkElement>(
      'link[rel="stylesheet"][href], link[rel="preload"][href], link[rel="modulepreload"][href]',
    )
    .forEach((el) => {
      if (el.href) urls.add(el.href);
    });
  document.querySelectorAll<HTMLImageElement>("img[src]").forEach((el) => {
    if (el.src) urls.add(el.src);
  });
  return [...urls];
}

async function putInShellCache(urls: string[]): Promise<void> {
  if (typeof caches === "undefined") return;
  const cache = await caches.open(OFFLINE_SHELL_CACHE);
  await Promise.all(
    urls.map(async (raw) => {
      try {
        const url = new URL(raw, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") {
          return;
        }
        const response = await fetch(url.href, { credentials: "same-origin" });
        if (!response.ok) return;
        await cache.put(url.href, response.clone());
        if (
          url.pathname === "/" ||
          url.pathname === "/offline" ||
          url.pathname === "/offline.html"
        ) {
          await cache.put(url.pathname, response.clone());
        }
      } catch {
        // ignore
      }
    }),
  );
}

/**
 * Warm Cache API + ask the service worker to cache shell URLs while online.
 * Needed so a cold PWA open offline can serve HTML/assets (or /offline.html).
 */
export function warmOfflineShell(): void {
  if (typeof window === "undefined") return;
  if (!navigator.onLine) return;

  const urls = [
    ...WARM_PATHS.map((path) => new URL(path, window.location.origin).href),
    ...STATIC_MEDIA.map((path) => new URL(path, window.location.origin).href),
    window.location.href,
    ...collectDocumentAssetUrls(),
  ];

  void putInShellCache(urls);

  const worker = navigator.serviceWorker?.controller;
  if (worker) {
    worker.postMessage({ type: "WARM_SHELL", urls });
  } else if (navigator.serviceWorker) {
    void navigator.serviceWorker.ready.then((reg) => {
      reg.active?.postMessage({ type: "WARM_SHELL", urls });
    });
  }
}
