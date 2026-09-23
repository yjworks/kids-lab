/* KidLab 공용 코어 - 프로필/별/미션/TTS/효과음/퀴즈 엔진
   런처(index.html)와 모든 앱(apps/*)이 같은 파일을 사용합니다. (같은 origin의 localStorage 공유) */
(function (global) {
  'use strict';

  var META_KEY = 'kidlab.meta';

  /* ---------- 유틸 ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function todayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dateSeed(d) { var k = todayKey(d).replace(/-/g, ''); return parseInt(k, 10); }
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function sample(arr, n, exclude) { var pool = arr.filter(function (x) { return !exclude || exclude.indexOf(x) < 0; }); return shuffle(pool).slice(0, n); }
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), attrs[k]);
      else if (k === 'style') e.style.cssText = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (children) (Array.isArray(children) ? children : [children]).forEach(function (c) { if (c == null) return; e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- 저장소 ---------- */
  function loadJSON(key, def) { try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? def : v; } catch (e) { return def; } }
  function saveJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { } }

  var DEFAULT_SETTINGS = { tts: true, sfx: true, mute: false, rate: 0.9, limitMin: 0, breakMin: 20, vibrate: true };
  function meta() {
    var m = loadJSON(META_KEY, null);
    if (!m || !m.profiles) m = { profiles: [], current: null, settings: {} };
    if (!m.settings) m.settings = {};
    for (var k in DEFAULT_SETTINGS) if (typeof m.settings[k] === 'undefined') m.settings[k] = DEFAULT_SETTINGS[k];
    return m;
  }
  function setSetting(key, val) { var m = meta(); m.settings[key] = val; saveMeta(m); notify('settings', { key: key, val: val }); return val; }
  /* 상단바 한 번으로 소리 전부 끄기 */
  function muted() { return meta().settings.mute === true; }
  function toggleMute() { var v = !muted(); setSetting('mute', v); if (v && window.speechSynthesis) { try { speechSynthesis.cancel(); } catch (e) { } } return v; }
  function saveMeta(m) { saveJSON(META_KEY, m); }

  function defaultData() { return { stars: 0, totalStars: 0, progress: {}, days: {}, stickers: [], drawings: [], diary: {}, stories: [], wrong: {}, stamps: 0, created: todayKey() }; }
  function pkey(id) { return 'kidlab.p.' + id; }
  function loadData(id) { var d = loadJSON(pkey(id), null); if (!d) d = defaultData(); return d; }
  function saveData(id, d) { saveJSON(pkey(id), d); }

  function currentProfile() {
    var m = meta();
    if (!m.current) return null;
    for (var i = 0; i < m.profiles.length; i++) if (m.profiles[i].id === m.current) return m.profiles[i];
    return null;
  }
  function requireProfile() {
    var p = currentProfile();
    if (p) return p;
    var m = meta();
    var np = { id: 'p' + Date.now(), name: '친구', avatar: '🐣', created: todayKey() };
    m.profiles.push(np); m.current = np.id; saveMeta(m);
    return np;
  }
  /* 읽기-수정-저장 (여러 창이 동시에 열려도 안전) */
  function mutate(fn) {
    var p = requireProfile();
    var d = loadData(p.id);
    var r = fn(d, p);
    saveData(p.id, d);
    notify('update');
    return r;
  }
  function data() { var p = requireProfile(); return loadData(p.id); }

  function dayRec(d, key) { key = key || todayKey(); if (!d.days[key]) d.days[key] = { events: {}, missions: [], stars: 0, apps: {} }; var r = d.days[key]; if (!r.sec) r.sec = 0; if (!r.acts) r.acts = 0; if (!r.stamps) r.stamps = 0; return r; }

  /* ---------- 부모 창 통신 ---------- */
  function notify(action, payload) {
    try { if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'kidlab', action: action, payload: payload || null }, '*'); } catch (e) { }
    try { window.dispatchEvent(new CustomEvent('kidlab:' + action, { detail: payload })); } catch (e) { }
  }

  /* ---------- 별 / 이벤트 / 진도 ---------- */
  var APP_ID = (document.body && document.body.getAttribute('data-app')) || (location.pathname.match(/apps\/([^\/]+)/) || [])[1] || 'os';

  function addStar(n, appId) {
    n = n || 1; appId = appId || APP_ID;
    mutate(function (d) {
      d.stars += n; d.totalStars += n;
      var day = dayRec(d); day.stars += n;
      day.apps[appId] = (day.apps[appId] || 0) + 1;
    });
    floatStar(n);
    notify('star', { n: n });
  }
  function spendStars(n) { return mutate(function (d) { if (d.stars < n) return false; d.stars -= n; return true; }); }
  function event(appId, key, n) {
    if (typeof key === 'undefined') { key = appId; appId = APP_ID; }
    n = n == null ? 1 : n;
    if (key === 'win' || key === 'save') setTimeout(function () { stampToast(addActivity()); }, 300);
    mutate(function (d) {
      var day = dayRec(d);
      day.events[appId] = day.events[appId] || {};
      day.events[appId][key] = (day.events[appId][key] || 0) + n;
      day.apps[appId] = (day.apps[appId] || 0) + 1;
    });
    checkMissions();
  }
  function progress(appId) { appId = appId || APP_ID; var d = data(); return d.progress[appId] || {}; }
  function setProgress(appId, patch) {
    if (typeof patch === 'undefined') { patch = appId; appId = APP_ID; }
    mutate(function (d) { d.progress[appId] = Object.assign(d.progress[appId] || {}, patch); });
  }
  function getLevel(mode) { var p = progress(); return (p.levels && p.levels[mode]) || 1; }
  function setLevel(mode, lv) { var p = progress(); var levels = p.levels || {}; levels[mode] = lv; setProgress({ levels: levels }); }

  /* ---------- 오답 노트 ----------
     틀린 문제를 앱·모드별로 모아 두었다가 다음 판 앞쪽에 다시 낸다.
     소리로 내는 문제(q.after가 있는 문제)는 화면만으로 다시 낼 수 없어 저장하지 않는다. */
  var WRONG_MAX = 12;
  function wrongKey(mode) { return APP_ID + ':' + (mode || '-'); }
  function plainQ(q) {
    if (!q || q.after) return null;
    return {
      key: qkey(q), prompt: q.prompt, say: q.say || null, sayLang: q.sayLang || null,
      sub: q.sub || null, cols: q.cols || null, big: !!q.big,
      choices: (q.choices || []).map(function (c) { return { html: String(c.html), correct: !!c.correct, say: c.say || null, sayLang: c.sayLang || null, cls: c.cls || null }; })
    };
  }
  function addWrong(mode, q) {
    var pq = plainQ(q); if (!pq) return;
    mutate(function (d) {
      if (!d.wrong) d.wrong = {};
      var k = wrongKey(mode); var list = d.wrong[k] || [];
      list = list.filter(function (x) { return x.key !== pq.key; });
      list.push({ key: pq.key, q: pq, ts: Date.now() });
      if (list.length > WRONG_MAX) list = list.slice(list.length - WRONG_MAX);
      d.wrong[k] = list;
    });
  }
  function takeWrongs(mode, n) {
    var d = data(); var list = (d.wrong && d.wrong[wrongKey(mode)]) || [];
    return list.slice(0, n).map(function (x) { var q = Object.assign({}, x.q); q.review = true; return q; });
  }
  function clearWrong(mode, key) {
    mutate(function (d) {
      if (!d.wrong) return;
      var k = wrongKey(mode); var list = d.wrong[k] || [];
      d.wrong[k] = list.filter(function (x) { return x.key !== key; });
    });
  }
  function wrongCount(mode) { var d = data(); return ((d.wrong && d.wrong[wrongKey(mode)]) || []).length; }

  /* ---------- 도장판 ----------
     활동 3개를 하면 도장 1개. 도장 10개면 보너스 별 5개. 5세가 체감하는 짧은 목표. */
  var STAMP_PER = 3, STAMP_GOAL = 10;
  function addActivity() {
    return mutate(function (d) {
      var day = dayRec(d);
      day.acts = (day.acts || 0) + 1;
      var earned = 0;
      while (day.acts >= (day.stamps + 1) * STAMP_PER) { day.stamps++; d.stamps = (d.stamps || 0) + 1; earned++; }
      if (earned) { d.stars += 2 * earned; d.totalStars += 2 * earned; day.stars += 2 * earned; }
      return { earned: earned, acts: day.acts, stamps: day.stamps };
    });
  }
  function stampToast(r) {
    if (r && r.earned) { toast('🏅 도장 ' + r.stamps + '개! (+' + (2 * r.earned) + '⭐)'); sfx.star(); notify('update'); }
  }
  function stampState() {
    var d = data(); var day = d.days[todayKey()] || {};
    var acts = day.acts || 0, st = day.stamps || 0;
    return { acts: acts, today: st, total: d.stamps || 0, per: STAMP_PER, goal: STAMP_GOAL, next: (st + 1) * STAMP_PER - acts };
  }

  /* ---------- 사용 시간 ---------- */
  function addUsage(sec) { mutate(function (d) { dayRec(d).sec += sec; }); }
  function usageToday() { var d = data(); var day = d.days[todayKey()]; return day ? Math.round((day.sec || 0) / 60) : 0; }

  function markVisit(appId) {
    appId = appId || APP_ID;
    mutate(function (d) { var day = dayRec(d); day.apps[appId] = (day.apps[appId] || 0) + 1; d.lastApp = appId; });
  }

  /* ---------- 출석 / 통계 ---------- */
  function streak(d) {
    d = d || data();
    var n = 0; var dt = new Date();
    if (!d.days[todayKey(dt)]) dt.setDate(dt.getDate() - 1);
    while (d.days[todayKey(dt)]) { n++; dt.setDate(dt.getDate() - 1); }
    return n;
  }

  /* ---------- 오늘의 미션 ---------- */
  var MISSION_POOL = [
    { app: 'hangul', key: 'correct', n: 5, label: '한글 놀이에서 5문제 맞히기', icon: '가' },
    { app: 'english', key: 'correct', n: 5, label: '영어 놀이에서 5문제 맞히기', icon: '🔤' },
    { app: 'math', key: 'correct', n: 6, label: '수학 놀이에서 6문제 맞히기', icon: '🔢' },
    { app: 'shapes', key: 'correct', n: 5, label: '모양·색깔 5문제 맞히기', icon: '🔷' },
    { app: 'clock', key: 'correct', n: 4, label: '시계 놀이 4문제 맞히기', icon: '⏰' },
    { app: 'science', key: 'correct', n: 5, label: '과학 탐험 5문제 맞히기', icon: '🔬' },
    { app: 'daily', key: 'correct', n: 4, label: '생활 습관 4문제 맞히기', icon: '🪥' },
    { app: 'feelings', key: 'correct', n: 4, label: '마음 알기 4문제 맞히기', icon: '😊' },
    { app: 'safety', key: 'correct', n: 4, label: '안전 지킴이 4문제 맞히기', icon: '🚦' },
    { app: 'memory', key: 'win', n: 1, label: '기억 카드 한 판 완성하기', icon: '🃏' },
    { app: 'draw', key: 'save', n: 1, label: '그림 1장 그려서 저장하기', icon: '🎨' },
    { app: 'music', key: 'win', n: 1, label: '리듬 따라하기 성공하기', icon: '🎹' },
    { app: 'story', key: 'save', n: 1, label: '이야기 1편 만들기', icon: '📖' },
    { app: 'diary', key: 'save', n: 1, label: '오늘의 일기 쓰기', icon: '📔' },
    { app: 'maze', key: 'win', n: 1, label: '미로 탈출 성공하기', icon: '🧭' },
    { app: 'coding', key: 'win', n: 1, label: '로봇 코딩 1단계 성공하기', icon: '🤖' },
    { app: 'shop', key: 'correct', n: 3, label: '가게 놀이에서 3번 계산하기', icon: '🛒' },
    { app: 'calc', key: 'correct', n: 4, label: '숫자 읽기 4문제 맞히기', icon: '🧮' },
    { app: 'blocks', key: 'correct', n: 5, label: '숫자 블록 5문제 맞히기', icon: '🧱' },
    { app: 'hangul', key: 'trace', n: 3, label: '한글 3글자 따라 쓰기', icon: '✏️' },
    { app: 'english', key: 'trace', n: 3, label: '영어 3글자 따라 쓰기', icon: '✏️' },
    { app: 'math', key: 'trace', n: 3, label: '숫자 3개 따라 쓰기', icon: '✏️' },
    { app: 'books', key: 'read', n: 1, label: '읽기 책 한 권 읽기', icon: '📚' },
    { app: 'batchim', key: 'correct', n: 5, label: '받침 놀이 5문제 맞히기', icon: '받' },
    { app: 'sentence', key: 'correct', n: 5, label: '문장 5개 읽고 맞히기', icon: '📝' },
    { app: 'listen', key: 'heard', n: 1, label: '이야기 한 편 듣고 맞히기', icon: '👂' },
    { app: 'sounds', key: 'correct', n: 5, label: '소리 놀이 5문제 맞히기', icon: '👏' },
    { app: 'vocab', key: 'correct', n: 5, label: '낱말 뜻 5문제 맞히기', icon: '💡' },
    { app: 'wordmake', key: 'correct', n: 4, label: '낱말 4개 만들기', icon: '🧩' },
    { app: 'sequence', key: 'correct', n: 3, label: '이야기 순서 3번 맞추기', icon: '🎬' },
    { app: 'hanja', key: 'correct', n: 5, label: '한자 5문제 맞히기', icon: '山' },
    { app: 'arcade', key: 'win', n: 1, label: '오락실에서 한 판 이기기', icon: '🕹️' }
  ];
  var DAILY_FIXED = { app: 'diary', key: 'save', n: 1, label: '오늘의 일기 쓰기', icon: '📔' };
  function missions(d) {
    d = d || data();
    var rnd = mulberry32(dateSeed());
    var pool = MISSION_POOL.filter(function (m) { return m.app !== 'diary'; });
    var chosen = [];
    while (chosen.length < 3) { var m = pool[Math.floor(rnd() * pool.length)]; if (chosen.indexOf(m) < 0) chosen.push(m); }
    chosen.push(DAILY_FIXED);
    var day = d.days[todayKey()] || { events: {}, missions: [] };
    return chosen.map(function (m, i) {
      var cur = (day.events[m.app] && day.events[m.app][m.key]) || 0;
      return { id: 'm' + i, app: m.app, label: m.label, icon: m.icon, n: m.n, cur: Math.min(cur, m.n), done: cur >= m.n, rewarded: (day.missions || []).indexOf('m' + i) >= 0 };
    });
  }
  function checkMissions() {
    var d = data(); var ms = missions(d); var newly = [];
    ms.forEach(function (m) { if (m.done && !m.rewarded) newly.push(m); });
    if (!newly.length) return;
    mutate(function (dd) { var day = dayRec(dd); newly.forEach(function (m) { day.missions.push(m.id); dd.stars += 3; dd.totalStars += 3; day.stars += 3; }); });
    newly.forEach(function (m) { toast('🎯 미션 완료! ' + m.label + ' (+3⭐)'); });
    notify('mission', newly);
  }

  /* ---------- 스티커 ---------- */
  var STICKERS = ['🦁', '🐯', '🐼', '🐨', '🦊', '🐰', '🐻', '🐸', '🐵', '🦄', '🐬', '🐢', '🦋', '🐝', '🐙', '🦖', '🦕', '🐳', '🦩', '🦜', '🍓', '🍉', '🍩', '🍦', '🎈', '🎁', '🚀', '🛸', '🚂', '🚁', '⛵', '🏰', '🌈', '⭐', '🌙', '☀️', '🌸', '🍀', '🎸', '🥁', '⚽', '🏀', '🎯', '🧸', '🪁', '🎠', '🎡', '🎢', '🧁', '🍭'];
  var STICKER_COST = 5;

  /* ---------- 효과음 (WebAudio) ---------- */
  var actx = null;
  function ctx() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } if (actx && actx.state === 'suspended') actx.resume(); return actx; }
  function tone(freq, dur, type, when, gain) {
    var st = meta().settings;
    var c = ctx(); if (!c || st.sfx === false || st.mute) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    var t = c.currentTime + (when || 0);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain || 0.25, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  /* 소리를 꺼 두어도 맞고 틀림을 알 수 있게 폰을 짧게 울린다 */
  function buzz(pattern) {
    try { if (meta().settings.vibrate !== false && navigator.vibrate) navigator.vibrate(pattern); } catch (e) { }
  }
  var sfx = {
    click: function () { tone(600, 0.08, 'triangle'); },
    correct: function () { tone(660, 0.12, 'sine'); tone(880, 0.12, 'sine', 0.12); tone(1320, 0.2, 'sine', 0.24); buzz(40); },
    wrong: function () { tone(220, 0.25, 'sawtooth', 0, 0.12); tone(180, 0.3, 'sawtooth', 0.15, 0.12); buzz([60, 70, 60]); },
    win: function () { [523, 659, 784, 1047, 784, 1047].forEach(function (f, i) { tone(f, 0.18, 'triangle', i * 0.13); }); buzz([50, 60, 50, 60, 120]); },
    star: function () { tone(1200, 0.1, 'sine'); tone(1600, 0.15, 'sine', 0.08); },
    pop: function () { tone(400, 0.06, 'square', 0, 0.08); },
    note: function (freq, dur) { tone(freq, dur || 0.4, 'triangle', 0, 0.3); },
    drum: function () { var c = ctx(); if (!c) return; var b = c.createBuffer(1, c.sampleRate * 0.15, c.sampleRate); var d = b.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); var s = c.createBufferSource(); s.buffer = b; var g = c.createGain(); g.gain.value = 0.4; s.connect(g); g.connect(c.destination); s.start(); },
    unlock: function () { ctx(); }
  };
  document.addEventListener('pointerdown', function () { ctx(); }, { once: true });

  /* ---------- 음성 (Web Speech API) ---------- */
  var voices = [];
  function loadVoices() { try { voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; } catch (e) { voices = []; } }
  if (window.speechSynthesis) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  function speak(text, opts) {
    opts = opts || {};
    var st = meta().settings;
    if (!window.speechSynthesis || st.tts === false || st.mute) return false;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      var lang = opts.lang || 'ko-KR';
      /* 부모가 고른 말 속도를 기준으로 삼는다 (기본 0.9) */
      var base = st.rate || 0.9;
      u.lang = lang; u.rate = (opts.rate ? opts.rate / 0.9 : 1) * base; u.pitch = opts.pitch || 1.1;
      var v = voices.filter(function (v) { return v.lang && v.lang.replace('_', '-').toLowerCase().indexOf(lang.toLowerCase().slice(0, 2)) === 0; });
      if (v.length) u.voice = v[0];
      speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  }
  function speakEn(text) { return speak(text, { lang: 'en-US', rate: 0.85 }); }

  /* ---------- 숫자를 한국말로 읽기 ----------
     12345 → "만 이천삼백사십오", 3.14 → "삼 점 일사", -5 → "마이너스 오" */
  var KO_D = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  var KO_U = ['', '십', '백', '천'];
  var KO_G = ['', '만', '억', '조', '경'];
  function koGroup4(x) {
    var out = '';
    for (var i = 3; i >= 0; i--) {
      var d = Math.floor(x / Math.pow(10, i)) % 10;
      if (!d) continue;
      out += (d === 1 && i > 0 ? '' : KO_D[d]) + KO_U[i];
    }
    return out;
  }
  function koInt(n) {
    n = Math.trunc(Math.abs(n));
    if (n === 0) return '영';
    var parts = [], g = 0;
    while (n > 0 && g < KO_G.length) {
      var x = n % 10000; n = Math.floor(n / 10000);
      if (x) parts.unshift((g === 1 && x === 1 ? '' : koGroup4(x)) + KO_G[g]);
      g++;
    }
    return parts.join(' ');
  }
  /* 소수점 아래는 한 자리씩 읽는다 */
  function numToKo(v) {
    if (v === '' || v == null) return '영';
    var str = String(v);
    if (str === 'Infinity' || str === '-Infinity' || str === 'NaN') return '셀 수 없는 수';
    var neg = str.charAt(0) === '-';
    if (neg) str = str.slice(1);
    str = str.replace(/,/g, '');
    var dot = str.indexOf('.');
    var ip = dot < 0 ? str : str.slice(0, dot);
    var fp = dot < 0 ? '' : str.slice(dot + 1);
    var out = koInt(parseFloat(ip) || 0);
    if (fp) {
      out += ' 점';
      for (var i = 0; i < fp.length; i++) out += ' ' + (fp.charAt(i) === '0' ? '영' : KO_D[+fp.charAt(i)]);
    }
    return (neg ? '마이너스 ' : '') + out;
  }
  /* 받침에 따라 조사를 고른다. josa(5, '을/를') → '를' (오를) */
  function josa(word, pair) {
    var parts = String(pair).split('/');
    var w = String(word);
    if (/[0-9]$/.test(w) || /^-?[0-9.,]+$/.test(w)) w = numToKo(w);   /* 숫자면 읽는 소리로 판단 */
    var ch = w.replace(/\s+$/, '').slice(-1);
    var code = ch.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) return parts[0];
    return (code % 28) ? parts[0] : parts[1];   /* 받침 있으면 앞, 없으면 뒤 */
  }

  /* 1000000 → "1,000,000" */
  function comma(v) {
    var str = String(v); var neg = str.charAt(0) === '-'; if (neg) str = str.slice(1);
    var dot = str.indexOf('.');
    var ip = dot < 0 ? str : str.slice(0, dot);
    var fp = dot < 0 ? '' : str.slice(dot);
    return (neg ? '-' : '') + ip.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + fp;
  }

  /* ---------- UI 도우미 ---------- */
  function toast(msg, ms) {
    var t = el('div', { class: 'kl-toast', html: msg });
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 400); }, ms || 2200);
  }
  /* 5세 아이는 빨간색만으로는 틀린 줄 모른다.
     화면 가운데에 큰 ✗ 를 띄우고, 소리와 말로도 알려 준다. */
  var nopeAt = 0;
  function nope(msg, say) {
    var b = el('div', { class: 'kl-nope' }, [
      el('div', { class: 'mark', text: '✗' }),
      el('div', { class: 'txt', text: msg || '아니에요' })
    ]);
    document.body.appendChild(b);
    requestAnimationFrame(function () { b.classList.add('show'); });
    setTimeout(function () { b.classList.remove('show'); setTimeout(function () { b.remove(); }, 300); }, 850);
    sfx.wrong();
    var now = Date.now();
    if (say !== false && now - nopeAt > 1200) { nopeAt = now; speak(typeof say === 'string' ? say : '아니에요'); }
  }
  function yep(msg, say) {
    var b = el('div', { class: 'kl-nope good' }, [
      el('div', { class: 'mark', text: '○' }),
      el('div', { class: 'txt', text: msg || '맞았어요!' })
    ]);
    document.body.appendChild(b);
    requestAnimationFrame(function () { b.classList.add('show'); });
    setTimeout(function () { b.classList.remove('show'); setTimeout(function () { b.remove(); }, 300); }, 750);
    if (say) speak(typeof say === 'string' ? say : '맞았어요');
  }
  function floatStar(n) {
    var s = el('div', { class: 'kl-floatstar', text: '+' + n + ' ⭐' });
    document.body.appendChild(s);
    setTimeout(function () { s.remove(); }, 1300);
    sfx.star();
    var hs = document.querySelector('.kl-header .kl-stars');
    if (hs) { hs.textContent = '⭐ ' + data().stars; hs.classList.remove('bump'); void hs.offsetWidth; hs.classList.add('bump'); }
  }
  function confetti(n) {
    n = n || 80;
    var wrap = el('div', { class: 'kl-confetti' });
    var colors = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff924c'];
    for (var i = 0; i < n; i++) {
      var p = el('i');
      p.style.left = Math.random() * 100 + '%';
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = (Math.random() * 0.8) + 's';
      p.style.animationDuration = (1.6 + Math.random() * 1.2) + 's';
      p.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
      wrap.appendChild(p);
    }
    document.body.appendChild(wrap);
    setTimeout(function () { wrap.remove(); }, 3200);
  }
  function header(opts) {
    opts = opts || {};
    var d = data(); var p = requireProfile();
    /* 런처 창 안에서 좁은 화면이면 창 제목과 겹치므로 제목을 감춘 얇은 머리말로 */
    var embedded = false;
    try { embedded = window.parent && window.parent !== window; } catch (e) { }
    var compact = embedded && window.innerWidth <= 760;
    var h = el('div', { class: 'kl-header' + (compact ? ' compact' : '') }, [
      el('div', { class: 'kl-title', html: '<span class="kl-icon">' + (opts.icon || '') + '</span> ' + esc(opts.title || document.title) }),
      el('div', { class: 'kl-right' }, [
        el('button', { class: 'kl-mini', title: '소리 듣기', text: '🔊', onclick: function () { if (opts.say) speak(opts.say); else speak(opts.title || document.title); } }),
        el('span', { class: 'kl-stars', text: '⭐ ' + d.stars }),
        el('span', { class: 'kl-avatar', text: p.avatar })
      ])
    ]);
    document.body.insertBefore(h, document.body.firstChild);
    return h;
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') notify('close'); });
  /* 문제 글 안에 넣은 [data-say] 단추는 눌러도 답이 되지 않고 소리만 낸다.
     함수 없이 글로만 된 문제라 오답 노트에 그대로 저장할 수 있다. */
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-say]') : null;
    if (!t) return;
    e.stopPropagation(); e.preventDefault();
    sfx.click();
    speak(t.getAttribute('data-say'), { lang: t.getAttribute('data-lang') || 'ko-KR' });
  }, true);

  /* ---------- 퀴즈 엔진 ---------- */
  /* runQuiz({ el, total, mode, make(i, level)->{prompt, say, sayLang, choices:[{html,correct,say,sayLang}], cols, big}, onFinish(score,total) }) */
  /* 문제와 보기를 합쳐 같은 문제인지 가린다.
     소리나 그림 크기처럼 화면 글자만으로 구분되지 않는 문제는 앱이 q.key로 알려준다. */
  function qkey(q) {
    if (q.key) return 'k:' + q.key;
    var ch = (q.choices || []).map(function (c) { return String(c.html); }).sort().join('~');
    return String(q.prompt || '') + '|' + String(q.say || '') + '|' + ch;
  }
  /* 보기 안에 똑같은 것이 섞였는지 ('다른 것 찾기'처럼 일부러 같게 낸 문제는 제외) */
  function hasDupChoice(q) {
    if (q.allowDupChoices) return false;
    var seen = {}, ch = q.choices || [];
    for (var i = 0; i < ch.length; i++) { var h = String(ch[i].html); if (seen[h]) return true; seen[h] = 1; }
    return false;
  }
  /* 한 라운드에 낼 문제를 미리 뽑는다. 같은 문제가 또 나오면 다시 뽑고,
     낼 수 있는 문제가 라운드 길이보다 적으면 몇 번 시도한 뒤 그대로 낸다. */
  function buildRound(cfg, total, level) {
    var used = {}, out = [], prev = '';
    for (var i = 0; i < total; i++) {
      var q = cfg.make(i, level), best = null, spare = null, ok = false;
      for (var t = 0; t < 40; t++) {
        if (!hasDupChoice(q)) {
          if (!used[qkey(q)]) { ok = true; break; }
          /* 낼 수 있는 문제가 라운드보다 적을 때라도 바로 앞 문제와 겹치지는 않게 */
          if (qkey(q) !== prev) best = q; else spare = spare || q;
        }
        q = cfg.make(i, level);
      }
      if (!ok) q = best || spare || q;
      prev = qkey(q);
      used[prev] = 1;
      out.push(q);
    }
    return out;
  }

  function runQuiz(cfg) {
    var root = typeof cfg.el === 'string' ? document.querySelector(cfg.el) : cfg.el;
    var total = cfg.total || 8, idx = 0, score = 0, tries = 0, locked = false;
    var level = cfg.level || (cfg.mode ? getLevel(cfg.mode) : 1);
    var questions = buildRound(cfg, total, level);
    /* 지난번에 틀린 문제를 앞쪽 두 자리에 다시 낸다 */
    if (cfg.review !== false) {
      var again = takeWrongs(cfg.mode, Math.min(2, Math.max(0, total - 1)));
      again.forEach(function (rq, i) { rq.__wkey = rq.key; delete rq.key; questions[i] = rq; });
    }
    root.innerHTML = '';
    var dots = el('div', { class: 'kl-dots' });
    for (var i = 0; i < total; i++) dots.appendChild(el('i'));
    var stage = el('div', { class: 'kl-stage' });
    var lvTag = el('div', { class: 'kl-level', text: cfg.mode ? ('단계 ' + level) : '' });
    root.appendChild(el('div', { class: 'kl-quiztop' }, [dots, lvTag]));
    root.appendChild(stage);
    function next() {
      if (idx >= total) return finish();
      var q = questions[idx]; tries = 0; locked = false;
      stage.innerHTML = '';
      if (q.review) stage.appendChild(el('div', { class: 'kl-again', text: '🔁 지난번에 어려웠던 문제예요' }));
      var promptEl = el('div', { class: 'kl-prompt' + (q.big ? ' big' : ''), html: q.prompt });
      if (q.say) { promptEl.classList.add('speakable'); promptEl.addEventListener('click', function () { speak(q.say, { lang: q.sayLang || 'ko-KR' }); }); }
      stage.appendChild(promptEl);
      if (q.sub) stage.appendChild(el('div', { class: 'kl-sub', html: q.sub }));
      var fb = el('div', { class: 'kl-feedback' });
      stage.appendChild(fb);
      var grid = el('div', { class: 'kl-choices cols' + (q.cols || Math.min(q.choices.length, 4)) });
      q.choices.forEach(function (c) {
        var b = el('button', { class: 'kl-choice' + (c.cls ? ' ' + c.cls : ''), html: c.html });
        b.addEventListener('click', function () {
          if (locked) return;
          if (c.say) speak(c.say, { lang: c.sayLang || q.sayLang || 'ko-KR' });
          if (c.correct) {
            locked = true; sfx.correct(); b.classList.add('right');
            b.classList.add('right-mark');
            fb.className = 'kl-feedback good'; fb.textContent = tries === 0 ? '⭕ 맞았어요!' : '⭕ 이제 맞았어요!';
            if (q.__wkey) { if (tries === 0) clearWrong(cfg.mode, q.__wkey); }
            else if (tries > 0) addWrong(cfg.mode, q);
            dots.children[idx].className = tries === 0 ? 'ok' : 'ok2';
            if (tries === 0) score++;
            addStar(1); event(APP_ID, "correct");
            if (q.onCorrect) q.onCorrect();
            setTimeout(function () { idx++; next(); }, 900);
          } else {
            tries++;
            b.classList.add('wrong', 'wrong-mark');
            nope('아니에요', tries === 1 ? '아니에요. 다시 한번 골라 볼까요?' : '아니에요');
            fb.className = 'kl-feedback bad';
            fb.textContent = '❌ 아니에요. 다시 골라 보세요' + (tries >= 2 ? ' (노란 칸을 보세요)' : '');
            if (q.onWrong) q.onWrong(c);
            if (tries === 1 && !q.__wkey) addWrong(cfg.mode, q);
            /* 두 번 틀리면 정답 칸을 살짝 알려 준다 */
            if (tries >= 2) {
              var kids = grid.children;
              for (var gi = 0; gi < kids.length; gi++) {
                if (q.choices[gi] && q.choices[gi].correct) kids[gi].classList.add('hintme');
              }
            }
            setTimeout(function () { b.classList.add('dim'); b.classList.remove('wrong'); }, 500);
          }
        });
        grid.appendChild(b);
      });
      stage.appendChild(grid);
      if (q.say && cfg.autoSay !== false) setTimeout(function () { speak(q.say, { lang: q.sayLang || 'ko-KR' }); }, 250);
      if (q.after) q.after(stage);
    }
    function finish() {
      stampToast(addActivity());
      stage.innerHTML = '';
      var pct = score / total;
      var up = false;
      if (cfg.mode && pct >= 0.75 && level < (cfg.maxLevel || 5)) { setLevel(cfg.mode, level + 1); up = true; }
      var msg = pct === 1 ? '완벽해요! 🌟' : pct >= 0.75 ? '아주 잘했어요! 👏' : pct >= 0.5 ? '잘했어요! 😊' : '다시 해볼까요? 💪';
      var res = el('div', { class: 'kl-result' }, [
        el('div', { class: 'kl-result-emoji', text: pct === 1 ? '🏆' : pct >= 0.75 ? '🎉' : pct >= 0.5 ? '😄' : '🙂' }),
        el('div', { class: 'kl-result-title', text: msg }),
        el('div', { class: 'kl-result-score', html: '⭐ ' + score + ' / ' + total + (up ? '<div class="kl-levelup">🎊 단계 ' + (level + 1) + '로 올라갔어요!</div>' : '') }),
        el('div', { class: 'kl-row' }, [
          el('button', { class: 'kl-btn primary', text: '🔁 한 번 더', onclick: function () { sfx.click(); runQuiz(cfg); } }),
          el('button', { class: 'kl-btn', text: '🏠 처음으로', onclick: function () { sfx.click(); if (cfg.onFinish) cfg.onFinish(score, total); } })
        ])
      ]);
      stage.appendChild(res);
      if (pct >= 0.75) { sfx.win(); confetti(); if (up) event(APP_ID, 'levelup'); }
      speak(msg);
      event(APP_ID, 'round');
    }
    next();
  }

  /* ---------- 메뉴 도우미 ---------- */
  function menu(root, items, opts) {
    root = typeof root === 'string' ? document.querySelector(root) : root;
    root.innerHTML = '';
    var grid = el('div', { class: 'kl-menu' });
    items.forEach(function (it) {
      var lv = it.mode ? getLevel(it.mode) : 0;
      var b = el('button', { class: 'kl-menu-item', style: it.color ? 'background:' + it.color : '' }, [
        el('div', { class: 'kl-menu-icon', text: it.icon }),
        el('div', { class: 'kl-menu-label', text: it.label }),
        lv ? el('div', { class: 'kl-menu-level', text: '단계 ' + lv }) : null
      ]);
      b.addEventListener('click', function () { sfx.click(); speak(it.label); it.run(); });
      grid.appendChild(b);
    });
    root.appendChild(grid);
    return grid;
  }
  function backButton(fn) { var b = el('button', { class: 'kl-back', text: '◀ 뒤로', onclick: function () { sfx.click(); fn(); } }); return b; }

  global.KidLab = {
    meta: meta, saveMeta: saveMeta, data: data, mutate: mutate, loadData: loadData, saveData: saveData,
    currentProfile: currentProfile, requireProfile: requireProfile,
    todayKey: todayKey, dayRec: dayRec, streak: streak,
    addStar: addStar, spendStars: spendStars, event: event, progress: progress, setProgress: setProgress, getLevel: getLevel, setLevel: setLevel, markVisit: markVisit,
    missions: missions, checkMissions: checkMissions, MISSION_POOL: MISSION_POOL,
    setSetting: setSetting, muted: muted, toggleMute: toggleMute, buzz: buzz,
    addWrong: addWrong, takeWrongs: takeWrongs, clearWrong: clearWrong, wrongCount: wrongCount,
    addActivity: addActivity, stampState: stampState, addUsage: addUsage, usageToday: usageToday,
    STICKERS: STICKERS, STICKER_COST: STICKER_COST,
    sfx: sfx, speak: speak, speakEn: speakEn,
    toast: toast, nope: nope, yep: yep, confetti: confetti, header: header, runQuiz: runQuiz, buildRound: buildRound, qkey: qkey, menu: menu, backButton: backButton,
    numToKo: numToKo, comma: comma, josa: josa,
    el: el, esc: esc, randInt: randInt, pick: pick, shuffle: shuffle, sample: sample, notify: notify, APP_ID: APP_ID
  };
  if (APP_ID !== 'os') { try { markVisit(APP_ID); } catch (e) { } }
})(window);
