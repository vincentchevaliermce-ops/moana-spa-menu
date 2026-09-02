const CACHE_NAME = 'moana-caisse-v6';

// Network with timeout: on slow connections, fall back to cache quickly
function fetchWithTimeout(req, ms) {
  return Promise.race([
    fetch(req),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
  ]);
}
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(ASSETS).catch(() => c.addAll(['./index.html', './manifest.json'])))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // Pages (navigations + index.html): NETWORK FIRST, so updates always arrive.
  // Cache fallback keeps the app working offline.
  const isPage = e.request.mode === 'navigate' ||
    (e.request.destination === 'document') ||
    e.request.url.endsWith('/register/') ||
    e.request.url.endsWith('/index.html');

  if (isPage) {
    e.respondWith(
      fetchWithTimeout(e.request, 3000).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return resp;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Other assets: cache first, refresh in background (stale-while-revalidate).
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
