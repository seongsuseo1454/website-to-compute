// service-worker.js
const CACHE_NAME = 'msm-cache-v7';  // <- 버전 올리기 (v7 처럼)
const PRECACHE = [
  '/', '/index.html',
  '/style.css',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener
('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll
(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener
('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete
(k) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener
('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});

