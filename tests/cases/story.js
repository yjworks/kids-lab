const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
/* 이야기 만들기: 모든 종류·단계의 문장 검사 + 작가 되기 한 편을 실제로 만들어 책장에 넣기 */
(async () => {
  const b = await chromium.launch(); const c = await b.newContext(devices['Pixel 7']); const p = await c.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/apps/story/index.html'); await p.waitForTimeout(300);
  const r = await p.evaluate(() => {
    const S = window.KidStory, out = { n: 0, bad: [], josa: [], eps: S.EPS.length };
    const jong = ch => { const k = ch.charCodeAt(0) - 0xAC00; return k >= 0 && k <= 11171 ? k % 28 : -1; };
    const OK = ['맛있는', '있는'];
    const names = ['', '콩이', '별', 'Kong', '단비', '하늘'];
    S.EPS.forEach(ep => [1, 2, 3].forEach(lv => {
      for (let t = 0; t < 300; t++) {
        const picks = {}; S.stepsOf(ep, lv).forEach(s => { picks[s.id] = s.o[Math.floor(Math.random() * s.o.length)]; });
        const st = { ep: ep.id, lv, picks, name: lv === 3 ? names[t % names.length] : '', said: lv === 3 && t % 2 ? '"우리 같이 가자!"' : '', ending: '' };
        let L; try { L = S.compose(st); } catch (e) { out.bad.push(ep.id + lv + ' 예외 ' + e.message); continue; }
        out.n++; const txt = L.join(' | ');
        if (/undefined|NaN|null|\[object/.test(txt)) out.bad.push(ep.id + lv + ' ' + txt.slice(0, 60));
        for (const m of txt.matchAll(/([가-힣])(를|와|는|가|로|라는|였어요)(?=[\s.,!?"]|$)/g)) { const j = jong(m[1]); const w = txt.slice(Math.max(0, m.index - 2), m.index + 3); if (j > 0 && !(m[2] === '로' && j === 8) && !OK.some(x => w.includes(x))) out.josa.push(m[0]); }
        for (const m of txt.matchAll(/([가-힣])(을|과|은|이|으로|이라는|이었어요)(?=[\s.,!?"]|$)/g)) { if (jong(m[1]) === 0) out.josa.push(m[0]); }
      }
    }));
    out.josa = [...new Set(out.josa)]; return out;
  });
  console.log('종류 ' + r.eps + ' · 만든 이야기 ' + r.n + ' · 빈 값/예외 ' + r.bad.length + ' · 조사 틀림 ' + r.josa.length + (r.josa.length ? ' ' + r.josa.slice(0, 5).join(',') : ''));
  // 작가 되기 한 편 (실제 누르기·입력)
  await p.locator('.kl-menu-item', { hasText: '새 이야기 만들기' }).click(); await p.waitForTimeout(200);
  await p.locator('.ep-grid button').nth(4).click(); await p.waitForTimeout(200);           // 꼬마 탐정
  await p.locator('.lv-list button').nth(2).click(); await p.waitForTimeout(200);          // 작가 되기
  for (let k = 0; k < 10 && await p.locator('.pick-grid button').count(); k++) { await p.locator('.pick-grid button').first().click(); await p.waitForTimeout(150); }
  const inputs = p.locator('.write input'); const nIn = await inputs.count();
  if (nIn === 3) { await inputs.nth(0).fill('콩이'); await inputs.nth(1).fill('범인은 바로 너야'); await inputs.nth(2).fill('콩이는 곰 인형을 꼭 안고 잠들었어요'); }
  await p.locator('.kl-btn.primary', { hasText: '이야기 완성' }).click(); await p.waitForTimeout(300);
  const book = await p.locator('.book').innerText().catch(() => '');
  await p.locator('.kl-btn.green').click(); await p.waitForTimeout(300);
  await p.locator('.kl-back').first().click(); await p.waitForTimeout(200);
  const shelfLabel = await p.locator('.kl-menu-item', { hasText: '내 책장' }).innerText();
  const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log('작가 되기 입력칸 ' + nIn + ' · 이름 들어감 ' + /콩이라는/.test(book) + ' · 대사 ' + /"범인은 바로 너야"/.test(book) + ' · 끝 문장 ' + /꼭 안고 잠들었어요\./.test(book) + ' · 책장 ' + shelfLabel.replace(/\s+/g, ' ') + ' · 넘침 ' + over);
  console.log('오류: ' + (errs.length ? errs.join(' / ') : '없음'));
  await b.close();
})();
