/* 필사(따라 쓰기) 엔진 - 글꼴 글자를 흐리게 깔고 위에 따라 쓴다.
   획 데이터가 없어도 어떤 글자든(천자문, 논어 구절, 우리말 문장) 쓸 수 있다.
   쓰는 것이 목적이라 판정은 넉넉하다: 글자 모양을 절반쯤 덮고, 너무 밖으로 나가지 않으면 통과.
   필순은 보지 않는다 (필순 채점은 한자 놀이의 31자만). */
(function (global) {
  'use strict';
  var K = global.KidLab, el = K.el;
  var FONT = '"Noto Serif KR", "Nanum Myeongjo", "Batang", "바탕", "AppleMyungjo", "Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", serif';
  var GRID = 48;          /* 판정용 칸 수 */
  var CSS = '' +
    '.cp { display: flex; flex-direction: column; gap: 8px; flex: 1 1 0; min-height: 0; }' +
    '.cp-top { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }' +
    '.cp-title { flex: 1; min-width: 0; font-weight: 900; font-size: 19px; }' +
    '.cp-title small { display: block; font-size: 15px; color: #5e5e5e; font-weight: 800; }' +
    '.cp-chips { display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; flex: 0 0 auto; }' +
    '.cp-chips span { min-width: 30px; height: 34px; padding: 0 4px; border-radius: 8px; background: #fff; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: #888; box-shadow: 0 2px 0 rgba(0,0,0,.06); }' +
    '.cp-chips span.done { background: #d8f5c0; color: #2f7d32; }' +
    '.cp-chips span.cur { background: #ffca3a; color: #3d2a00; }' +
    '.cp-chips span.sp { background: none; box-shadow: none; min-width: 10px; }' +
    '.cp-pad { flex: 1 1 0; min-height: 0; display: flex; align-items: center; justify-content: center; }' +
    '.cp-sheet { position: relative; background: #fff; border-radius: 18px; box-shadow: 0 6px 0 rgba(0,0,0,.08); touch-action: none; overflow: hidden; }' +
    '.cp-sheet canvas { position: absolute; left: 0; top: 0; touch-action: none; }' +
    '.cp-msg { text-align: center; font-weight: 800; font-size: 19px; min-height: 26px; flex: 0 0 auto; }' +
    '.cp-bar { display: flex; gap: 8px; justify-content: center; flex: 0 0 auto; }' +
    '.cp-bar button { flex: 1; max-width: 170px; min-height: 56px; border-radius: 16px; font-size: 18px; font-weight: 900; background: #fff; box-shadow: 0 4px 0 rgba(0,0,0,.1); }' +
    '.cp-bar .ok { background: #8ac926; color: #fff; }' +
    '@media (max-width: 760px) { .cp-title { font-size: 16px; } .cp-chips span { min-width: 24px; height: 28px; font-size: 16px; } .cp-bar button { font-size: 15px; min-height: 50px; } .cp-msg { font-size: 16px; } }' +
    '@media (max-height: 500px) { .cp-chips { display: none; } }';
  var styled = false;
  function addStyle() { if (!styled) { styled = true; document.head.appendChild(el('style', { text: CSS })); } }

  /* 글자 모양을 칸(GRID×GRID)으로 뜬다 */
  function glyphMask(ch) {
    var c = document.createElement('canvas'); c.width = c.height = GRID;
    var x = c.getContext('2d');
    x.fillStyle = '#000'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = Math.round(GRID * 0.8) + 'px ' + FONT;
    x.fillText(ch, GRID / 2, GRID / 2 + GRID * 0.04);
    var d = x.getImageData(0, 0, GRID, GRID).data, m = new Uint8Array(GRID * GRID), n = 0;
    for (var i = 0; i < GRID * GRID; i++) if (d[i * 4 + 3] > 90) { m[i] = 1; n++; }
    return { m: m, n: n };
  }
  function dilate(m, r) {
    var out = new Uint8Array(m.length);
    for (var y = 0; y < GRID; y++) for (var x = 0; x < GRID; x++) {
      if (!m[y * GRID + x]) continue;
      for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
        var yy = y + dy, xx = x + dx;
        if (yy >= 0 && yy < GRID && xx >= 0 && xx < GRID && dx * dx + dy * dy <= r * r) out[yy * GRID + xx] = 1;
      }
    }
    return out;
  }
  function inkMask(strokes) {
    var c = document.createElement('canvas'); c.width = c.height = GRID;
    var x = c.getContext('2d');
    x.strokeStyle = '#000'; x.lineWidth = GRID * 0.07; x.lineCap = 'round'; x.lineJoin = 'round';
    strokes.forEach(function (st) {
      x.beginPath(); x.moveTo(st[0][0] * GRID, st[0][1] * GRID);
      for (var i = 1; i < st.length; i++) x.lineTo(st[i][0] * GRID, st[i][1] * GRID);
      if (st.length === 1) x.lineTo(st[0][0] * GRID + 0.1, st[0][1] * GRID);
      x.stroke();
    });
    var d = x.getImageData(0, 0, GRID, GRID).data, m = new Uint8Array(GRID * GRID), n = 0;
    for (var i = 0; i < GRID * GRID; i++) if (d[i * 4 + 3] > 60) { m[i] = 1; n++; }
    return { m: m, n: n };
  }
  /* 판정: 글자 칸 중 잉크 근처에 있는 비율(덮기), 잉크 중 글자 밖으로 나간 비율(밖) */
  function judge(ch, strokes) {
    var g = glyphMask(ch);
    if (!g.n) return { ok: true, cover: 1, out: 0 };           /* 글꼴에 없는 글자는 쓰기만 하면 통과 */
    var ink = inkMask(strokes);
    if (ink.n < g.n * 0.15) return { ok: false, cover: 0, out: 0, few: true };
    var inkNear = dilate(ink.m, 2), gNear = dilate(g.m, 3);
    var cov = 0, out = 0;
    for (var i = 0; i < g.m.length; i++) { if (g.m[i] && inkNear[i]) cov++; if (ink.m[i] && !gNear[i]) out++; }
    var cover = cov / g.n, outR = out / ink.n, much = ink.n / g.n;
    /* 칸을 통째로 칠하면 잉크가 글자보다 훨씬 많아진다 */
    return { ok: cover >= 0.5 && outR <= 0.38 && much <= 2.6, cover: cover, out: outR, much: much };
  }

  /* open({ text, title, sub, say, lang, onDone, back }) */
  function open(o) {
    addStyle();
    var main = o.main, text = o.text;
    var chars = text.split('');
    var idx = 0, strokes = [], cur = null, size = 300;
    while (idx < chars.length && !/[가-힣一-鿿A-Za-z0-9]/.test(chars[idx])) idx++;
    document.body.classList.add('fixed');
    main.innerHTML = '';
    var wrap = el('div', { class: 'cp' });
    wrap.appendChild(el('div', { class: 'cp-top' }, [
      K.backButton(function () { document.body.classList.remove('fixed'); o.back(); }),
      el('div', { class: 'cp-title', html: K.esc(o.title || '따라 쓰기') + (o.sub ? '<small>' + K.esc(o.sub) + '</small>' : '') }),
      el('button', { class: 'kl-mini', text: '🔊', title: '듣기', onclick: function () { K.speak(o.say || text, { lang: o.lang || 'ko-KR' }); } })
    ]));
    var chips = el('div', { class: 'cp-chips' });
    var chipEls = chars.map(function (c) { var s = el('span', { class: /\s/.test(c) ? 'sp' : '', text: /\s/.test(c) ? '' : c }); chips.appendChild(s); return s; });
    wrap.appendChild(chips);
    var pad = el('div', { class: 'cp-pad' });
    var sheet = el('div', { class: 'cp-sheet' });
    var bg = el('canvas'), ink = el('canvas');
    sheet.appendChild(bg); sheet.appendChild(ink); pad.appendChild(sheet);
    wrap.appendChild(pad);
    var msg = el('div', { class: 'cp-msg', text: '회색 글자 위에 따라 써요 ✏️' });
    wrap.appendChild(msg);
    var bar = el('div', { class: 'cp-bar' }, [
      el('button', { text: '🧽 지우기', onclick: function () { strokes = []; drawInk(); K.sfx.click(); } }),
      el('button', { text: '⏭ 건너뛰기', onclick: function () { K.sfx.click(); next(false); } }),
      el('button', { class: 'ok', text: '✔ 다 썼어요', onclick: check })
    ]);
    wrap.appendChild(bar);
    main.appendChild(wrap);
    var bx = bg.getContext('2d'), ix = ink.getContext('2d');

    function layout() {
      var r = pad.getBoundingClientRect();
      size = Math.max(160, Math.floor(Math.min(r.width - 8, r.height - 8, 520)));
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      [bg, ink].forEach(function (c) { c.width = size * dpr; c.height = size * dpr; c.style.width = size + 'px'; c.style.height = size + 'px'; c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0); });
      sheet.style.width = size + 'px'; sheet.style.height = size + 'px';
      drawBg(); drawInk();
    }
    function drawBg() {
      var ch = chars[idx] || '';
      bx.clearRect(0, 0, size, size);
      /* 원고지처럼 가운데 십자 점선 */
      bx.strokeStyle = '#f0c9d4'; bx.lineWidth = 1.5; bx.setLineDash([6, 6]);
      bx.beginPath(); bx.moveTo(size / 2, 8); bx.lineTo(size / 2, size - 8); bx.moveTo(8, size / 2); bx.lineTo(size - 8, size / 2); bx.stroke();
      bx.setLineDash([]); bx.strokeStyle = '#e8a2b6'; bx.lineWidth = 3; bx.strokeRect(6, 6, size - 12, size - 12);
      bx.fillStyle = '#d6d6d6'; bx.textAlign = 'center'; bx.textBaseline = 'middle';
      bx.font = Math.round(size * 0.8) + 'px ' + FONT;
      bx.fillText(ch, size / 2, size / 2 + size * 0.04);
      chipEls.forEach(function (s, k) { s.classList.toggle('cur', k === idx); });
    }
    function drawInk() {
      ix.clearRect(0, 0, size, size);
      ix.strokeStyle = '#1f3a93'; ix.lineWidth = size * 0.045; ix.lineCap = 'round'; ix.lineJoin = 'round';
      strokes.forEach(function (st) {
        ix.beginPath(); ix.moveTo(st[0][0] * size, st[0][1] * size);
        for (var i = 1; i < st.length; i++) ix.lineTo(st[i][0] * size, st[i][1] * size);
        if (st.length === 1) ix.lineTo(st[0][0] * size + 0.5, st[0][1] * size);
        ix.stroke();
      });
    }
    function pt(e) { var r = ink.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; }
    ink.addEventListener('pointerdown', function (e) { e.preventDefault(); ink.setPointerCapture(e.pointerId); cur = [pt(e)]; strokes.push(cur); drawInk(); });
    ink.addEventListener('pointermove', function (e) { if (!cur) return; cur.push(pt(e)); drawInk(); });
    ['pointerup', 'pointercancel'].forEach(function (ev) { ink.addEventListener(ev, function () { cur = null; }); });

    var passed = 0;
    function check() {
      if (!strokes.length) { msg.textContent = '먼저 글자를 따라 써 보세요 ✏️'; K.sfx.wrong(); return; }
      var r = judge(chars[idx], strokes);
      if (r.ok) {
        passed++; chipEls[idx].classList.add('done');
        msg.textContent = r.cover >= 0.75 && r.out <= 0.25 ? '🌟 아주 잘 썼어요!' : '👍 잘 썼어요!';
        K.sfx.correct(); K.event('copy');
        setTimeout(function () { next(true); }, 700);
      } else if (r.few) {
        msg.textContent = '조금 더 써 볼까요? 회색 글자를 끝까지 따라가요'; K.sfx.wrong();
      } else if (r.out > 0.38 || r.much > 2.6) {
        msg.textContent = '회색 글자 안쪽으로 써 봐요'; K.sfx.wrong();
      } else {
        msg.textContent = '비어 있는 곳까지 조금만 더 써요'; K.sfx.wrong();
      }
    }
    function next() {
      strokes = [];
      idx++;
      while (idx < chars.length && !/[가-힣一-鿿A-Za-z0-9]/.test(chars[idx])) idx++;
      if (idx >= chars.length) return finish();
      drawBg(); drawInk();
      msg.textContent = '다음 글자예요 ✏️';
    }
    function finish() {
      document.body.classList.remove('fixed');
      if (passed) { K.addStar(2); K.event('win'); }
      K.sfx.win(); K.confetti();
      main.innerHTML = ''; main.appendChild(K.backButton(o.back));
      main.appendChild(el('div', { class: 'kl-result' }, [
        el('div', { class: 'kl-result-emoji', text: '✍️' }),
        el('div', { class: 'kl-result-title', text: '다 썼어요!' }),
        el('div', { class: 'kl-result-score', html: '<div style="font-size:30px;margin:8px 0;font-family:' + FONT.replace(/"/g, "'") + '">' + K.esc(text) + '</div>' + (o.sub ? K.esc(o.sub) : '') }),
        el('div', { class: 'kl-row' }, [
          el('button', { class: 'kl-btn primary', text: '🔁 다시 쓰기', onclick: function () { open(o); } }),
          el('button', { class: 'kl-btn', text: '◀ 돌아가기', onclick: o.back })
        ])
      ]));
      if (o.onDone) o.onDone(passed);
    }
    requestAnimationFrame(layout);
    var onResize = function () { if (document.body.contains(sheet)) layout(); else window.removeEventListener('resize', onResize); };
    window.addEventListener('resize', onResize);
  }

  global.KidCopy = { open: open, judge: judge };
})(window);
