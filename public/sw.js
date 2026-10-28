/* Service worker: Web Push + offline shell (Plan Plus data lives in IndexedDB).
   Cache API is limited to same-origin navigations and static assets — not /api/*. */

const SHELL_CACHE = "school-bus-shell-v1";
const PRECACHE_URLS = [
  "/offline",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

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
    pathname.startsWith("/icons/") ||
    pathname === "/manifest.webmanifest" ||
    pathname.endsWith(".webmanifest")
  );
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) {
      void cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await cache.match("/offline");
    if (offline) return offline;
    return new Response("Brak połączenia z internetem.", {
      status: 503,
      statusText: "Offline",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh.ok) {
      void cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    return (
      cached ||
      new Response("", { status: 503, statusText: "Offline" })
    );
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
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

  // Keep API and the worker script on the network (client uses IndexedDB offline).
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  if (request.mode === "navigate") {
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
      // Backend sends a stable `tag` (trip id). Without it, fall back so successive
      // reminders with different title/body still do not collapse into one.
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
