// Back to Back Gym — service worker: l'app parte anche senza rete.
// index.html e app.js: prima la rete (così gli aggiornamenti arrivano subito), poi la copia salvata.
// Icone e React: copia salvata (non cambiano mai).
const CACHE_NAME = "bb-gym-cache-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./vendor/react.production.min.js",
  "./vendor/react-dom.production.min.js",
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
  if (event.request.method !== "GET") return;

  if (url.includes("google") || url.includes("googleapis")) {
    return;
  }

  const path = new URL(url).pathname;
  const networkFirst = event.request.mode === "navigate" || path.endsWith("/") || path.endsWith("/index.html") || path.endsWith("/app.js");

  if (networkFirst) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request).then((c) => c || (event.request.mode === "navigate" ? caches.match("./index.html") : undefined)))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((res) => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      return res;
    }).catch(() => cached))
  );
});
