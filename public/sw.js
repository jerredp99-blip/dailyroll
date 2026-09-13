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

  // NetworkOnly strategy for all API and data endpoints
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

  // Standard network request for navigation and static assets
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  );
});

