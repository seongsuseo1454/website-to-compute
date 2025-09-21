const CACHE = 'mirror-v1';
const ASSETS = [
  '/', '/index.html', '/style.css', '/ai.js',
  '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'
];

self.addEventListener
('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener
('activate', (e)=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete
(k))))
  );
  self.clients.claim();
});
self.addEventListener
('fetch', (e)=>{
  const { request } = e;
  if (request.method
 !== 'GET') return;
  e.respondWith(
    caches.match(request).then(cached=>{
      return cached || fetch(request).then(res=>{
        return res;
      }).catch(()=> caches.match('/index.html'));
    })
  );
});
