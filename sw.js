// RepLog service worker: makes the app open offline (e.g. in a gym with no signal).
// Firestore keeps its own offline copy of your data and syncs when you're back online.
const CACHE = 'replog-v1';
const SHELL = ['./', './index.html', './firebase-sync.js', './firebase-config.js', './manifest.webmanifest',
               './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const own = url.origin === self.location.origin;
  const sdk = url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/');
  if (!own && !sdk) return;                       // sign-in and database traffic go straight to the network
  const store = res => { if (res && res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
  if (sdk){                                       // versioned library files never change: cache first
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(store)));
    return;
  }
  // the app's own files: network first so updates arrive, cached copy when offline
  e.respondWith(fetch(req).then(store).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html'))));
});
