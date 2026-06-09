/* Service worker — caches the app shell + question banks for full offline use */
const CACHE = "cse-reviewer-v1";
const ASSETS = [
  "index.html",
  "styles.css",
  "app.js",
  "manifest.json",
  "data/numerical.json",
  "data/verbal.json",
  "data/analytical.json",
  "data/general.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-180.png",
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      // addAll fails the whole install if one asset 404s; add individually to be resilient
      Promise.all(ASSETS.map((a) => c.add(a).catch(() => null)))
    )
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
            return res;
          })
          .catch(() => caches.match("index.html"))
    )
  );
});
