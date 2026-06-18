const CACHE = 'forest-qcard-v2';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './manifest.webmanifest', './assets/background.jpg', './assets/title.png'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 코드/문서 요청은 네트워크 우선(최신 반영), 실패 시 캐시. 그 외(이미지·영상)는 캐시 우선.
self.addEventListener('fetch', event => {
  const req = event.request;
  const isDoc = req.mode === 'navigate' ||
    /\.(html|css|js|webmanifest)$/i.test(new URL(req.url).pathname);

  if (isDoc) {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
  } else {
    event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
  }
});
