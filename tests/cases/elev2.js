const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'], locale:'ko-KR' });
  const seen = {}; let runs = 0, fails = [];
  for (let lv = 1; lv <= 5; lv++) for (let rep = 0; rep < 4; rep++) {
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://127.0.0.1:8765/apps/daily/index.html'); await p.waitForSelector('.kl-menu-item');
    await p.evaluate((lv) => { const pr = KidLab.progress(); const L = pr.levels || {}; L.elevator = lv; KidLab.setProgress({ levels: L }); }, lv);
    await p.locator('.kl-menu-item', { hasText: '엘리베이터' }).click(); await p.waitForSelector('.ev-mission');
    const labels = await p.$$eval('.ev-floor', e => e.map(x => x.textContent));
    const legend = await p.evaluate(() => document.querySelector('.ev-legend')?.textContent || '');
    seen[labels.join(',')] = legend.split(/(?=[A-Z]+ =)/)[0];
    let steps = 0, done = false, texts = [];
    for (; steps < 220; steps++) {
      await p.waitForTimeout(200);
      if (await p.locator('.kl-result').count()) { done = true; break; }
      const st = await p.evaluate(() => {
        const floors = [...document.querySelectorAll('.ev-floor')];
        const t = floors.findIndex(f => f.classList.contains('target'));
        const curLabel = document.querySelector('.ev-led')?.childNodes[0]?.textContent;
        const c = floors.findIndex(f => f.textContent === curLabel);
        return { t, c, tl: floors[t]?.textContent, call: [...document.querySelectorAll('.ev-call button')].map(b => b.textContent),
          panel: document.querySelectorAll('.ev-panel button').length, lit: !!document.querySelector('.ev-panel button.lit'),
          q: !!document.querySelector('.ev-side .kl-choice') && !document.querySelector('.ev-side .kl-choices[data-done]'),
          go: document.querySelector('.ev-go') ? 1 : 0, msgs: [...document.querySelectorAll('.ev-msg, .ev-mission')].map(m => m.textContent).join(' | ') };
      });
      texts.push(st.msgs);
      if (st.q) {
        const opts = await p.$$eval('.ev-side .kl-choice', e => e.map(x => x.textContent));
        const good = opts.findIndex(o => /열림 버튼|비상벨|계단/.test(o));
        await p.locator('.ev-side .kl-choice').nth(good).click(); await p.waitForTimeout(2700); continue;
      }
      if (st.go) { await p.locator('.ev-go').click(); continue; }
      if (st.call.length) { await p.locator('.ev-call button', { hasText: st.t > st.c ? '▲' : '▼' }).click(); await p.waitForTimeout(1200); continue; }
      if (st.panel && !st.lit) {
        await p.locator('.ev-panel button').filter({ hasText: new RegExp('^' + st.tl + '$') }).click(); await p.waitForTimeout(120);
        await p.locator('.ev-ctl button', { hasText: '닫힘' }).click(); continue;
      }
    }
    runs++;
    // 문장 검사: 잘못된 조사
    const bad = texts.join(' ').match(/(로비|그라운드 층|옥상)(은|이 |으로|이에요)|[A-Z]\)이에요|\d(이에요)/g);
    if (!done || errs.length || bad) fails.push('lv' + lv + ' ' + labels.join(',') + (done ? '' : ' 미완') + (errs.length ? ' 오류 ' + errs[0] : '') + (bad ? ' 조사 ' + bad.join(',') : ''));
    await p.close();
  }
  console.log('돌려 본 건물', runs, '| 서로 다른 층 구성', Object.keys(seen).length);
  Object.entries(seen).slice(0, 12).forEach(([k, v]) => console.log('  ', k, v ? '← ' + v : ''));
  console.log('문제', fails.length ? fails.join('\n') : '없음');
  await b.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
