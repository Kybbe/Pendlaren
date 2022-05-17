self.addEventListener('fetch', (event) => {
  if(navigator.onLine) {
    console.log("Du är online!");
  } else {
    console.log("Du är offline!");
    event.respondWith(
      caches.match(event.request).then((response) => {
        if(response) { return response }
        else { return caches.match(new Request('offline.html')) }
      })
    );
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll([
        './index.html',
        './index.css',
        './index.js',
        './service-worker.js',
        './offline.html',
        './favicon.ico'
      ]);
    })
  )
  self.skipWaiting();
  console.log('Installed');
});

self.addEventListener('activate', () => {
  self.skipWaiting();
  console.log('Activated');
});