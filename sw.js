const CACHE_NAME = 'control-room-log-v1';
const CORE_ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// 앱 껍데기(HTML/아이콘/매니페스트)는 캐시 우선, 그 외(Firebase API 등)는 네트워크 우선으로 처리
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const isCoreAsset = url.origin === self.location.origin;

  if (!isCoreAsset) {
    // Firestore/외부 API 요청은 항상 네트워크로 보내 실시간성을 유지
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
