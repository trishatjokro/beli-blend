// Stale-while-revalidate cache for the app shell, so Beli Blend still opens
// (and can still Blend two already-added lists) with a flaky connection.
// Cross-origin requests (Tesseract.js off the CDN) pass straight through —
// caching an opaque cross-origin response would just waste storage here.
const CACHE_NAME = "beli-blend-v1";
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./js/state.js",
  "./js/parse.js",
  "./js/algorithm.js",
  "./js/ocr.js",
  "./js/importers.js",
  "./js/export.js",
  "./js/ui.js",
  "./js/main.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
