/* Service worker — offline support for Guddu Order Manager.
   Precaches the app shell; runtime-caches the CDN PDF libs so the app
   works fully offline after the first online load. */
var VERSION = 'gom-v7';
var SHELL = VERSION + '-shell';
var RUNTIME = VERSION + '-runtime';

var SHELL_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './css/styles.css',
  './js/logo.js',
  './js/data.js',
  './js/pdf.js',
  './js/sync.js',
  './js/designs.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-64.png',
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(SHELL).then(function (c) { return c.addAll(SHELL_ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf(VERSION) !== 0; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // Navigations: network first, fall back to cached shell / offline page.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(function () {
        return caches.match('./index.html').then(function (r) { return r || caches.match('./offline.html'); });
      })
    );
    return;
  }

  // Same-origin shell assets: stale-while-revalidate.
  // Serve cached copy instantly (works offline) while fetching a fresh copy
  // in the background, so deployed updates reach users on the next reload.
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.open(SHELL).then(function (cache) {
        return cache.match(req).then(function (cached) {
          var network = fetch(req).then(function (res) {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          }).catch(function () { return cached; });
          return cached || network;
        });
      })
    );
    return;
  }

  // Cross-origin (CDN jsPDF): stale-while-revalidate into runtime cache.
  e.respondWith(
    caches.open(RUNTIME).then(function (cache) {
      return cache.match(req).then(function (cached) {
        var network = fetch(req).then(function (res) {
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        }).catch(function () { return cached; });
        return cached || network;
      });
    })
  );
});
