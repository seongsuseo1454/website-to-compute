// 아주 단순한 오프라인 캐시 (정적판)
const CACHE = 'mirror-static-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './assets/css/reset.css',
  './assets/js/mirror.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k===CACHE?null:caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e=>{
  const { request } = e;
  if(request.method!=='GET') return;
  e.respondWith(
    caches.match(request).then(cached=>{
      return cached || fetch(request).then(resp=>{
        const copy = resp.clone();
        caches.open(CACHE).then(c=>c.put(request, copy));
        return resp;
      }).catch(()=>cached || new Response('오프라인입니다.',{status:503}));
    })
  );
});
