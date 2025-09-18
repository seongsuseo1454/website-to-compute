// assets/js/worker.js
const CACHE = 'mirror-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/assets/css/mirror.css',
  '/assets/js/mirror.js',
  '/assets/js/env.js'
];

// 설치: 핵심 자산 프리캐시
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(()=> self.skipWaiting()));
});

// 활성화: 오래된 캐시 정리
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=> caches.delete(k))))
      .then(()=> self.clients.claim())
  );
});

// 요청 처리: 정적 파일은 캐시 우선, API/외부는 네트워크 우선
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const isGET = e.request.method === 'GET';
  const isStatic = url.origin === location.origin && (url.pathname.startsWith('/assets/') || url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/manifest.webmanifest');

  if (!isGET) return; // POST 등은 패스

  if (isStatic) {
    // 캐시 우선
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res=>{
        const copy = res.clone(); caches.open(CACHE).then(c=> c.put(e.request, copy));
        return res;
      }))
    );
  } else {
    // 네트워크 우선(오프라인시 캐시 폴백)
    e.respondWith(
      fetch(e.request).then(res=>{
        return res;
      }).catch(()=> caches.match(e.request))
    );
  }
});
