const CACHE_NAME = "bb-gym-cache-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./vendor/react.production.min.js",
  "./vendor/react-dom.production.min.js",
  "./vendor/babel.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Le chiamate a Google (login + Drive) devono SEMPRE andare in rete, mai cache.
  if (url.includes("google") || url.includes("googleapis")) {
    return;
  }

  // index.html / navigazioni: network-first con fallback alla cache (offline).
  if (event.request.mode === "navigate" || url.endsWith("index.html") || url.endsWith("/gym-app/") || url.endsWith("/gym-app")) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request).then((c) => c || caches.match("./index.html")))
    );
    return;
  }

  // Tutto il resto (incluso vendor/*): cache-first con fallback alla rete,
  // così React/Babel sono disponibili anche senza connessione.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((res) => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      return res;
    }).catch(() => cached))
  );
});
