// Service Worker for Dailyroll PWA
// Enforces NetworkOnly strategy for all API, auth, and database routes
// to prevent stale casino URLs, claim state, or auth sessions on installed PWAs.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // CRITICAL: NEVER intercept cross-origin / external requests (e.g. casino links like stake.us, pulsz.com, etc.)
  // Let the browser handle external requests natively to prevent "This page couldn't load" errors!
  if (url.origin !== self.location.origin) {
    return;
  }

  // NetworkOnly strategy for all same-origin API, auth, and dynamic data endpoints
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/data/") ||
    event.request.method !== "GET"
  ) {
    event.respondWith(
      fetch(event.request, {
        cache: "no-store",
      }),
    );
    return;
  }

  // Standard network request for same-origin navigation and static assets
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      throw new Error("Resource not available offline");
    }),
  );
});

// -------------------------------------------------------------
// Web Push & Notification Event Handlers
// -------------------------------------------------------------

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "DailyRoll — Ready to Claim!", body: event.data.text() };
  }

  const title = payload.title || "DailyRoll — Ready to Claim!";
  const options = {
    body: payload.body || "Your daily reload bonus is ready to claim now!",
    icon: payload.icon || "/icon-192x192.png",
    badge: "/favicon.ico",
    vibrate: [200, 100, 200],
    tag: payload.tag || "dailyroll-ready-claim",
    renotify: true,
    data: {
      url: payload.url || "/tracker",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/tracker";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url && client.url.includes("/tracker") && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

// Allow active window clients to show local notifications through service worker
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const { title, options } = event.data;
    if (self.registration && self.registration.showNotification) {
      self.registration.showNotification(title, options);
    }
  }
});
