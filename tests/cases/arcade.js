const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  for (const [name, dev] of [['Pixel7', devices['Pixel 7']], ['desktop', { viewport:{width:1280,height:800} }], ['landscape', { viewport:{width:740,height:360}, isMobile:true, hasTouch:true }]]) {
    const ctx = await b.newContext({ ...dev, locale:'ko-KR' });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    const out = [];
    // --- 낚시: 정답 물고기를 찾아 탭 (틀린 것 한 번 포함)
    await p.goto('http://127.0.0.1:8765/apps/arcade/index.html'); await p.waitForSelector('.kl-menu-item');
    await p.locator('.kl-menu-item', { hasText: '낚시' }).click(); await p.waitForSelector('.fish');
    let wrongOnce = false;
    for (let k = 0; k < 40; k++) {
      if (await p.locator('.kl-result').count()) break;
      const t = await p.evaluate(() => document.querySelector('.target')?.textContent);
      const tags = await p.$$eval('.fish .tag', e => e.map(x => x.textContent));
      // 4단계는 그림이 나오므로 단어 창고에서 거꾸로 찾는다
      let want = t;
      const pic = await p.evaluate((tt) => { const w = WordBank.list.find(x => x.pic === tt); return w ? w.word : null; }, t);
      if (pic) want = pic;
      if (/\+/.test(t)) want = String(eval(t));
      let idx = tags.indexOf(want);
      if (!wrongOnce) { const wi = tags.findIndex(x => x !== want); if (wi >= 0) { await p.locator('.fish').nth(wi).dispatchEvent('pointerdown'); wrongOnce = true; await p.waitForTimeout(1000); continue; } }
      if (idx < 0) { await p.waitForTimeout(300); continue; }
      await p.locator('.fish').nth(idx).dispatchEvent('pointerdown'); await p.waitForTimeout(1400);
    }
    out.push('낚시 ' + (await p.locator('.kl-result-title').textContent().catch(() => '미완')));
    // --- 두더지: 30초 동안 정답만 친다
    await p.goto('http://127.0.0.1:8765/apps/arcade/index.html'); await p.waitForSelector('.kl-menu-item');
    await p.locator('.kl-menu-item', { hasText: '두더지' }).click(); await p.waitForSelector('.mole');
    const t0 = Date.now();
    while (Date.now() - t0 < 32000) {
      if (await p.locator('.kl-result').count()) break;
      await p.evaluate(() => {
        const t = document.querySelector('.target').textContent;
        document.querySelectorAll('.mole.up:not(.hit)').forEach(m => { if (m.querySelector('.tag').textContent === t) m.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
      });
      await p.waitForTimeout(200);
    }
    out.push('두더지 ' + (await p.locator('.kl-result-title').textContent().catch(() => '미완')));
    // --- 인형뽑기: 공짜 한 판, 가장 가까운 인형 위로 옮겨서 내리기
    await p.goto('http://127.0.0.1:8765/apps/arcade/index.html'); await p.waitForSelector('.kl-menu-item');
    await p.locator('.kl-menu-item', { hasText: '인형뽑기' }).click(); await p.waitForSelector('.claw');
    const starsBefore = await p.evaluate(() => KidLab.data().stars);
    // 오른쪽 버튼을 잠깐 눌렀다 뗀다
    const r = p.locator('.ar-ctl button', { hasText: '▶' });
    await r.dispatchEvent('pointerdown'); await p.waitForTimeout(500); await r.dispatchEvent('pointerup');
    const pos = await p.evaluate(() => document.querySelector('.claw').style.left);
    await p.locator('.ar-ctl button.go').click();
    await p.waitForSelector('.ar-ctl button:has-text("한 판 더")', { timeout: 15000 });
    const res = await p.evaluate(() => document.querySelector('.ar-info').textContent);
    await p.screenshot({ path: `${process.argv[2]}/arcade-claw-${name}.png` });
    out.push('인형뽑기 집게위치 ' + pos + ' → ' + res);
    // 두 번째 판은 별이 든다
    const stars1 = await p.evaluate(() => KidLab.data().stars);
    await p.locator('.ar-ctl button', { hasText: '한 판 더' }).click(); await p.waitForTimeout(400);
    const stars2 = await p.evaluate(() => KidLab.data().stars);
    out.push('둘째 판 별 ' + stars1 + '→' + stars2);
    const over = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    console.log(name.padEnd(9), out.join(' | '), '| 세로넘침', over, '| 오류', errs.length ? errs.join('/') : '없음');
    await ctx.close();
  }
  await b.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
