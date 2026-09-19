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

// ==========================================
// Web Push Notifications Handling
// ==========================================

self.addEventListener("push", (event) => {
  let data = {
    title: "dailyroll | Bonus Ready!",
    body: "Your daily bonus cooldown has expired. Claim now!",
    icon: "/icon-192.png",
    badge: "/favicon-32x32.png",
    data: {
      url: "/tracker",
    },
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = {
        ...data,
        ...parsed,
        data: {
          ...data.data,
          ...(parsed.data || {}),
        },
      };
    } catch {
      data.body = event.data.text() || data.body;
    }
  }

  const title = data.title || "dailyroll | Bonus Ready!";

  event.waitUntil(
    (async () => {
      try {
        const options = {
          body: data.body || "A casino bonus is ready to claim!",
          icon: data.icon || "/icon-192.png",
          badge: data.badge || "/favicon-32x32.png",
          tag: data.tag || "dailyroll-notification",
          renotify: data.renotify !== false,
          data: {
            url: data.data?.url || "/tracker",
            timestamp: Date.now(),
          },
        };
        // Add vibration only where supported
        if ("vibrate" in navigator) {
          options.vibrate = [150, 50, 150];
        }
        await self.registration.showNotification(title, options);
      } catch (primaryErr) {
        console.warn("[sw] Standard showNotification failed, trying minimal fallback:", primaryErr);
        try {
          // Minimal fallback guaranteed on iOS Safari PWA and older browsers
          await self.registration.showNotification(title, {
            body: data.body || "A casino bonus is ready to claim!",
            icon: "/icon-192.png",
          });
        } catch (fallbackErr) {
          console.error("[sw] Fallback showNotification failed:", fallbackErr);
        }
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") {
    return;
  }

  const targetUrl = event.notification.data?.url || "/tracker";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const resolvedTarget = new URL(targetUrl, self.location.origin).href;

      // 1. Focus existing window/tab matching the target URL
      for (const client of clientList) {
        if (client.url === resolvedTarget && "focus" in client) {
          return client.focus();
        }
      }

      // 2. Or focus an existing window on the same origin and navigate it
      for (const client of clientList) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          if ("navigate" in client) {
            client.navigate(resolvedTarget);
          }
          return client.focus();
        }
      }

      // 3. Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(resolvedTarget);
      }
    })
  );
});

