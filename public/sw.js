/* Habit Heatmap service worker: offline app shell. No user data ever passes through here. */
const VERSION = "hh-v1";
const SHELL = ["/", "/settings", "/habit", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// The page tells us which assets it already loaded so a first visit works offline too.
self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "CACHE_URLS") return;
  const urls = (event.data.urls || []).filter((u) => new URL(u, self.location.origin).origin === self.location.origin);
  event.waitUntil(caches.open(VERSION).then((cache) => Promise.allSettled(urls.map((u) => cache.add(u)))));
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch cross-origin requests

  // Hashed build assets are immutable: cache first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
            return res;
          }),
      ),
    );
    return;
  }

  // Pages: network first, fall back to the cached page (ignoring ?id=… query strings).
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() =>
          caches
            .match(req, { ignoreSearch: true })
            .then((hit) => hit || caches.match("/", { ignoreSearch: true })),
        ),
    );
    return;
  }

  // Everything else same-origin (icons, fonts, manifest): stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => hit);
      return hit || network;
    }),
  );
});
