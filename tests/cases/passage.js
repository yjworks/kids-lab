const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  for (const [name, dev] of [['Pixel7', devices['Pixel 7']], ['desktop', { viewport:{width:1280,height:800} }], ['landscape', { viewport:{width:740,height:360}, isMobile:true, hasTouch:true }]]) {
    const ctx = await b.newContext({ ...dev, locale:'ko-KR' });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://127.0.0.1:8765/apps/passage/index.html'); await p.waitForSelector('.kl-menu-item');
    const menus = await p.$$eval('.kl-menu-item .kl-menu-label', e => e.map(x => x.textContent));
    const out = [];
    for (const g of [0, 3, 6]) {
      await p.goto('http://127.0.0.1:8765/apps/passage/index.html'); await p.waitForSelector('.kl-menu-item');
      await p.locator('.kl-menu-item').nth(g).click(); await p.waitForSelector('.pcard');
      await p.locator('.pcard').first().click(); await p.waitForSelector('.rd-text');
      const lay = await p.evaluate(() => { const t = document.querySelector('.rd-text'), f = document.querySelector('.rd-foot').getBoundingClientRect();
        return { textScroll: t.scrollHeight > t.clientHeight, footBottom: Math.round(f.bottom), vh: innerHeight, over: document.documentElement.scrollHeight - innerHeight }; });
      if (g === 3 && name === 'Pixel7') await p.screenshot({ path: process.argv[2] + '/passage-read.png' });
      await p.locator('.rd-foot .go').click(); await p.waitForSelector('.kl-choice');
      // 정답을 데이터에서 찾아 모두 맞히되, 글 다시 보기도 한 번 열어 본다
      await p.locator('.peek').click(); await p.waitForSelector('.peek-panel');
      const peekOk = await p.evaluate(() => document.querySelector('.peek-panel .box').textContent.length > 20);
      await p.locator('.peek-panel .x').click();
      if (g === 3 && name === 'Pixel7') await p.screenshot({ path: process.argv[2] + '/passage-q.png' });
      for (let k = 0; k < 6; k++) {
        const done = await p.evaluate(() => {
          const pr = document.querySelector('.kl-prompt:not([style])') || document.querySelectorAll('.kl-prompt')[1];
          return !document.querySelector('.kl-choice');
        });
        if (done) break;
        const idx = await p.evaluate(() => {
          const title = document.querySelector('main .kl-prompt').textContent.replace('📰 ', '');
          const P = window.PASSAGES.find(x => x.title === title);
          const qtext = document.querySelector('.kl-stage .kl-prompt').textContent;
          const q = P.q.find(q => qtext.indexOf(q[1]) >= 0);
          const btns = [...document.querySelectorAll('.kl-choice')];
          return btns.findIndex(b => b.textContent.slice(2) === q[2]);
        });
        await p.locator('.kl-choice').nth(idx).click(); await p.waitForTimeout(1050);
      }
      const res = await p.locator('.kl-result-score').textContent().catch(() => '없음');
      const peekLeft = await p.locator('.peek').count();
      out.push(menus[g].split(' (')[0] + ': 글스크롤 ' + lay.textScroll + ', 단추바닥 ' + lay.footBottom + '/' + lay.vh + ', 넘침 ' + lay.over + ', 다시보기 ' + peekOk + ', 결과 ' + res.trim().slice(0, 12) + ', 끝난뒤 다시보기단추 ' + peekLeft);
    }
    const best = await p.evaluate(() => JSON.stringify(KidLab.progress().best));
    console.log(name, '\n  ' + out.join('\n  '), '\n  기록', best, '| 오류', errs.length ? errs.join('/') : '없음');
    await ctx.close();
  }
  await b.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
