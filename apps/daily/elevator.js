/* 엘리베이터 타기 - 생활 습관 앱의 한 메뉴
   부르기(▲▼) → 타기 → 층 버튼 → 닫힘 → 올라가고 내려가기 → 내리기.
   단계가 오르면 층이 늘고, 지하층·안전 상황(문 끼임, 멈춤, 불)이 나온다. */
(function (global) {
  'use strict';
  var K = global.KidLab, el = K.el;

  var DEST = [
    ['🏠', '우리 집'], ['👵', '할머니 댁'], ['🦷', '치과'], ['🏥', '소아과'], ['📚', '도서관'],
    ['🏊', '수영장'], ['🎨', '미술 학원'], ['🐶', '친구네 집'], ['🎹', '피아노 학원'], ['🧸', '장난감 가게']
  ];
  var CSS = '' +
    '.ev { display: flex; flex-direction: column; gap: 8px; flex: 1 1 0; min-height: 0; }' +
    '.ev-top { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }' +
    '.ev-mission { flex: 1; background: #fff3c4; border-radius: 18px; padding: 8px 12px; font-weight: 900; font-size: 20px; text-align: center; }' +
    '.ev-body { flex: 1 1 0; min-height: 0; display: flex; gap: 12px; }' +
    '.ev-shaft { width: 96px; flex: 0 0 auto; position: relative; background: #e9edf3; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column-reverse; }' +
    '.ev-floor { flex: 1 1 0; border-top: 2px solid #d5dbe4; display: flex; align-items: center; padding-left: 6px; font-size: 13px; font-weight: 900; color: #6b6b6b; }' +
    '.ev-floor.target { background: #fff3c4; color: #7a5300; }' +
    '.ev-car { position: absolute; left: 34px; right: 6px; background: #8fa3bf; border-radius: 8px; display: flex; align-items: center; justify-content: center;' +
    '  transition: bottom .65s ease-in-out; box-shadow: inset 0 0 0 3px #5b6f8c; overflow: hidden; }' +
    '.ev-car .door { position: absolute; top: 0; bottom: 0; width: 50%; background: #c7d2e0; transition: transform .45s; }' +
    '.ev-car .door.l { left: 0; border-right: 1px solid #8fa3bf; } .ev-car .door.r { right: 0; border-left: 1px solid #8fa3bf; }' +
    '.ev-car.open .door.l { transform: translateX(-100%); } .ev-car.open .door.r { transform: translateX(100%); }' +
    '.ev-car .kid { font-size: 22px; }' +
    '.ev-side { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 10px; overflow: auto; }' +
    '.ev-led { background: #1f2430; color: #ff9d3a; font-family: monospace; font-weight: 900; font-size: 44px; text-align: center; border-radius: 14px; padding: 4px 0; letter-spacing: 4px; flex: 0 0 auto; }' +
    '.ev-led small { font-size: 18px; color: #ffcf99; letter-spacing: 0; margin-left: 6px; }' +
    '.ev-msg { text-align: center; font-weight: 800; font-size: 20px; min-height: 28px; }' +
    '.ev-call { display: flex; gap: 14px; justify-content: center; }' +
    '.ev-call button { width: 96px; height: 96px; border-radius: 50%; font-size: 44px; background: #fff; box-shadow: 0 5px 0 rgba(0,0,0,.12); }' +
    '.ev-call button.lit { background: #ffe08a; box-shadow: 0 0 0 5px #ffca3a; }' +
    '.ev-panel { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }' +
    '.ev-panel button { min-height: 54px; border-radius: 50%; aspect-ratio: 1; max-height: 74px; margin: 0 auto; width: 100%; max-width: 74px;' +
    '  background: #f3f5f8; box-shadow: inset 0 -3px 0 rgba(0,0,0,.15); font-size: 22px; font-weight: 900; color: #333; }' +
    '.ev-panel button.lit { background: #ffe08a; box-shadow: 0 0 0 4px #ffca3a; }' +
    '.ev-ctl { display: flex; gap: 8px; justify-content: center; }' +
    '.ev-ctl button { flex: 1; max-width: 120px; min-height: 56px; border-radius: 16px; background: #fff; font-size: 20px; font-weight: 900; box-shadow: 0 4px 0 rgba(0,0,0,.1); }' +
    '.ev-ctl .bell { background: #ffd9d9; }' +
    '.ev-go { align-self: center; }' +
    '.ev-legend { background: #e9f3ff; border-radius: 14px; padding: 8px 12px; font-weight: 800; font-size: 16px; line-height: 1.5; color: #1d4f7a; }' +
    '@media (max-width: 760px) {' +
    '  .ev-shaft { width: 74px; } .ev-car { left: 28px; } .ev-floor { font-size: 11px; padding-left: 4px; }' +
    '  .ev-led { font-size: 34px; } .ev-msg { font-size: 17px; } .ev-mission { font-size: 16px; }' +
    '  .ev-call button { width: 80px; height: 80px; font-size: 36px; } .ev-panel { gap: 6px; } .ev-panel button { font-size: 18px; max-width: 60px; }' +
    '  .ev-ctl button { font-size: 16px; min-height: 50px; }' +
    '}';
  var styled = false;
  function addStyle() { if (styled) return; styled = true; document.head.appendChild(el('style', { text: CSS })); }

  /* 조사 고르기: 마지막 한글(또는 숫자)의 받침을 본다. '으로/로'는 ㄹ 받침도 '로' */
  function jo(word, pair) {
    var w = String(word).replace(/[^가-힣0-9]+$/g, ''), c = w.charAt(w.length - 1), jong = 0;
    if (/[가-힣]/.test(c)) jong = (c.charCodeAt(0) - 0xAC00) % 28;
    else if (/[0-9]/.test(c)) jong = { '0': 21, '1': 8, '3': 16, '6': 1, '7': 8, '8': 8 }[c] || 0;
    var p = pair.split('/');
    if (pair === '으로/로') return word + (jong === 0 || jong === 8 ? '로' : '으로');
    return word + (jong ? p[0] : p[1]);
  }
  /* ---------- 건물 만들기 ----------
     탈 때마다 건물이 바뀐다. 층은 아래에서 위 순서의 배열이고, 칸마다 이름표를 단다.
     아파트형: B2 B1 1 2 … / 호텔형: B1 L 2 … RF / 영국형: B1 G 1 2 … / 백화점형: B3 B2 B1 1 … RF */
  var KIND_NAME = { apt: '🏢 아파트', hotel: '🏨 호텔', uk: '🇬🇧 영국식 건물', mall: '🏬 백화점' };
  function floorOf(label) {
    if (label === 'L') return { label: 'L', say: '로비', dest: ['🛎️', '로비'], ground: true };
    if (label === 'G') return { label: 'G', say: '그라운드 층', dest: ['🚪', '1층 입구'], ground: true };
    if (label === 'RF') return { label: 'RF', say: '옥상', dest: ['🌇', '옥상 정원'] };
    if (label.charAt(0) === 'B') { var n = +label.slice(1); return { label: label, say: '지하 ' + K.numToKo(n) + ' 층', dest: ['🚗', '지하 ' + n + '층 주차장'] }; }
    return { label: label, say: K.numToKo(+label) + ' 층', ground: label === '1' };
  }
  function makeBuilding(lv) {
    var kinds = lv <= 1 ? ['apt'] : lv === 2 ? ['apt', 'hotel'] : ['apt', 'hotel', 'uk', 'mall'];
    var kind = K.pick(kinds);
    var top = lv <= 1 ? K.randInt(5, 6) : lv === 2 ? K.randInt(6, 9) : K.randInt(7, lv >= 5 ? 14 : 11);
    var basements = lv <= 1 ? 0 : lv === 2 ? K.randInt(0, 1) : K.randInt(1, kind === 'mall' ? 3 : 2);
    var list = [];
    for (var b = basements; b >= 1; b--) list.push('B' + b);
    if (kind === 'hotel') { list.push('L'); for (var i = 2; i <= top; i++) list.push(String(i)); list.push('RF'); }
    else if (kind === 'uk') { list.push('G'); for (var j = 1; j <= top - 1; j++) list.push(String(j)); }
    else { for (var k = 1; k <= top; k++) list.push(String(k)); if (kind === 'mall' || (lv >= 2 && Math.random() < 0.4)) list.push('RF'); }
    return { kind: kind, floors: list.map(floorOf) };
  }

  function start(main, back) {
    addStyle();
    var lv = K.getLevel('elevator');
    var bld = makeBuilding(lv), floors = bld.floors;
    var groundIdx = floors.findIndex(function (f) { return f.ground; });
    var TRIPS = 3, trip = 0, safeOk = 0, safeAll = 0, mistakes = 0;
    var cur = groundIdx, target = groundIdx, dest = null, phase = 'hall', timer = null;

    document.body.classList.add('fixed');
    main.innerHTML = '';
    var wrap = el('div', { class: 'ev' });
    var mission = el('div', { class: 'ev-mission' });
    wrap.appendChild(el('div', { class: 'ev-top' }, [K.backButton(function () { clearTimeout(timer); document.body.classList.remove('fixed'); back(); }), mission]));
    var body = el('div', { class: 'ev-body' });
    var shaft = el('div', { class: 'ev-shaft' });
    var floorEls = floors.map(function (f) { var d = el('div', { class: 'ev-floor', text: f.label }); shaft.appendChild(d); return d; });
    var car = el('div', { class: 'ev-car' }, [el('span', { class: 'kid', text: '🧒' }), el('div', { class: 'door l' }), el('div', { class: 'door r' })]);
    car.style.height = (100 / floors.length) + '%';
    shaft.appendChild(car);
    var side = el('div', { class: 'ev-side' });
    body.appendChild(shaft); body.appendChild(side);
    wrap.appendChild(body);
    main.appendChild(wrap);

    function F(i) { return floors[i]; }
    function placeCar() { car.style.bottom = (cur / floors.length * 100) + '%'; }
    function led(extra) { return el('div', { class: 'ev-led', html: F(cur).label + (extra ? '<small>' + extra + '</small>' : '') }); }
    function msg(t) { return el('div', { class: 'ev-msg', text: t }); }
    function setDoor(open) { car.classList.toggle('open', open); }
    function nameOf(i) { var f = F(i); return /^\d+$/.test(f.label) ? f.label + '층' : f.label + '(' + f.say + ')'; }

    /* 처음 탈 때 이 건물의 특별한 층 이름을 알려 준다 */
    var special = floors.filter(function (f) { return /^(L|G|RF|B\d)$/.test(f.label); }).map(function (f) { return f.label; });
    var legend = [];
    if (special.indexOf('L') >= 0) legend.push('L = 로비 (1층)');
    if (special.indexOf('G') >= 0) legend.push('G = 그라운드 (땅 높이, 그 위가 1층)');
    if (special.indexOf('RF') >= 0) legend.push('RF = 옥상');
    if (special.some(function (x) { return x.charAt(0) === 'B'; })) legend.push('B = 지하 (B1은 지하 1층)');

    function newTrip() {
      if (trip >= TRIPS) return finish();
      /* 단계 3부터는 내려가는 길도 나온다 */
      var choices = []; for (var i = 0; i < floors.length; i++) if (i !== cur && (lv >= 3 || i > cur)) choices.push(i);
      if (!choices.length) for (var j = 0; j < floors.length; j++) if (j !== cur) choices.push(j);
      target = K.pick(choices);
      dest = F(target).dest || (F(target).label === '1' ? ['🌳', '1층 놀이터'] : K.pick(DEST));
      floorEls.forEach(function (d, k) { d.classList.toggle('target', k === target); });
      mission.textContent = '🎯 ' + nameOf(target) + ' ' + dest[1] + ' ' + dest[0] + '  (' + (trip + 1) + '/' + TRIPS + ')';
      setDoor(false); placeCar();
      /* 단계 4부터 가끔 불이 난다: 엘리베이터 대신 계단 */
      if (lv >= 4 && Math.random() < 0.25 && cur !== groundIdx) { mission.textContent = '🔥 불이 났어요! ' + jo(nameOf(groundIdx), '으로/로') + ' 대피해요  (' + (trip + 1) + '/' + TRIPS + ')'; return fireEvent(); }
      hall();
      K.speak(F(target).say + ', ' + dest[1] + '에 가요. 엘리베이터를 불러요');
    }

    /* ---------- 1. 엘리베이터 부르기 ---------- */
    function hall() {
      phase = 'hall';
      side.innerHTML = '';
      side.appendChild(led('지금 층'));
      if (trip === 0 && legend.length) side.appendChild(el('div', { class: 'ev-legend', html: KIND_NAME[bld.kind] + '<br>' + legend.map(K.esc).join('<br>') }));
      side.appendChild(msg(jo(nameOf(target), '은/는') + ' ' + (target > cur ? '위' : '아래') + '에 있어요. 어느 버튼을 누를까요?'));
      var up = el('button', { text: '▲', title: '올라가기' }), down = el('button', { text: '▼', title: '내려가기' });
      function call(isUp, b) {
        if (phase !== 'hall') return;
        if (isUp !== (target > cur)) {
          mistakes++;
          K.nope(isUp ? '위가 아니에요' : '아래가 아니에요', jo(F(target).say, '은/는') + ' ' + (target > cur ? '위에' : '아래에') + ' 있어요');
          return;
        }
        b.classList.add('lit'); K.sfx.click(); phase = 'wait';
        var m = side.querySelectorAll('.ev-msg'); m[m.length - 1].textContent = '엘리베이터가 오고 있어요...';
        timer = setTimeout(function () { setDoor(true); K.sfx.star(); openHall(); }, 900);
      }
      up.addEventListener('click', function () { call(true, up); });
      down.addEventListener('click', function () { call(false, down); });
      var row = el('div', { class: 'ev-call' });
      if (cur < floors.length - 1) row.appendChild(up);
      if (cur > 0) row.appendChild(down);
      side.appendChild(row);
      if (trip === 0 && legend.length) K.speak(legend.join('. ').replace(/[()=]/g, ' '));
    }
    function openHall() {
      phase = 'board';
      side.innerHTML = '';
      side.appendChild(led());
      side.appendChild(msg('띵동! 문이 열렸어요. 내리는 사람이 먼저, 그다음에 타요'));
      side.appendChild(el('button', { class: 'kl-btn primary big ev-go', text: '🚶 타기', onclick: function () { K.sfx.click(); inside(); } }));
      K.speak('문이 열렸어요. 타요');
    }

    /* ---------- 2. 안에서 층 버튼 ---------- */
    function inside() {
      phase = 'inside';
      var chosen = null;
      side.innerHTML = '';
      side.appendChild(led());
      var m = msg(nameOf(target) + ' 버튼을 찾아 눌러요');
      side.appendChild(m);
      var panel = el('div', { class: 'ev-panel' });
      for (var i = floors.length - 1; i >= 0; i--) (function (i) {
        var b = el('button', { text: F(i).label });
        b.addEventListener('click', function () {
          if (phase !== 'inside') return;
          if (i !== target) {
            mistakes++;
            K.nope(jo(nameOf(i), '이/가') + ' 아니에요', jo(F(i).say, '이/가') + ' 아니에요. ' + jo(F(target).say, '을/를') + ' 찾아요');
            return;
          }
          chosen = i; b.classList.add('lit'); K.sfx.click(); K.speak(F(i).say);
          m.textContent = '이제 닫힘 버튼을 눌러요';
        });
        panel.appendChild(b);
      })(i);
      side.appendChild(panel);
      var ctl = el('div', { class: 'ev-ctl' }, [
        el('button', { text: '◀│▶ 열림', onclick: function () { K.sfx.click(); setDoor(true); } }),
        el('button', { text: '▶│◀ 닫힘', onclick: function () {
          if (chosen === null) { K.nope('층 버튼 먼저!', '먼저 가고 싶은 층 버튼을 눌러요'); return; }
          K.sfx.click(); closeDoor();
        } }),
        el('button', { class: 'bell', text: '🔔', title: '비상벨', onclick: function () { K.speak('비상벨은 위험할 때만 눌러요'); K.toast('🔔 비상벨은 갇히거나 위험할 때만 눌러요'); } })
      ]);
      side.appendChild(ctl);
      K.speak(F(target).say + ' 버튼을 찾아 눌러요');
    }
    function closeDoor() {
      /* 단계 2부터: 문이 닫힐 때 친구가 뛰어온다 */
      if (lv >= 2 && Math.random() < 0.4) {
        return ask('문이 닫히고 있는데 친구가 뛰어와요! 어떻게 할까요?', [
          ['◀│▶', '열림 버튼을 눌러 기다려 줘요', true], ['✋', '문 사이에 손을 넣어요', false], ['🏃', '친구에게 뛰어들라고 해요', false]
        ], '열림 버튼을 누르면 안전하게 기다릴 수 있어요. 문 사이에 손을 넣으면 다쳐요', function () { setDoor(false); timer = setTimeout(move, 600); });
      }
      setDoor(false); timer = setTimeout(move, 600);
    }

    /* ---------- 3. 움직이기 ---------- */
    var ledEl = null;
    function drawMoving() {
      side.innerHTML = '';
      ledEl = led(target > cur ? '▲' : '▼');
      side.appendChild(ledEl);
      side.appendChild(msg(target > cur ? '올라가요...' : '내려가요...'));
      side.appendChild(el('div', { class: 'ev-msg', text: '🙂 손잡이를 잡고 가만히 있어요', style: 'font-size:16px;color:#5e5e5e' }));
    }
    function move() {
      phase = 'moving';
      drawMoving();
      var step = target > cur ? 1 : -1;
      var stopAt = (lv >= 3 && Math.random() < 0.35 && Math.abs(target - cur) >= 2) ? cur + step : -1;
      function tick() {
        cur += step; placeCar();
        ledEl.innerHTML = F(cur).label + '<small>' + (target > cur ? '▲' : target < cur ? '▼' : '') + '</small>';
        K.sfx.pop();
        if (cur === stopAt) { stopAt = -1; return stuck(tick); }
        if (cur === target) { timer = setTimeout(arrive, 500); return; }
        timer = setTimeout(tick, 750);
      }
      timer = setTimeout(tick, 600);
    }
    function stuck(resume) {
      ask('덜컹! 엘리베이터가 멈췄어요. 어떻게 할까요?', [
        ['🔔', '비상벨을 누르고 기다려요', true], ['👐', '문을 힘으로 열어요', false], ['🦘', '쿵쿵 뛰어요', false]
      ], '비상벨을 누르면 관리실 아저씨가 도와줘요. 가만히 기다리면 돼요', function () {
        K.toast('🔔 관리실: "금방 고쳐 드릴게요!"', 2200);
        drawMoving();
        timer = setTimeout(resume, 1600);
      });
    }

    /* ---------- 4. 도착 ---------- */
    function arrive() {
      phase = 'arrive';
      setDoor(true); K.sfx.correct();
      side.innerHTML = '';
      side.appendChild(led());
      side.appendChild(msg('띵동! ' + jo(nameOf(target), '이에요/예요') + '. ' + dest[0] + ' ' + dest[1]));
      side.appendChild(el('button', { class: 'kl-btn primary big ev-go', text: '🚶 내리기', onclick: function () {
        K.sfx.click(); trip++; K.addStar(1); K.event('correct');
        newTrip();
      } }));
      K.speak(F(target).say + '입니다. ' + dest[1] + '에 왔어요');
    }

    /* ---------- 불이 났을 때 ---------- */
    function fireEvent() {
      side.innerHTML = '';
      side.appendChild(led());
      ask('🔥 불이 났어요! ' + jo(F(groundIdx).say, '으로/로') + ' 대피해야 해요. 어떻게 할까요?', [
        ['🚶', '계단으로 걸어가요', true], ['↕️', '엘리베이터를 타요', false], ['🙈', '방에 숨어요', false]
      ], '불이 나면 엘리베이터는 멈출 수 있어요. 꼭 계단으로 가요', function () {
        K.toast('🚶 계단으로 안전하게 대피했어요', 2200);
        cur = groundIdx; placeCar();
        trip++; K.addStar(1);
        timer = setTimeout(newTrip, 1400);
      });
    }

    /* 안전 질문: 틀리면 이유를 알려 주고 다시 고르게 한다 */
    function ask(q, opts, why, then) {
      safeAll++;
      var first = true;
      side.innerHTML = '';
      side.appendChild(el('div', { class: 'kl-prompt', text: q, style: 'font-size:22px;margin:0' }));
      var g = el('div', { class: 'kl-choices cols1' });
      K.shuffle(opts).forEach(function (o) {
        var b = el('button', { class: 'kl-choice text', html: o[0] + ' ' + K.esc(o[1]) });
        b.addEventListener('click', function () {
          if (o[2]) {
            if (g.dataset.done) return;
            g.dataset.done = '1'; g.style.pointerEvents = 'none';
            if (first) safeOk++;
            b.classList.add('right'); K.sfx.correct(); K.speak(why);
            side.appendChild(el('div', { class: 'kl-feedback good', text: '⭕ ' + why }));
            setTimeout(then, 2400);
          } else {
            first = false; b.classList.add('wrong', 'wrong-mark'); K.nope('위험해요!', '위험해요. ' + why);
          }
        });
        g.appendChild(b);
      });
      side.appendChild(g);
      K.speak(q);
    }

    function finish() {
      document.body.classList.remove('fixed');
      var up = mistakes <= 1 && safeOk === safeAll && lv < 5;
      if (up) K.setLevel('elevator', lv + 1);
      main.innerHTML = ''; main.appendChild(K.backButton(back));
      main.appendChild(el('div', { class: 'kl-result' }, [
        el('div', { class: 'kl-result-emoji', text: '🏢' }),
        el('div', { class: 'kl-result-title', text: KIND_NAME[bld.kind].slice(3) + ' 엘리베이터를 ' + TRIPS + '번 잘 탔어요!' }),
        el('div', { class: 'kl-result-score', html: (safeAll ? '🦺 안전 질문 ' + safeOk + ' / ' + safeAll + '<br>' : '') + '다음엔 다른 건물이 나와요' + (up ? '<div class="kl-levelup">🎊 단계 ' + (lv + 1) + '로 올라갔어요!</div>' : '') }),
        el('div', { class: 'kl-row' }, [
          el('button', { class: 'kl-btn primary', text: '🔁 다른 건물 타기', onclick: function () { start(main, back); } }),
          el('button', { class: 'kl-btn', text: '🏠 처음으로', onclick: back })
        ])
      ]));
      K.sfx.win(); K.confetti(); K.event('win');
    }

    newTrip();
  }

  global.Elevator = { start: start };
})(window);
