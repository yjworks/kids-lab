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

  function meta() { var m = loadJSON(META_KEY, null); if (!m || !m.profiles) m = { profiles: [], current: null, settings: { tts: true, sfx: true } }; if (!m.settings) m.settings = { tts: true, sfx: true }; return m; }
  function saveMeta(m) { saveJSON(META_KEY, m); }

  function defaultData() { return { stars: 0, totalStars: 0, progress: {}, days: {}, stickers: [], drawings: [], diary: {}, stories: [], created: todayKey() }; }
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

  function dayRec(d, key) { key = key || todayKey(); if (!d.days[key]) d.days[key] = { events: {}, missions: [], stars: 0, apps: {} }; return d.days[key]; }

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
    { app: 'hangul', key: 'correct', n: 5, label: '한글 놀이에서 5문제 맞히기', icon: '🇰🇷' },
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
    { app: 'shop', key: 'correct', n: 3, label: '가게 놀이에서 3번 계산하기', icon: '🛒' }
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
    var c = ctx(); if (!c || meta().settings.sfx === false) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    var t = c.currentTime + (when || 0);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain || 0.25, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  var sfx = {
    click: function () { tone(600, 0.08, 'triangle'); },
    correct: function () { tone(660, 0.12, 'sine'); tone(880, 0.12, 'sine', 0.12); tone(1320, 0.2, 'sine', 0.24); },
    wrong: function () { tone(220, 0.25, 'sawtooth', 0, 0.12); tone(180, 0.3, 'sawtooth', 0.15, 0.12); },
    win: function () { [523, 659, 784, 1047, 784, 1047].forEach(function (f, i) { tone(f, 0.18, 'triangle', i * 0.13); }); },
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
    if (!window.speechSynthesis || meta().settings.tts === false) return false;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      var lang = opts.lang || 'ko-KR';
      u.lang = lang; u.rate = opts.rate || 0.9; u.pitch = opts.pitch || 1.1;
      var v = voices.filter(function (v) { return v.lang && v.lang.replace('_', '-').toLowerCase().indexOf(lang.toLowerCase().slice(0, 2)) === 0; });
      if (v.length) u.voice = v[0];
      speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  }
  function speakEn(text) { return speak(text, { lang: 'en-US', rate: 0.85 }); }

  /* ---------- UI 도우미 ---------- */
  function toast(msg, ms) {
    var t = el('div', { class: 'kl-toast', html: msg });
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 400); }, ms || 2200);
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

  /* ---------- 퀴즈 엔진 ---------- */
  /* runQuiz({ el, total, mode, make(i, level)->{prompt, say, sayLang, choices:[{html,correct,say,sayLang}], cols, big}, onFinish(score,total) }) */
  function runQuiz(cfg) {
    var root = typeof cfg.el === 'string' ? document.querySelector(cfg.el) : cfg.el;
    var total = cfg.total || 8, idx = 0, score = 0, tries = 0, locked = false;
    var level = cfg.level || (cfg.mode ? getLevel(cfg.mode) : 1);
    root.innerHTML = '';
    var dots = el('div', { class: 'kl-dots' });
    for (var i = 0; i < total; i++) dots.appendChild(el('i'));
    var stage = el('div', { class: 'kl-stage' });
    var lvTag = el('div', { class: 'kl-level', text: cfg.mode ? ('단계 ' + level) : '' });
    root.appendChild(el('div', { class: 'kl-quiztop' }, [dots, lvTag]));
    root.appendChild(stage);
    function next() {
      if (idx >= total) return finish();
      var q = cfg.make(idx, level); tries = 0; locked = false;
      stage.innerHTML = '';
      var promptEl = el('div', { class: 'kl-prompt' + (q.big ? ' big' : ''), html: q.prompt });
      if (q.say) { promptEl.classList.add('speakable'); promptEl.addEventListener('click', function () { speak(q.say, { lang: q.sayLang || 'ko-KR' }); }); }
      stage.appendChild(promptEl);
      if (q.sub) stage.appendChild(el('div', { class: 'kl-sub', html: q.sub }));
      var grid = el('div', { class: 'kl-choices cols' + (q.cols || Math.min(q.choices.length, 4)) });
      q.choices.forEach(function (c) {
        var b = el('button', { class: 'kl-choice' + (c.cls ? ' ' + c.cls : ''), html: c.html });
        b.addEventListener('click', function () {
          if (locked) return;
          if (c.say) speak(c.say, { lang: c.sayLang || q.sayLang || 'ko-KR' });
          if (c.correct) {
            locked = true; sfx.correct(); b.classList.add('right');
            dots.children[idx].className = tries === 0 ? 'ok' : 'ok2';
            if (tries === 0) score++;
            addStar(1); event(APP_ID, "correct");
            if (q.onCorrect) q.onCorrect();
            setTimeout(function () { idx++; next(); }, 900);
          } else {
            tries++; sfx.wrong(); b.classList.add('wrong');
            if (q.onWrong) q.onWrong(c);
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
    STICKERS: STICKERS, STICKER_COST: STICKER_COST,
    sfx: sfx, speak: speak, speakEn: speakEn,
    toast: toast, confetti: confetti, header: header, runQuiz: runQuiz, menu: menu, backButton: backButton,
    el: el, esc: esc, randInt: randInt, pick: pick, shuffle: shuffle, sample: sample, notify: notify, APP_ID: APP_ID
  };
  if (APP_ID !== 'os') { try { markVisit(APP_ID); } catch (e) { } }
})(window);
