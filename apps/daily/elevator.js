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
    '@media (max-width: 760px) {' +
    '  .ev-shaft { width: 74px; } .ev-car { left: 28px; } .ev-floor { font-size: 11px; padding-left: 4px; }' +
    '  .ev-led { font-size: 34px; } .ev-msg { font-size: 17px; } .ev-mission { font-size: 16px; }' +
    '  .ev-call button { width: 80px; height: 80px; font-size: 36px; } .ev-panel { gap: 6px; } .ev-panel button { font-size: 18px; max-width: 60px; }' +
    '  .ev-ctl button { font-size: 16px; min-height: 50px; }' +
    '}';
  var styled = false;
  function addStyle() { if (styled) return; styled = true; document.head.appendChild(el('style', { text: CSS })); }

  function label(f) { return f < 0 ? 'B' + (-f) : String(f); }
  function sayFloor(f) { return f < 0 ? '지하 ' + K.numToKo(-f) + ' 층' : K.numToKo(f) + ' 층'; }

  function start(main, back) {
    addStyle();
    var lv = K.getLevel('elevator');
    var top = lv <= 1 ? 5 : lv === 2 ? 8 : lv === 3 ? 10 : 12;
    var bottom = lv >= 4 ? -1 : 1;
    var floors = []; for (var f = bottom; f <= top; f++) if (f !== 0) floors.push(f);
    var TRIPS = 3, trip = 0, safeOk = 0, safeAll = 0, mistakes = 0;
    var cur = 1, target = 1, dest = null, phase = 'hall', timer = null;

    document.body.classList.add('fixed');
    main.innerHTML = '';
    var wrap = el('div', { class: 'ev' });
    var mission = el('div', { class: 'ev-mission' });
    wrap.appendChild(el('div', { class: 'ev-top' }, [K.backButton(function () { clearTimeout(timer); document.body.classList.remove('fixed'); back(); }), mission]));
    var body = el('div', { class: 'ev-body' });
    var shaft = el('div', { class: 'ev-shaft' });
    var floorEls = {};
    floors.forEach(function (f) { var d = el('div', { class: 'ev-floor', text: label(f) }); floorEls[f] = d; shaft.appendChild(d); });
    var car = el('div', { class: 'ev-car' }, [el('span', { class: 'kid', text: '🧒' }), el('div', { class: 'door l' }), el('div', { class: 'door r' })]);
    car.style.height = (100 / floors.length) + '%';
    shaft.appendChild(car);
    var side = el('div', { class: 'ev-side' });
    body.appendChild(shaft); body.appendChild(side);
    wrap.appendChild(body);
    main.appendChild(wrap);

    function placeCar() { car.style.bottom = (floors.indexOf(cur) / floors.length * 100) + '%'; }
    function led(extra) { return el('div', { class: 'ev-led', html: label(cur) + (extra ? '<small>' + extra + '</small>' : '') }); }
    function msg(t) { return el('div', { class: 'ev-msg', text: t }); }
    function setDoor(open) { car.classList.toggle('open', open); }

    function newTrip() {
      if (trip >= TRIPS) return finish();
      /* 출발 층은 지난번 도착 층. 단계 3부터는 내려가는 길도 나온다 */
      var choices = floors.filter(function (f) { return f !== cur && (lv >= 3 || f > cur); });
      if (!choices.length) choices = floors.filter(function (f) { return f !== cur; });
      target = K.pick(choices);
      dest = target < 0 ? ['🚗', '지하 주차장'] : target === 1 ? ['🌳', '1층 놀이터'] : K.pick(DEST);
      Object.keys(floorEls).forEach(function (k) { floorEls[k].classList.toggle('target', +k === target); });
      mission.textContent = '🎯 ' + label(target) + '층 ' + dest[1] + '에 가요 ' + dest[0] + '  (' + (trip + 1) + '/' + TRIPS + ')';
      setDoor(false); placeCar();
      /* 단계 4부터 가끔 불이 난다: 엘리베이터 대신 계단 */
      if (lv >= 4 && Math.random() < 0.25 && cur > 1) { mission.textContent = '🔥 불이 났어요! 1층으로 대피해요  (' + (trip + 1) + '/' + TRIPS + ')'; return fireEvent(); }
      hall();
      K.speak(label(target) === 'B1' ? '지하 주차장에 가요' : sayFloor(target) + ' ' + dest[1] + '에 가요. 엘리베이터를 불러요');
    }

    /* ---------- 1. 엘리베이터 부르기 ---------- */
    function hall() {
      phase = 'hall';
      side.innerHTML = '';
      side.appendChild(led('지금 층'));
      side.appendChild(msg(label(target) + '층은 ' + (target > cur ? '위' : '아래') + '에 있어요. 어느 버튼을 누를까요?'));
      var up = el('button', { text: '▲', title: '올라가기' }), down = el('button', { text: '▼', title: '내려가기' });
      function call(isUp, b) {
        if (phase !== 'hall') return;
        if (isUp !== (target > cur)) {
          mistakes++;
          K.nope(isUp ? '위가 아니에요' : '아래가 아니에요', label(target) + '층은 ' + (target > cur ? '위에' : '아래에') + ' 있어요');
          return;
        }
        b.classList.add('lit'); K.sfx.click(); phase = 'wait';
        side.querySelector('.ev-msg').textContent = '엘리베이터가 오고 있어요...';
        timer = setTimeout(function () { setDoor(true); K.sfx.star(); openHall(); }, 900);
      }
      up.addEventListener('click', function () { call(true, up); });
      down.addEventListener('click', function () { call(false, down); });
      var row = el('div', { class: 'ev-call' });
      if (floors.indexOf(cur) < floors.length - 1) row.appendChild(up);
      if (floors.indexOf(cur) > 0) row.appendChild(down);
      side.appendChild(row);
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
      var m = msg(label(target) + '층 버튼을 찾아 눌러요');
      side.appendChild(m);
      var panel = el('div', { class: 'ev-panel' });
      floors.slice().reverse().forEach(function (f) {
        var b = el('button', { text: label(f) });
        b.addEventListener('click', function () {
          if (phase !== 'inside') return;
          if (f !== target) {
            mistakes++;
            K.nope(label(f) + '층이 아니에요', label(f) + '층이 아니에요. ' + sayFloor(target) + '을 찾아요');
            return;
          }
          chosen = f; b.classList.add('lit'); K.sfx.click(); K.speak(sayFloor(f));
          m.textContent = '이제 닫힘 버튼을 눌러요';
        });
        panel.appendChild(b);
      });
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
      K.speak(sayFloor(target) + ' 버튼을 찾아 눌러요');
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
      var stopAt = (lv >= 3 && Math.random() < 0.35 && Math.abs(target - cur) >= 2) ? floors[floors.indexOf(cur) + step] : null;
      function tick() {
        var i = floors.indexOf(cur) + step;
        cur = floors[i]; placeCar();
        ledEl.innerHTML = label(cur) + '<small>' + (target > cur ? '▲' : target < cur ? '▼' : '') + '</small>';
        K.sfx.pop();
        if (cur === stopAt) { stopAt = null; return stuck(tick); }
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
      side.appendChild(msg('띵동! ' + label(target) + '층이에요. ' + dest[0] + ' ' + dest[1]));
      side.appendChild(el('button', { class: 'kl-btn primary big ev-go', text: '🚶 내리기', onclick: function () {
        K.sfx.click(); trip++; K.addStar(1); K.event('correct');
        newTrip();
      } }));
      K.speak(sayFloor(target) + '입니다. ' + dest[1] + '에 왔어요');
    }

    /* ---------- 불이 났을 때 ---------- */
    function fireEvent() {
      side.innerHTML = '';
      side.appendChild(led());
      ask('🔥 불이 났어요! 아래층으로 가야 해요. 어떻게 할까요?', [
        ['🚶', '계단으로 걸어가요', true], ['↕️', '엘리베이터를 타요', false], ['🙈', '방에 숨어요', false]
      ], '불이 나면 엘리베이터는 멈출 수 있어요. 꼭 계단으로 가요', function () {
        K.toast('🚶 계단으로 안전하게 내려왔어요', 2200);
        cur = 1; placeCar();
        trip++; K.addStar(1);
        timer = setTimeout(newTrip, 1400);
      });
    }

    /* 안전 질문: 틀리면 이유를 알려 주고 다시 고르게 한다 */
    function ask(q, opts, why, then) {
      safeAll++;
      var first = true;
      var back2 = side.innerHTML;
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
      return back2;
    }

    function finish() {
      document.body.classList.remove('fixed');
      var up = mistakes <= 1 && safeOk === safeAll && lv < 5;
      if (up) K.setLevel('elevator', lv + 1);
      main.innerHTML = ''; main.appendChild(K.backButton(back));
      main.appendChild(el('div', { class: 'kl-result' }, [
        el('div', { class: 'kl-result-emoji', text: '🏢' }),
        el('div', { class: 'kl-result-title', text: '엘리베이터를 ' + TRIPS + '번 잘 탔어요!' }),
        el('div', { class: 'kl-result-score', html: (safeAll ? '🦺 안전 질문 ' + safeOk + ' / ' + safeAll + '<br>' : '') + (up ? '<div class="kl-levelup">🎊 단계 ' + (lv + 1) + '로 올라갔어요!</div>' : '') }),
        el('div', { class: 'kl-row' }, [
          el('button', { class: 'kl-btn primary', text: '🔁 한 번 더', onclick: function () { start(main, back); } }),
          el('button', { class: 'kl-btn', text: '🏠 처음으로', onclick: back })
        ])
      ]));
      K.sfx.win(); K.confetti(); K.event('win');
    }

    newTrip();
  }

  global.Elevator = { start: start };
})(window);
