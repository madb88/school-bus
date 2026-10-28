/* Service worker: Web Push + offline shell (Plan Plus data lives in IndexedDB).
   Cold-start fallback is static /offline.html (no Next chunks).
   Cache API: navigations + /_next/static + icons — not /api/*. */

const SHELL_CACHE = "school-bus-shell-v4";
const OFFLINE_FALLBACK = "/offline.html";
/** Keep in sync with OFFLINE_WARM_DOCUMENT_PATHS in warm-shell.ts */
const WARM_DOCUMENT_PATHS = [
  "/",
  "/offline",
  "/offline.html",
  "/lekcje",
  "/zmiany-w-rozkladzie",
];
const PRECACHE_URLS = [
  OFFLINE_FALLBACK,
  "/icons/logo-bus-sm.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/icon-maskable-512.png",
  "/images/weekend-bus.webp",
  "/images/schedule-unavailable.webp",
];

function isWarmDocumentPath(pathname) {
  return WARM_DOCUMENT_PATHS.includes(pathname);
}

function isCacheableAssetPath(pathname) {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/images/") ||
    pathname === "/manifest.webmanifest" ||
    pathname.endsWith(".webmanifest")
  );
}

/** Keep in sync with collectHtmlAssetUrls in warm-shell.ts */
function collectHtmlAssetUrls(html, baseHref) {
  const found = [];
  const seen = new Set();
  const re = /\b(?:src|href)=["']([^"']+)["']/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    try {
      const absolute = new URL(match[1], baseHref);
      if (absolute.origin !== self.location.origin) continue;
      if (!isCacheableAssetPath(absolute.pathname)) continue;
      if (seen.has(absolute.href)) continue;
      seen.add(absolute.href);
      found.push(absolute.href);
    } catch {
      // ignore
    }
  }
  return found;
}

function sameOriginUrl(rawUrl, origin) {
  try {
    const target = new URL(rawUrl, origin);
    if (target.origin !== origin) return `${origin}/`;
    return target.href;
  } catch {
    return `${origin}/`;
  }
}

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/_next/image") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/images/") ||
    pathname === "/manifest.webmanifest" ||
    pathname.endsWith(".webmanifest") ||
    pathname === OFFLINE_FALLBACK
  );
}

async function cachePutSafe(cache, request, response) {
  try {
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
  } catch {
    // Quota / opaque — ignore
  }
}

async function matchCachedPath(cache, path) {
  const absolute = new URL(path, self.location.origin).href;
  return (
    (await cache.match(path, { ignoreSearch: true })) ||
    (await cache.match(absolute, { ignoreSearch: true })) ||
    null
  );
}

async function matchNavigation(cache, request) {
  const exact = await cache.match(request, { ignoreSearch: true });
  if (exact) return exact;

  let pathname = "/";
  try {
    pathname = new URL(request.url).pathname;
    const byPath = await matchCachedPath(cache, pathname);
    if (byPath) return byPath;
  } catch {
    // ignore
  }

  // Never replace the static offline shell with a cached logged-in `/`.
  if (pathname === OFFLINE_FALLBACK || pathname === "/offline") {
    return matchCachedPath(cache, OFFLINE_FALLBACK);
  }

  // Prefer last cached home document, then static offline shell.
  return (
    (await matchCachedPath(cache, "/")) ||
    (await matchCachedPath(cache, "/offline")) ||
    (await matchCachedPath(cache, OFFLINE_FALLBACK))
  );
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const fresh = await fetch(request);
    await cachePutSafe(cache, request, fresh);
    // Also store under pathname for easier cold-start matching.
    try {
      const url = new URL(request.url);
      if (fresh.ok && isWarmDocumentPath(url.pathname)) {
        await cachePutSafe(cache, url.pathname, fresh);
      }
    } catch {
      // ignore
    }
    return fresh;
  } catch {
    const cached = await matchNavigation(cache, request);
    if (cached) return cached;
    return new Response(
      "<!DOCTYPE html><html lang=pl><meta charset=utf-8><meta name=viewport content=\"width=device-width,initial-scale=1\"><title>Offline</title><body style=\"font-family:system-ui;background:#111821;color:#e8eef5;padding:1.5rem\"><h1>Brak połączenia</h1><p>Nie udało się wczytać lokalnej kopii. Otwórz aplikację online jeszcze raz (Plan Plus), potem spróbuj offline.</p><p><a href=\"/\" style=\"color:#3d7eff\">Spróbuj ponownie</a></p></body></html>",
      {
        status: 503,
        statusText: "Offline",
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    await cachePutSafe(cache, request, fresh);
    return fresh;
  } catch {
    if (cached) return cached;
    const offline = await matchCachedPath(cache, OFFLINE_FALLBACK);
    if (offline && request.destination === "document") return offline;
    return new Response("", { status: 503, statusText: "Offline" });
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(url);
          } catch {
            // Individual URL may fail; keep installing.
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("school-bus-shell-") && key !== SHELL_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "WARM_SHELL" || !Array.isArray(data.urls)) return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      const seen = new Set();

      async function putOne(raw, parseHtml) {
        try {
          const url = new URL(raw, self.location.origin);
          if (url.origin !== self.location.origin) return;
          if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") {
            return;
          }
          if (seen.has(url.href)) return;
          seen.add(url.href);

          const response = await fetch(url.href, { credentials: "same-origin" });
          await cachePutSafe(cache, url.href, response);
          if (isWarmDocumentPath(url.pathname)) {
            await cachePutSafe(cache, url.pathname, response);
          }
          if (!parseHtml || !response || !response.ok) return;

          const contentType = response.headers.get("content-type") || "";
          const looksHtml =
            contentType.includes("text/html") ||
            isWarmDocumentPath(url.pathname);
          if (!looksHtml) return;

          const html = await response.clone().text();
          const assets = collectHtmlAssetUrls(html, url.href);
          await Promise.all(assets.map((asset) => putOne(asset, false)));
        } catch {
          // ignore
        }
      }

      await Promise.all(
        data.urls.map((raw) => {
          try {
            const pathname = new URL(raw, self.location.origin).pathname;
            return putOne(raw, isWarmDocumentPath(pathname));
          } catch {
            return putOne(raw, false);
          }
        }),
      );
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstAsset(request));
  }
});

self.addEventListener("push", (event) => {
  const fallback = {
    title: "autobusszkolny.pl",
    body: "",
    url: "/",
    tag: "school-bus-fallback",
  };

  let payload = fallback;
  try {
    if (event.data) {
      const parsed = event.data.json();
      const title =
        typeof parsed.title === "string" ? parsed.title : fallback.title;
      const body = typeof parsed.body === "string" ? parsed.body : "";
      const url = typeof parsed.url === "string" ? parsed.url : "/";
      const tag =
        typeof parsed.tag === "string" && parsed.tag
          ? parsed.tag
          : `${title}|${body}|${url}`;
      payload = { title, body, url, tag };
    }
  } catch {
    payload = fallback;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      tag: payload.tag,
      renotify: true,
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawUrl =
    event.notification.data && typeof event.notification.data.url === "string"
      ? event.notification.data.url
      : "/";
  const target = sameOriginUrl(rawUrl, self.location.origin);

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (!client.url.startsWith(self.location.origin)) continue;
          if ("navigate" in client && typeof client.navigate === "function") {
            return client.navigate(target).then(() => client.focus());
          }
          return client.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow(target);
      }),
  );
});
