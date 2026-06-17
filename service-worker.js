const CACHE = 'forest-qcard-v1';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './manifest.webmanifest', './assets/background.jpg', './assets/title.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request))));
