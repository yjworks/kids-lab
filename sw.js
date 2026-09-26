/* 키즈랩 서비스워커 - 처음 열 때 전부 받아 두고, 다음부터는 인터넷 없이도 실행된다.
   파일을 고치면 CACHE 값을 올린다.
   글꼴(Pretendard) 조각 파일 92개는 미리 받지 않는다. 화면에 필요한 조각만 처음 쓸 때 받아
   FONT_CACHE에 두고, 다음부터는 저장해 둔 것을 쓴다. 글꼴은 바뀌지 않으므로 CACHE를 올려도 지우지 않는다. */
var CACHE = 'kidlab-v27';
var FONT_CACHE = 'kidlab-fonts-v1';
var SHELL = [
  "./",
  "./index.html",
  "./guide.html",
  "./manifest.webmanifest",
  "./shared/kid.js",
  "./shared/app.css",
  "./shared/db-tokens.css",
  "./fonts/pretendard.css",
  "./shared/apps.js",
  "./shared/courses.js",
  "./shared/glyphs.js",
  "./shared/trace.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/maskable-192.png",
  "./icons/icon.svg",
  "./icons/icon-32.png",
  "./icons/favicon.ico",
  "./icons/app-hangul.svg",
  "./icons/app-batchim.svg",
  "./icons/app-hanja.svg",
  "./icons/app-daily.svg",
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
  "./shared/hangul.js",
  "./shared/words.js",
  "./shared/copy.js",
  "./shared/classics.js",
  "./apps/korean/index.html",
  "./apps/phonics/index.html",
  "./apps/esent/index.html",
  "./apps/ebooks/index.html",
  "./apps/space/index.html",
  "./apps/wordmath/index.html",
  "./apps/earth/index.html",
  "./apps/world/index.html",
  "./apps/money/index.html",
  "./apps/media/index.html",
  "./apps/aiteach/index.html",
  "./apps/typing/index.html",
  "./apps/world/flags.js",
  "./apps/classic/index.html",
  "./apps/daily/elevator.js",
  "./apps/batchim/index.html",
  "./apps/wordmake/index.html",
  "./apps/sentence/index.html",
  "./apps/books/index.html",
  "./apps/listen/index.html",
  "./apps/sounds/index.html",
  "./apps/vocab/index.html",
  "./apps/sequence/index.html",
  "./apps/hanja/index.html",
  "./apps/arcade/index.html",
  "./apps/passage/index.html",
  "./apps/passage/passages.js",
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
  /* 같은 도메인(dibrain.dev)의 다른 앱 캐시는 건드리지 않고, 키즈랩의 옛 캐시만 지운다 */
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { return k.indexOf('kidlab-') !== 0 || k === CACHE || k === FONT_CACHE ? null : caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  /* 글꼴 파일: 저장해 둔 것이 있으면 네트워크를 보지 않고 바로 쓴다 */
  if (/\/fonts\/.+\.woff2$/.test(url.pathname)) {
    e.respondWith(caches.open(FONT_CACHE).then(function (c) {
      return c.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          if (res && res.status === 200) c.put(req, res.clone());
          return res;
        });
      });
    }));
    return;
  }

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
