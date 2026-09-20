/* 키즈랩 서비스워커 - 처음 열 때 전부 받아 두고, 다음부터는 인터넷 없이도 실행된다.
   파일을 고치면 CACHE 값을 올린다. */
var CACHE = 'kidlab-v7';
var SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./shared/kid.js",
  "./shared/app.css",
  "./shared/apps.js",
  "./shared/glyphs.js",
  "./shared/trace.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./apps/blocks/index.html",
  "./apps/calc/index.html",
  "./apps/clock/index.html",
  "./apps/coding/index.html",
  "./apps/daily/index.html",
  "./apps/diary/index.html",
  "./apps/draw/index.html",
  "./apps/english/index.html",
  "./apps/feelings/index.html",
  "./apps/hangul/index.html",
  "./apps/math/index.html",
  "./apps/maze/index.html",
  "./apps/memory/index.html",
  "./apps/music/index.html",
  "./apps/safety/index.html",
  "./apps/science/index.html",
  "./apps/shapes/index.html",
  "./apps/shop/index.html",
  "./apps/story/index.html"
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(SHELL.map(function (u) {
      return c.add(new Request(u, { cache: 'reload' })).catch(function () { /* 하나 실패해도 설치는 계속 */ });
    }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  /* 화면 이동은 네트워크를 먼저 보고, 안 되면 저장해 둔 것을 쓴다 */
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); });
      return res;
    }).catch(function () {
      return caches.match(req).then(function (r) { return r || caches.match('./index.html'); });
    }));
    return;
  }

  /* 나머지는 저장해 둔 것을 바로 보여 주고, 뒤에서 새 파일을 받아 갱신한다.
     그래서 앱을 고쳐 올리면 다음에 열 때 자동으로 최신이 된다. */
  e.respondWith(caches.match(req).then(function (hit) {
    var fresh = fetch(req).then(function (res) {
      if (res && res.status === 200 && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () { return hit; });
    return hit || fresh;
  }));
});

self.addEventListener('message', function (e) { if (e.data === 'skipWaiting') self.skipWaiting(); });
