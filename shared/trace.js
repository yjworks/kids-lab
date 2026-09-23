/* 따라 쓰기 엔진 - 한글·영어·숫자 앱이 함께 쓴다 */
(function (global) {
  'use strict';
  var K, el, G;
  var main, onHome, SETS_ALL;

  var SET_DEF = {
    digits: { id: 'digits', icon: '7', label: '숫자 따라 쓰기', color: '#fff3c4' },
    cons:   { id: 'cons',   icon: 'ㄱ', label: '자음 따라 쓰기', color: '#ffe9ee' },
    vow:    { id: 'vow',    icon: 'ㅏ', label: '모음 따라 쓰기', color: '#e9f3ff' },
    syl:    { id: 'syl',    icon: '가', label: '글자 따라 쓰기', color: '#e3f7cf' },
    upper:  { id: 'upper',  icon: 'A', label: '대문자 따라 쓰기', color: '#d0f4de' },
    lower:  { id: 'lower',  icon: 'a', label: '소문자 따라 쓰기', color: '#ece6f5' },
    bat:    { id: 'bat',    icon: '강', label: '받침 글자 따라 쓰기', color: '#ffe4d6' },
    hanja:  { id: 'hanja',  icon: '山', label: '한자 따라 쓰기', color: '#fde2c8' }
  };
  var NAME = {
    'ㄱ': '기역', 'ㄴ': '니은', 'ㄷ': '디귿', 'ㄹ': '리을', 'ㅁ': '미음', 'ㅂ': '비읍', 'ㅅ': '시옷',
    'ㅇ': '이응', 'ㅈ': '지읒', 'ㅊ': '치읓', 'ㅋ': '키읔', 'ㅌ': '티읕', 'ㅍ': '피읖', 'ㅎ': '히읗',
    'ㅏ': '아', 'ㅑ': '야', 'ㅓ': '어', 'ㅕ': '여', 'ㅗ': '오', 'ㅛ': '요', 'ㅜ': '우', 'ㅠ': '유', 'ㅡ': '으', 'ㅣ': '이'
  };
  function sayOf(set, ch) {
    if (set === 'digits') return { text: K.numToKo(ch), lang: 'ko-KR' };
    if (set === 'upper' || set === 'lower') return { text: ch, lang: 'en-US' };
    if (set === 'hanja') return { text: (G.hanjaSay && G.hanjaSay[ch]) || ch, lang: 'ko-KR' };
    return { text: NAME[ch] || ch, lang: 'ko-KR' };
  }
  /* 어느 앱에서 열든 따라 쓰기 진도는 한곳에 모아 둔다 */
  function doneList(set) {
    var d = K.data();
    var pr = d.progress.trace || {};
    return (pr.done && pr.done[set]) || [];
  }
  function markDone(set, ch) {
    K.mutate(function (d) {
      var pr = d.progress.trace || (d.progress.trace = {});
      var done = pr.done || (pr.done = {});
      var arr = done[set] || (done[set] = []);
      if (arr.indexOf(ch) < 0) arr.push(ch);
    });
  }

  function home() {
    document.body.classList.remove('fixed');
    if (SETS_ALL.length === 1) { picker(SET_DEF[SETS_ALL[0]], true); return; }
    main.innerHTML = '';
    main.appendChild(K.backButton(onHome));
    var items = SETS_ALL.map(function (id) {
      var s = SET_DEF[id], done = doneList(id).length, all = G.order[id].length;
      return { icon: s.icon, label: s.label + ' (' + done + '/' + all + ')', color: s.color, run: function () { picker(s); } };
    });
    K.menu(main, items);
    main.appendChild(el('div', { class: 'kl-hint', text: '회색 글자를 따라 그리면 얼마나 잘 썼는지 알려줘요' }));
  }

  function picker(set, top) {
    document.body.classList.remove('fixed');
    main.innerHTML = ''; main.appendChild(K.backButton(top ? onHome : home));
    main.appendChild(el('div', { class: 'kl-prompt', text: set.label, style: 'font-size:24px;margin-bottom:10px' }));
    var done = doneList(set.id);
    var grid = el('div', { class: 'pick' });
    G.order[set.id].forEach(function (ch, i) {
      var b = el('button', { class: done.indexOf(ch) >= 0 ? 'done' : '' }, [
        el('div', { class: 'ch', text: ch }),
        done.indexOf(ch) >= 0 ? el('span', { class: 'ok', text: '✔' }) : null
      ]);
      b.addEventListener('click', function () { K.sfx.click(); trace(set, i); });
      grid.appendChild(b);
    });
    main.appendChild(grid);
  }

  /* ---------- 따라 쓰기 화면 ---------- */
  function trace(set, idx) {
    document.body.classList.add('fixed');
    main.innerHTML = '';
    var list = G.order[set.id];
    var ch = list[idx];
    var strokes = G[set.id][ch];
    var back = K.backButton(function () { picker(set, SETS_ALL.length === 1); });
    main.appendChild(back);

    var pad = el('div', { class: 'pad' });
    var title = el('div', { class: 'cur' });
    var sheet = el('div', { class: 'sheet' });
    var guide = el('canvas', { class: 'guide' });       /* 회색 본보기 + 획 번호 */
    var ink = el('canvas', { class: 'ink' });           /* 아이가 그리는 층 */
    sheet.appendChild(guide); sheet.appendChild(ink);
    var meter = el('div', { class: 'meter' }, el('i'));
    var verdict = el('div', { class: 'verdict', text: '회색 글자를 따라 그려요' });
    var bar = el('div', { class: 'bar' });
    pad.appendChild(title); pad.appendChild(sheet); pad.appendChild(meter); pad.appendChild(verdict); pad.appendChild(bar);
    main.appendChild(pad);

    /* 화면에 맞는 크기 정하기.
       어림잡지 않고, 쓰기판을 잠시 접어 나머지가 실제로 차지하는 높이를 재서 정한다. */
    var size = 320;
    function setSize(v) {
      size = v;
      sheet.style.width = v + 'px'; sheet.style.height = v + 'px';
      [guide, ink].forEach(function (c) { c.width = v; c.height = v; c.style.width = v + 'px'; c.style.height = v + 'px'; });
    }
    /* 가장 큰 정사각형에서 시작해, 화면에 다 들어올 때까지 줄인다.
       글자마다 버튼 줄 수가 달라질 수 있으니 어림잡지 않고 실제로 재서 맞춘다. */
    function layout() {
      var maxW = Math.min(window.innerWidth - 20, 460);
      setSize(maxW);
      /* main이 넘침을 감추므로 scrollHeight로는 알 수 없다.
         맨 아래 버튼 줄이 화면 안에 들어왔는지로 판단한다. */
      var guard = 0;
      var tooBig = function () {
        return bar.getBoundingClientRect().bottom > window.innerHeight - 4 ||
               sheet.getBoundingClientRect().bottom > window.innerHeight - 4;
      };
      while (tooBig() && size > 110 && guard++ < 90) setSize(size - 6);
      drawGuide(); redrawInk();
    }
    var S = function (v) { return v / 100 * size; };
    var gc = guide.getContext('2d'), ic = ink.getContext('2d');
    var GUIDE_W = 0.15, INK_W = 0.11;   /* 글자 크기 대비 선 굵기 */

    function pathStroke(ctx, st) {
      ctx.beginPath();
      ctx.moveTo(S(st[0][0]), S(st[0][1]));
      for (var i = 1; i < st.length; i++) ctx.lineTo(S(st[i][0]), S(st[i][1]));
    }
    function drawGuide() {
      gc.clearRect(0, 0, size, size);
      gc.fillStyle = '#fff'; gc.fillRect(0, 0, size, size);
      /* 안내선 */
      gc.strokeStyle = '#f0f0f0'; gc.lineWidth = 2;
      gc.beginPath(); gc.moveTo(size / 2, 0); gc.lineTo(size / 2, size); gc.moveTo(0, size / 2); gc.lineTo(size, size / 2); gc.stroke();
      /* 회색 본보기 */
      gc.strokeStyle = '#e2e2e2'; gc.lineWidth = size * GUIDE_W; gc.lineCap = 'round'; gc.lineJoin = 'round';
      strokes.forEach(function (st) { pathStroke(gc, st); gc.stroke(); });
      /* 획 번호와 시작점 */
      strokes.forEach(function (st, i) {
        var x = S(st[0][0]), y = S(st[0][1]);
        gc.fillStyle = '#ff595e'; gc.beginPath(); gc.arc(x, y, size * 0.045, 0, Math.PI * 2); gc.fill();
        gc.fillStyle = '#fff'; gc.font = '900 ' + Math.round(size * 0.055) + 'px sans-serif';
        gc.textAlign = 'center'; gc.textBaseline = 'middle'; gc.fillText(String(i + 1), x, y + 1);
      });
    }

    /* 그린 선 보관 (크기가 바뀌어도 다시 그린다) */
    var drawn = [], cur = null, drawing = false;
    function redrawInk() {
      ic.clearRect(0, 0, size, size);
      ic.strokeStyle = '#1982c4'; ic.lineWidth = size * INK_W; ic.lineCap = 'round'; ic.lineJoin = 'round';
      drawn.forEach(function (st) {
        if (st.length < 2) { ic.beginPath(); ic.arc(st[0][0] * size, st[0][1] * size, size * INK_W / 2, 0, Math.PI * 2); ic.fillStyle = '#1982c4'; ic.fill(); return; }
        ic.beginPath(); ic.moveTo(st[0][0] * size, st[0][1] * size);
        for (var i = 1; i < st.length; i++) ic.lineTo(st[i][0] * size, st[i][1] * size);
        ic.stroke();
      });
    }
    function pos(e) {
      var r = ink.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
    }
    ink.addEventListener('pointerdown', function (e) {
      stopDemo(true);                 /* 시범 보이는 중이면 멈추고 아이 그림을 살린다 */
      drawing = true; cur = [pos(e)]; drawn.push(cur); ink.setPointerCapture(e.pointerId);
      redrawInk(); verdict.textContent = '';
    });
    ink.addEventListener('pointermove', function (e) { if (!drawing) return; cur.push(pos(e)); redrawInk(); });
    ink.addEventListener('pointerup', function () { drawing = false; });
    ink.addEventListener('pointercancel', function () { drawing = false; });

    /* ---------- 채점 ----------
       글자 선을 일정 간격 점으로 바꾼 뒤,
       (1) 아이가 그린 점이 선 가까이 있는지 (밖으로 안 나갔는지)
       (2) 선 위의 점이 모두 지나갔는지 (획을 빠뜨리지 않았는지)
       (3) 그린 길이가 지나치게 길지 않은지 (덧칠·낙서 거르기) 를 본다 */
    /* 회색 본보기의 굵기는 100칸 기준 15칸이다. 그 띠 안에 들어가면 인정한다.
       덮었는지 볼 때는 아이가 그은 굵은 선의 두께까지 감안해 조금 더 넉넉하게 본다. */
    var TOL_ON = 9;       /* 밖으로 나갔는지 보는 거리 */
    var TOL_COVER = 11;   /* 선을 지나갔는지 보는 거리 */
    function resample(st, step) {
      var out = [[st[0][0], st[0][1]]], cx = st[0][0], cy = st[0][1];
      for (var i = 1; i < st.length; i++) {
        var x = st[i][0], y = st[i][1], d = Math.hypot(x - cx, y - cy);
        while (d >= step) { var t = step / d; cx += (x - cx) * t; cy += (y - cy) * t; out.push([cx, cy]); d = Math.hypot(x - cx, y - cy); }
        cx = x; cy = y;
      }
      out.push([cx, cy]);
      return out;
    }
    function pathLen(ss) {
      var L = 0;
      ss.forEach(function (st) { for (var i = 1; i < st.length; i++) L += Math.hypot(st[i][0] - st[i - 1][0], st[i][1] - st[i - 1][1]); });
      return L;
    }
    function near(pt, pts, tol) {
      var t2 = tol * tol;
      for (var i = 0; i < pts.length; i++) { var dx = pt[0] - pts[i][0], dy = pt[1] - pts[i][1]; if (dx * dx + dy * dy <= t2) return true; }
      return false;
    }
    var missed = [];      /* 못 지나간 부분 (틀린 곳 보여주기) */
    function score() {
      if (!drawn.length) return null;
      var user = drawn.map(function (st) { return st.map(function (p) { return [p[0] * 100, p[1] * 100]; }); });
      var uAll = [];
      user.forEach(function (st) { uAll = uAll.concat(resample(st, 2)); });
      if (uAll.length < 2) return null;
      var tS = strokes.map(function (st) { return resample(st, 2); });
      var tAll = [];
      tS.forEach(function (st) { tAll = tAll.concat(st); });

      var on = 0;
      uAll.forEach(function (pt) { if (near(pt, tAll, TOL_ON)) on++; });

      var covered = 0, total = 0, minStroke = 1;
      missed = [];
      tS.forEach(function (st) {
        var c = 0;
        st.forEach(function (pt) { if (near(pt, uAll, TOL_COVER)) c++; else missed.push(pt); });
        covered += c; total += st.length;
        minStroke = Math.min(minStroke, c / st.length);
      });
      /* 획을 순서대로 썼는지 (어기면 못 쓴 것은 아니고, 최고 등급만 안 준다) */
      var uS = user.map(function (st) { return resample(st, 2); });
      var seq = [], inOrder = true;
      tS.forEach(function (st) {
        var best = -1, bestC = 0;
        uS.forEach(function (us, ui) {
          var c = 0;
          st.forEach(function (pt) { if (near(pt, us, TOL_COVER)) c++; });
          c = c / st.length;
          if (c > bestC) { bestC = c; best = ui; }
        });
        seq.push(bestC >= 0.6 ? best : -1);
      });
      for (var i = 1; i < seq.length; i++) {
        if (seq[i] < 0 || seq[i - 1] < 0) continue;
        if (seq[i] < seq[i - 1]) inOrder = false;
      }
      return {
        on: on / uAll.length,
        covered: covered / total,
        minStroke: minStroke,
        inOrder: inOrder,
        ratio: pathLen(user) / Math.max(1, pathLen(strokes))
      };
    }
    /* 못 지나간 곳을 잠깐 표시해 준다 */
    function showMissed() {
      if (!missed.length) return;
      ic.fillStyle = 'rgba(255,89,94,.85)';
      missed.forEach(function (pt) { ic.beginPath(); ic.arc(S(pt[0]), S(pt[1]), size * 0.018, 0, Math.PI * 2); ic.fill(); });
      setTimeout(redrawInk, 2200);
    }
    function check() {
      var s = score();
      if (!s) { verdict.textContent = '먼저 글자를 따라 그려 보세요 ✏️'; K.sfx.wrong(); return; }
      var pct = Math.round(Math.max(0, Math.min(100,
        (s.covered * 0.6 + s.on * 0.4) * 100 - Math.max(0, s.ratio - 2) * 10)));
      meter.querySelector('i').style.width = pct + '%';
      var say = sayOf(set.id, ch);
      var ok = s.minStroke >= 0.65 && s.covered >= 0.8 && s.on >= 0.7 && s.ratio <= 3.2;
      var great = s.minStroke >= 0.85 && s.covered >= 0.93 && s.on >= 0.85 && s.ratio <= 2.2 && s.inOrder;
      if (great) {
        verdict.textContent = '🌟 아주 잘 썼어요! (' + pct + '점)';
        K.addStar(2); K.event('trace'); K.sfx.win(); K.confetti(); markDone(set.id, ch);
        K.speak(say.text + '. 아주 잘 썼어요', { lang: say.lang });
        setTimeout(nextChar, 1600);
      } else if (ok) {
        verdict.textContent = s.inOrder ? '👍 잘했어요! (' + pct + '점)' : '👍 잘했어요! 다음엔 번호 순서대로 써 봐요 (' + pct + '점)';
        K.addStar(1); K.event('trace'); K.sfx.correct(); markDone(set.id, ch);
        K.speak(say.text + '. 잘했어요', { lang: say.lang });
        setTimeout(nextChar, 1600);
      } else if (s.minStroke < 0.65 && s.on >= 0.6 && s.covered >= 0.55) {
        verdict.textContent = '조금 옆으로 치우쳤어요. 빨간 점을 지나가 봐요 (' + pct + '점)';
        K.sfx.wrong(); K.speak('조금 옆으로 치우쳤어요. 빨간 점을 지나가 봐요'); showMissed();
      } else if (s.minStroke < 0.65) {
        verdict.textContent = '빨간 점을 지나가야 해요. 번호 순서대로! (' + pct + '점)';
        K.sfx.wrong(); K.speak('빠뜨린 곳이 있어요. 빨간 점을 지나가 봐요'); showMissed();
      } else if (s.ratio > 3.2) {
        verdict.textContent = '너무 많이 그렸어요. 회색 글자만 따라 그려요 (' + pct + '점)';
        K.sfx.wrong(); K.speak('너무 많이 그렸어요. 회색 글자만 따라 그려요');
      } else if (s.on < 0.7) {
        verdict.textContent = '회색 글자 안쪽으로 그려 봐요 (' + pct + '점)';
        K.sfx.wrong(); K.speak('회색 글자 안쪽으로 그려 봐요');
      } else {
        verdict.textContent = '끝까지 다 그려 볼까요? (' + pct + '점)';
        K.sfx.wrong(); K.speak('끝까지 다 그려 볼까요?'); showMissed();
      }
    }
    function nextChar() { stopDemo(true); if (idx + 1 < list.length) trace(set, idx + 1); else picker(set, SETS_ALL.length === 1); }

    /* ---------- 시범 보이기 ---------- */
    var playing = false, demoTimer = null, demoNext = null;
    function stopDemo(silent) {
      if (demoTimer) { clearInterval(demoTimer); demoTimer = null; }
      if (demoNext) { clearTimeout(demoNext); demoNext = null; }
      if (playing) { playing = false; if (!silent) verdict.textContent = '이제 따라 그려 봐요 ✏️'; redrawInk(); }
    }
    function demo() {
      if (playing) return; playing = true;
      drawn = []; redrawInk();
      var si = 0;
      function one() {
        if (!playing) return;
        if (si >= strokes.length) { playing = false; verdict.textContent = '이제 따라 그려 봐요 ✏️'; return; }
        var st = strokes[si], i = 1;
        ic.strokeStyle = '#ffb703'; ic.lineWidth = size * INK_W; ic.lineCap = 'round'; ic.lineJoin = 'round';
        ic.beginPath(); ic.moveTo(S(st[0][0]), S(st[0][1]));
        demoTimer = setInterval(function () {
          if (!playing) { clearInterval(demoTimer); demoTimer = null; return; }
          if (i >= st.length) { clearInterval(demoTimer); demoTimer = null; si++; demoNext = setTimeout(one, 280); return; }
          ic.lineTo(S(st[i][0]), S(st[i][1])); ic.stroke();
          ic.beginPath(); ic.moveTo(S(st[i][0]), S(st[i][1]));
          K.sfx.note(520 + i * 12, 0.05);
          i++;
        }, Math.max(24, 420 / st.length));
      }
      verdict.textContent = '획 순서를 잘 봐요 👀';
      one();
    }

    title.textContent = ch + ' · ' + sayOf(set.id, ch).text + '  (' + (idx + 1) + '/' + list.length + ')';
    bar.appendChild(el('button', { class: 'kl-btn', text: '◀', title: '앞 글자', onclick: function () { if (idx > 0) trace(set, idx - 1); } }));
    bar.appendChild(el('button', { class: 'speak-btn', text: '🔊 듣기', onclick: function () { var s = sayOf(set.id, ch); K.speak(s.text, { lang: s.lang }); } }));
    bar.appendChild(el('button', { class: 'kl-btn blue', text: '👀 보여줘', onclick: function () { K.sfx.click(); demo(); } }));
    bar.appendChild(el('button', { class: 'kl-btn', text: '🧽 지우기', onclick: function () { stopDemo(true); drawn = []; redrawInk(); meter.querySelector('i').style.width = '0'; verdict.textContent = '다시 그려 봐요'; K.sfx.pop(); } }));
    bar.appendChild(el('button', { class: 'kl-btn green', text: '✔ 다 썼어요', onclick: check }));
    bar.appendChild(el('button', { class: 'kl-btn', text: '▶', title: '다음 글자', onclick: nextChar }));

    layout();
    window.addEventListener('resize', layout);
    var s0 = sayOf(set.id, ch); K.speak(s0.text, { lang: s0.lang });
    setTimeout(function () { if (document.body.contains(sheet)) demo(); }, 700);
  }

  /* 공용 API: KidTrace.start(main, ['cons','vow','syl'], 돌아갈곳) */
  global.KidTrace = {
    start: function (mainEl, setIds, backFn) {
      K = window.KidLab; el = K.el; G = window.GLYPHS;
      main = mainEl; SETS_ALL = setIds; onHome = backFn;
      home();
    },
    setLabel: function (id) { return SET_DEF[id] ? SET_DEF[id].label : id; },
    count: function (id) { return { done: doneList(id).length, all: window.GLYPHS.order[id].length }; }
  };
})(window);
