/* TesJEE service worker - cache-first for offline support */
const VERSION = 'tesjee-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './instructions.html',
  './test.html',
  './results.html',
  './manifest.json',
  './css/styles.css',
  './js/common.js',
  './js/landing.js',
  './js/instructions.js',
  './js/test.js',
  './js/scoring.js',
  './js/results.js',
  './data/2024_paper1.json',
  './data/2024_paper2.json'
];

// Question images — pre-cache so an in-progress test survives offline.
const IMAGE_ASSETS = [];
for (let i = 1; i <= 75; i++)  IMAGE_ASSETS.push(`./questions/2024/mathematics_q${i}.png`);
for (let i = 1; i <= 40; i++)  IMAGE_ASSETS.push(`./questions/2024/physics_q${i}.png`);
for (let i = 41; i <= 80; i++) IMAGE_ASSETS.push(`./questions/2024/chemistry_q${i}.png`);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then(async cache => {
      // Core: must all succeed
      await cache.addAll(CORE_ASSETS);
      // Images: best-effort; tolerate individual failures
      await Promise.all(IMAGE_ASSETS.map(url =>
        cache.add(url).catch(() => null)
      ));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Same-origin only
  if (url.origin !== location.origin) return;

  // Stale-while-revalidate: serve cached, refresh in background
  event.respondWith(
    caches.open(VERSION).then(async cache => {
      const cached = await cache.match(req);
      const fetchPromise = fetch(req).then(res => {
        if (res && res.status === 200) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
