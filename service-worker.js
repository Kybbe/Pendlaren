self.addEventListener('fetch', async (event) => {
  console.log("fetch event", event.request);
  if(navigator.onLine) {
    console.log("Du är online!");

    const response = await updateCache(event.request);
    return response;

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
        './favicon.ico',
        './trainTrack.jpeg'
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

async function updateCache(request) {
  const response = await fetch(request);

  if(request.method == "GET") {
    const cache = await caches.open('v1');
    cache.put(request, response.clone());
  }
  
  return response;
}