/* Service worker: Web Push + offline shell (Plan Plus data lives in IndexedDB).
   Cold-start fallback is static /offline.html (no Next chunks).
   Cache API: navigations + /_next/static + icons — not /api/*. */

const SHELL_CACHE = "school-bus-shell-v10";
const OFFLINE_FALLBACK = "/offline.html";
/** Keep in sync with OFFLINE_WARM_DOCUMENT_PATHS in warm-shell.ts */
const WARM_DOCUMENT_PATHS = ["/offline", "/offline.html"];
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

/** Inlined copy of /offline.html no-Plus gate — used when Cache API miss. */
const STATIC_OFFLINE_GATE_HTML = `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<meta name="theme-color" content="#111821"/>
<title>Brak połączenia · autobusszkolny</title>
<style>
:root{color-scheme:dark;--bg:#111821;--fg:#e8eef5;--muted:#9aa8b8;--bus:#3d7eff}
*{box-sizing:border-box}
body{margin:0;min-height:100dvh;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--fg);line-height:1.5}
main{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:1.5rem;padding-top:max(1.5rem,env(safe-area-inset-top));padding-bottom:max(1.5rem,env(safe-area-inset-bottom))}
.panel{width:100%;max-width:22rem;display:flex;flex-direction:column;align-items:center}
.icon{width:3.5rem;height:3.5rem;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:rgba(239,68,68,.18);color:#fecaca;margin-bottom:1.25rem}
h1{font-size:1.5rem;margin:0;letter-spacing:-.02em;font-weight:700}
.lead,.plus{color:var(--muted);font-size:1rem;margin:.75rem 0 0}
.plus strong{color:var(--fg);font-weight:600}
.actions{margin-top:2rem}
button.btn{display:inline-flex;align-items:center;justify-content:center;padding:.65rem 1.15rem;border-radius:.65rem;border:none;font-size:.95rem;font-weight:600;background:var(--bus);color:#fff;cursor:pointer;font-family:inherit}
</style>
</head>
<body>
<main>
<div class="panel">
<div class="icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h.01"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/><path d="M5 12.859a10 10 0 0 1 5.17-2.69"/><path d="M19 12.859a10 10 0 0 0-2.007-1.523"/><path d="M2 8.82a15 15 0 0 1 4.177-2.643"/><path d="M22 8.82a15 15 0 0 0-11.288-3.764"/><path d="m2 2 20 20"/></svg></div>
<h1>Brak połączenia z internetem</h1>
<p class="lead">Bez internetu nie ma dostępu do aplikacji.</p>
<p class="plus">Rozkład offline działa tylko dla użytkowników <strong>Planu Plus</strong> — po wcześniejszym otwarciu aplikacji online.</p>
<div class="actions"><button type="button" class="btn" onclick="location.reload()">Odśwież</button></div>
</div>
</main>
</body>
</html>`;

function offlineGateResponse() {
  return new Response(STATIC_OFFLINE_GATE_HTML, {
    status: 200,
    statusText: "OK",
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function ensureOfflineGateCached(cache) {
  const existing = await matchCachedPath(cache, OFFLINE_FALLBACK);
  if (existing) return;
  try {
    const fresh = await fetch(OFFLINE_FALLBACK, { cache: "no-store" });
    if (fresh.ok) {
      await cachePutSafe(cache, OFFLINE_FALLBACK, fresh);
      await cachePutSafe(
        cache,
        new URL(OFFLINE_FALLBACK, self.location.origin).href,
        fresh,
      );
      return;
    }
  } catch {
    // fall through to inlined HTML
  }
  const embedded = offlineGateResponse();
  await cachePutSafe(cache, OFFLINE_FALLBACK, embedded);
  await cachePutSafe(
    cache,
    new URL(OFFLINE_FALLBACK, self.location.origin).href,
    embedded,
  );
}

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
  await ensureOfflineGateCached(cache);

  const exact = await cache.match(request, { ignoreSearch: true });
  if (exact) return exact;

  let pathname = "/";
  try {
    pathname = new URL(request.url).pathname;
  } catch {
    // ignore
  }

  // Plus personalized page when warmed; never fall back to a stale cached `/`.
  if (pathname === "/offline") {
    return (
      (await matchCachedPath(cache, "/offline")) ||
      (await matchCachedPath(cache, OFFLINE_FALLBACK))
    );
  }

  if (pathname === OFFLINE_FALLBACK) {
    return matchCachedPath(cache, OFFLINE_FALLBACK);
  }

  // Prefer exact warm path, then static HTML gate (free users / cold start).
  const byPath = await matchCachedPath(cache, pathname);
  if (byPath && isWarmDocumentPath(pathname)) return byPath;

  return (
    (await matchCachedPath(cache, OFFLINE_FALLBACK)) ||
    (await matchCachedPath(cache, "/offline"))
  );
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    // Bypass HTTP cache so auth/session SSR is not served stale by the browser.
    const fresh = await fetch(request, { cache: "no-store" });
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
    // Last resort: always show the centered static gate (never the old 503 copy).
    return offlineGateResponse();
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
      await ensureOfflineGateCached(cache);
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
