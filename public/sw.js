/* Minimal service worker: push and notification clicks only.
   Do not add a fetch listener or the Cache API. Schedule data must stay live. */

self.addEventListener("push", (event) => {
  const fallback = {
    title: "Dojazdy do szkoły",
    body: "",
    url: "/",
  };

  let payload = fallback;
  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = {
        title: typeof parsed.title === "string" ? parsed.title : fallback.title,
        body: typeof parsed.body === "string" ? parsed.body : "",
        url: typeof parsed.url === "string" ? parsed.url : "/",
      };
    }
  } catch {
    payload = fallback;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
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
  const target = new URL(rawUrl, self.location.origin).href;

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
