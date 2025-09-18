self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open("mirror-cache").then((cache) => {
      return cache.addAll(["/", "/index.html", "/style.css", "/assets/js/mirror.js"]);
    })
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((resp) => {
      return resp || fetch(e.request);
    })
  );
});
