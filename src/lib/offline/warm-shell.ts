/** Keep in sync with `SHELL_CACHE` in `public/sw.js`. */
export const OFFLINE_SHELL_CACHE = "school-bus-shell-v9" as const;

/** Document routes warmed for offline hard-navigation (Plan Plus). */
export const OFFLINE_WARM_DOCUMENT_PATHS = [
  "/offline",
  "/offline.html",
] as const;

const WARM_PATHS = OFFLINE_WARM_DOCUMENT_PATHS;

const STATIC_MEDIA = [
  "/icons/logo-bus-sm.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/images/weekend-bus.webp",
  "/images/schedule-unavailable.webp",
] as const;

function isWarmDocumentPath(pathname: string): boolean {
  return (OFFLINE_WARM_DOCUMENT_PATHS as readonly string[]).includes(pathname);
}

function isCacheableAssetPath(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/images/") ||
    pathname === "/manifest.webmanifest" ||
    pathname.endsWith(".webmanifest")
  );
}

/** Pull `/_next/*` (and media) URLs out of a warmed HTML document. */
export function collectHtmlAssetUrls(
  html: string,
  baseHref: string,
  origin: string,
): string[] {
  const found = new Set<string>();
  const re = /\b(?:src|href)=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    try {
      const absolute = new URL(match[1], baseHref);
      if (absolute.origin !== origin) continue;
      if (!isCacheableAssetPath(absolute.pathname)) continue;
      found.add(absolute.href);
    } catch {
      // ignore bad URLs
    }
  }
  return [...found];
}

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
  const origin = window.location.origin;
  const seen = new Set<string>();

  async function putOne(raw: string, parseHtml: boolean): Promise<void> {
    try {
      const url = new URL(raw, origin);
      if (url.origin !== origin) return;
      if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;
      if (seen.has(url.href)) return;
      seen.add(url.href);

      const response = await fetch(url.href, { credentials: "same-origin" });
      if (!response.ok) return;
      await cache.put(url.href, response.clone());
      if (isWarmDocumentPath(url.pathname)) {
        await cache.put(url.pathname, response.clone());
      }

      if (!parseHtml) return;
      const contentType = response.headers.get("content-type") ?? "";
      const looksHtml =
        contentType.includes("text/html") || isWarmDocumentPath(url.pathname);
      if (!looksHtml) return;

      const html = await response.clone().text();
      const assets = collectHtmlAssetUrls(html, url.href, origin);
      await Promise.all(assets.map((asset) => putOne(asset, false)));
    } catch {
      // Quota / network / private mode
    }
  }

  await Promise.all(
    urls.map((raw) => {
      try {
        const pathname = new URL(raw, origin).pathname;
        return putOne(raw, isWarmDocumentPath(pathname));
      } catch {
        return putOne(raw, false);
      }
    }),
  );
}

/**
 * Warm Cache API + ask the service worker to cache shell URLs while online.
 * Needed so a cold PWA open offline can serve HTML/assets (or /offline.html).
 * Document routes also pull their `/_next` chunks from the HTML.
 */
export function warmOfflineShell(): void {
  if (typeof window === "undefined") return;
  if (!navigator.onLine) return;

  // Only warm dedicated offline documents — never cache arbitrary current route HTML.
  const urls = [
    ...WARM_PATHS.map((path) => new URL(path, window.location.origin).href),
    ...STATIC_MEDIA.map((path) => new URL(path, window.location.origin).href),
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
