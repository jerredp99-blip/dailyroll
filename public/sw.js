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
