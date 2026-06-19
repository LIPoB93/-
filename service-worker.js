const CACHE = 'forest-qcard-v3';
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

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // 외부 도메인(구글 Apps Script 등)·비GET 요청은 service worker가 절대 건드리지 않음
  if (url.origin !== self.location.origin || req.method !== 'GET') {
    return; // 브라우저가 직접 네트워크로 처리
  }

  const isDoc = req.mode === 'navigate' ||
    /\.(html|css|js|webmanifest)$/i.test(url.pathname);

  if (isDoc) {
    // 코드/문서: 네트워크 우선(최신 반영), 실패 시 캐시
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
  } else {
    // 이미지·영상 등: 캐시 우선
    event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
  }
});
