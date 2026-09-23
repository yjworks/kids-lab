const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const U = 'http://127.0.0.1:8765/apps/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, locale: 'ko-KR' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const out = [];
  async function menu(app, label) { await p.goto(U + app + '/index.html'); try { await p.waitForSelector('.kl-menu-item', { timeout: 5000 }); } catch (e) { console.log('MENU FAIL', app, (await p.evaluate(() => document.body.innerText)).slice(0, 300)); throw e; } await p.locator('.kl-menu-item', { hasText: label }).first().click(); await p.waitForTimeout(300); }

  // 1. 칠교: 모든 퍼즐을 실제 드래그로 완성
  const tan = [];
  for (let i = 0; i < 7; i++) {
    await menu('space', '칠교'); await p.locator('.tan-card').nth(i).click(); await p.waitForTimeout(300);
    const n = await p.locator('.piece').count();
    for (let k = 0; k < 20; k++) {
      // 아직 안 붙은 조각 하나 → 같은 모양 빈 자리 중심으로 끈다
      const job = await p.evaluate(() => {
        const svg = document.querySelector('.tan-svg'); const pcs = [...svg.querySelectorAll('.piece')].filter(g => g.style.cursor !== 'default');
        if (!pcs.length) return null;
        const g = pcs[0]; const r = g.getBoundingClientRect();
        // 자리: 회색 폴리곤 중 같은 모양이면서 비어 있는 것 → 조각 점 목록과 비교
        const pp = g.getAttribute('points'); const sil = [...svg.querySelectorAll('g polygon')].find(pl => pl.getAttribute('points') === pp && !pl.dataset.used);
        if (!sil) return { err: 'no slot' };
        sil.dataset.used = 1; const s = sil.getBoundingClientRect();
        // 조각 중심 = bbox 중심 (같은 도형이라 bbox 중심 차이 = 옮길 거리)
        return { x0: r.left + r.width / 2, y0: r.top + r.height / 2, x1: s.left + s.width / 2, y1: s.top + s.height / 2 };
      });
      if (!job) break; if (job.err) { tan.push(i + ':' + job.err); break; }
      // 조각 안쪽 한 점을 잡아야 한다: 삼각형은 bbox 중심이 조각 밖일 수 있어 elementFromPoint로 확인 후 보정
      const pt = await p.evaluate(({ x0, y0 }) => { const svg = document.querySelector('.tan-svg'); const pcs = [...svg.querySelectorAll('.piece')].filter(g => g.style.cursor !== 'default'); const g = pcs[pcs.length - 1] === pcs[0] ? pcs[0] : pcs[0]; const r = g.getBoundingClientRect(); for (let a = 0.3; a <= 0.7; a += 0.1) for (let c = 0.3; c <= 0.7; c += 0.1) { const x = r.left + r.width * a, y = r.top + r.height * c; if (document.elementFromPoint(x, y) === g) return [x, y]; } return null; }, job);
      if (!pt) { tan.push(i + ':grab-fail'); break; }
      await p.mouse.move(pt[0], pt[1]); await p.mouse.down();
      await p.mouse.move(pt[0] + (job.x1 - job.x0) / 2, pt[1] + (job.y1 - job.y0) / 2, { steps: 5 });
      await p.mouse.move(pt[0] + (job.x1 - job.x0), pt[1] + (job.y1 - job.y0), { steps: 5 });
      await p.mouse.up(); await p.waitForTimeout(120);
    }
    const msg = await p.locator('.tan-wrap .kl-sub').textContent();
    tan.push(i + ':' + n + '조각 ' + (/완성/.test(msg) ? '완성' : '미완성(' + msg + ')'));
  }
  out.push('칠교 ' + tan.join(' | '));

  // 2. 자판: 한글 낱말을 실제 키로 치기 (IME 없이 e.code)
  await menu('typing', '한글 낱말');
  const comp = await p.evaluate(() => { const T = window.KidTyping; const words = ['나무', '의자', '과자', '토마토', '닭', '값', '앉다', '읽기', '사랑', '뭐', '왜', '괜찮아']; return words.map(w => { const k = T.keysOf(w); return w + '=' + (T.compose(k) === w ? 'ok' : T.compose(k)); }).join(' '); });
  out.push('조합 ' + comp);
  const KO = { 'ㅂ': 'KeyQ', 'ㅈ': 'KeyW', 'ㄷ': 'KeyE', 'ㄱ': 'KeyR', 'ㅅ': 'KeyT', 'ㅛ': 'KeyY', 'ㅕ': 'KeyU', 'ㅑ': 'KeyI', 'ㅐ': 'KeyO', 'ㅔ': 'KeyP', 'ㅁ': 'KeyA', 'ㄴ': 'KeyS', 'ㅇ': 'KeyD', 'ㄹ': 'KeyF', 'ㅎ': 'KeyG', 'ㅗ': 'KeyH', 'ㅓ': 'KeyJ', 'ㅏ': 'KeyK', 'ㅣ': 'KeyL', 'ㅋ': 'KeyZ', 'ㅌ': 'KeyX', 'ㅊ': 'KeyC', 'ㅍ': 'KeyV', 'ㅠ': 'KeyB', 'ㅜ': 'KeyN', 'ㅡ': 'KeyM' };
  let typedWords = 0;
  for (let w = 0; w < 8; w++) {
    const word = (await p.locator('.target').textContent()).trim();
    const keys = await p.evaluate(x => window.KidTyping.keysOf(x), word);
    if (w === 0) { await p.keyboard.press('KeyZ'); await p.keyboard.press('Backspace'); }
    for (const j of keys) await p.keyboard.press(KO[j]);
    await p.waitForTimeout(450); typedWords++;
  }
  const tres = await p.locator('.res').textContent().catch(() => '없음');
  out.push('한글 낱말 ' + typedWords + '개 → ' + tres);
  await menu('typing', '가운뎃줄 왼손');
  for (let i = 0; i < 20; i++) { const t = (await p.locator('.target').textContent()).trim(); await p.keyboard.press(KO[t]); await p.waitForTimeout(40); }
  out.push('자리 연습 → ' + await p.locator('.res').textContent().catch(() => '없음'));
  await menu('typing', '영어 낱말');
  for (let w = 0; w < 8; w++) { const word = (await p.locator('.target').textContent()).trim(); for (const c of word) await p.keyboard.press('Key' + c.toUpperCase()); await p.waitForTimeout(450); }
  out.push('영어 낱말 → ' + await p.locator('.res').textContent().catch(() => '없음'));

  // 3. AI 가르치기: 바르게 가르치고 시험 끝까지
  for (const task of ['날 수 있을까', '과일일까']) {
    await menu('aiteach', task);
    const truth = await p.evaluate(() => 0);
    for (let i = 0; i < 6; i++) { await p.locator('.basket').first().click(); await p.waitForTimeout(60); }
    let steps = 0;
    for (let i = 0; i < 8; i++) {
      if (!(await p.locator('.judge button').count())) break;
      await p.locator('.judge button').first().click(); await p.waitForTimeout(80);
      await p.locator('.big-btn').click(); await p.waitForTimeout(80); steps++;
    }
    out.push('AI ' + task + ' 시험 ' + steps + '문제 → ' + (await p.locator('.bubble').first().textContent()).slice(0, 30));
  }
  await menu('aiteach', '로보의 실수');
  const bias = [];
  for (let i = 0; i < 6; i++) { const t = await p.locator('.note').allTextContents(); bias.push(t.map(x => x.slice(0, 3)).join('')); const nb = p.locator('.big-btn'); if (await nb.count()) { await nb.click(); await p.waitForTimeout(80); } }
  out.push('편향 실험 ' + bias.join(' | '));

  // 4. 저금통: 끝까지
  await menu('money', '저금통');
  let days = 0;
  for (let i = 0; i < 20; i++) { const bt = p.locator('.row2 .kl-btn').first(); if (!(await p.locator('.tempt').count())) break; await (i % 3 ? bt : p.locator('.row2 .kl-btn').nth(1)).click(); await p.waitForTimeout(60); days++; }
  out.push('저금통 ' + days + '일 → ' + (await p.locator('.kl-prompt').last().textContent()));

  // 5. 영어 그림책: 한 권 끝까지 + 질문
  await p.goto(U + 'ebooks/index.html'); await p.locator('.cover').nth(3).click(); await p.waitForTimeout(200);
  const lay = await p.evaluate(() => { const n = document.querySelector('.nav').getBoundingClientRect(); return Math.round(n.bottom) + '/' + innerHeight; });
  let pages = 0;
  while (true) { pages++; const go = p.locator('.nav .go'); const t = await go.textContent(); await go.click(); await p.waitForTimeout(100); if (/다 읽었어요/.test(t)) break; }
  let q = 0; for (let i = 0; i < 10; i++) { const c = p.locator('.kl-choice:not(.dim)'); if (!(await c.count())) break; await c.first().click(); await p.waitForTimeout(950); q++; }
  out.push('영어 그림책 ' + pages + '쪽, 버튼 바닥 ' + lay + ', 질문 클릭 ' + q + ' → ' + await p.locator('.kl-result-title').textContent().catch(() => '결과없음'));

  // 6. 문장 만들기: 정답 순서로 누르기
  await menu('esent', '문장 만들기');
  let built = 0;
  for (let r = 0; r < 6; r++) {
    const order = await p.evaluate(() => { /* 정답 문장은 🔊 듣기 버튼 클로저에 있어서 타일 글자로 추측: 대문자로 시작, 마침표 끝 */ return [...document.querySelectorAll('.tiles .tile')].map(t => t.textContent); });
    // 가능한 순서: It/I 로 시작하는 틀 → 원래 문장 모양을 규칙으로 복원
    const words = order.slice(); const first = words.find(w => /^[A-Z]/.test(w));
    let sent = [];
    if (first === 'It') { sent = ['It', 'is']; const rest = words.filter(w => !['It', 'is', '.'].includes(w)); if (rest.includes('a')) sent.push('a'); if (rest.includes('an')) sent.push('an'); sent = sent.concat(rest.filter(w => w !== 'a' && w !== 'an')); }
    else { const verb = words.find(w => ['am', 'like', 'can', 'have'].includes(w)); sent = ['I', verb]; const rest = words.filter(w => !['I', verb, '.'].includes(w)); const nums = ['two', 'three', 'four', 'five']; rest.sort((a, bb) => (nums.includes(bb) ? 1 : 0) - (nums.includes(a) ? 1 : 0)); if (rest.includes('ride')) { sent = sent.concat(['ride', 'a', 'bike']); } else sent = sent.concat(rest); }
    sent.push('.');
    for (const w of sent) { await p.locator('.tiles .tile:not(.used)', { hasText: new RegExp('^' + w.replace('.', '\\.') + '$') }).first().click(); await p.waitForTimeout(30); }
    await p.waitForTimeout(1700); built++;
  }
  out.push('문장 만들기 → ' + await p.locator('.kl-result-score').textContent().catch(() => '결과없음'));

  // 7. 지구 약속 체크
  await menu('earth', '지구 약속'); for (let i = 0; i < 3; i++) await p.locator('.check button').nth(i).click();
  out.push('지구 약속 ' + await p.locator('.earthbar').textContent());

  console.log(out.join('\n')); console.log('오류', errs.length ? errs.join(' / ') : '없음');
  await b.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
