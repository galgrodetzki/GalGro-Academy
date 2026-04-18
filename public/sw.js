const CACHE_NAME = "galgro-academy-v3";
const STATIC_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/brand/galgro-mark.svg",
  "/brand/galgro-icon-192.png",
  "/brand/galgro-icon-512.png",
  "/brand/galgro-maskable-512.png",
  "/brand/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (event.data?.type !== "CACHE_ASSETS" || !Array.isArray(event.data.urls)) return;
  const sameOriginUrls = event.data.urls.filter((url) => {
    try {
      return new URL(url).origin === self.location.origin;
    } catch {
      return false;
    }
  });

  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(sameOriginUrls)));
});

// Mentor-D: Web Push handlers.
// Payload shape:
//   { title, body, url?, tag?, triggerType?, messageId? }
// Non-fatal if payload missing/malformed — falls back to a generic badge.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Mentor";
  const options = {
    body: payload.body || "New message from Mentor.",
    icon: "/brand/galgro-icon-192.png",
    badge: "/brand/galgro-icon-192.png",
    tag: payload.tag || payload.messageId || "mentor-message",
    renotify: true,
    data: {
      url: payload.url || "/",
      messageId: payload.messageId || null,
      triggerType: payload.triggerType || null,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Focus an existing tab at the site origin if possible; otherwise open a new one.
      for (const client of clientsList) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin) {
            client.focus();
            if (client.navigate && clientUrl.pathname !== targetUrl) {
              client.navigate(targetUrl).catch(() => {});
            }
            return;
          }
        } catch {
          // ignore malformed URLs
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/") || caches.match("/index.html")),
    );
    return;
  }

  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname === "/favicon.svg" ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        });
      }),
    );
  }
});
