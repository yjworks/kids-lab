const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
/* L08 화면 크기: 손가락 기기에서 배율 단추대로 레이아웃 폭이 바뀌고(320 아래로 안 내려감), 두 손가락 확대는 막히고, PC는 그대로 */
(async () => {
  const b = await chromium.launch(); const out = [];
  for (const dev of ['Pixel 7', 'iPhone SE', 'iPad (gen 7)', 'Desktop Chrome']) {
    const c = await b.newContext(devices[dev]); const p = await c.newPage(); const e = []; p.on('pageerror', x => e.push(x.message));
    await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(300);
    const inp = p.locator('input').first(); if (await inp.count()) { await inp.fill('하늘'); const bt = p.locator('button').filter({ hasText: /시작|좋아|확인/ }).last(); if (await bt.count()) await bt.click(); } await p.waitForTimeout(300);
    const w = [];
    for (const s of [1, 1.3, 0.85, 1]) { await p.evaluate(s => { KidLab.setSetting('uiScale', s); KidLab.applyUiScale(); }, s); await p.waitForTimeout(250); w.push(await p.evaluate(() => document.documentElement.clientWidth + (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 ? '넘침' : ''))); }
    const pinch = await p.evaluate(() => { const t1 = new Touch({ identifier: 1, target: document.body, clientX: 100, clientY: 100 }), t2 = new Touch({ identifier: 2, target: document.body, clientX: 200, clientY: 200 }); const ev = new TouchEvent('touchmove', { touches: [t1, t2], cancelable: true, bubbles: true }); document.body.dispatchEvent(ev); return ev.defaultPrevented; });
    if (dev === 'Pixel 7') {
      /* 보호자 설정의 단추로 실제로 바꿔 본다 */
      await p.click('#parentBtn'); await p.waitForSelector('.panel');
      const q = await p.textContent('.panel p'); const mm = q.match(/(\d+) × (\d+)/); await p.fill('.panel input', String(mm[1] * mm[2])); await p.click('.panel .kl-btn'); await p.waitForSelector('.stat');
      const seg = p.locator('.panel .seg button'); const segN = await seg.count();
      await p.locator('.panel .seg button', { hasText: '아주 크게' }).click(); await p.waitForTimeout(300);
      const big = await p.evaluate(() => document.documentElement.clientWidth);
      const panelOk = await p.evaluate(() => { const q = document.querySelector('.panel').getBoundingClientRect(); return q.left >= -1 && q.right <= innerWidth + 1; });
      await p.locator('.panel .seg button', { hasText: '보통' }).click(); await p.waitForTimeout(300);
      const normal = await p.evaluate(() => document.documentElement.clientWidth);
      out.push('보호자 단추 ' + segN + '개 아주크게 ' + big + ' 보통 ' + normal + ' 창안 ' + panelOk);
    }
    out.push(dev + ' 폭 ' + w.join('/') + ' 두손가락막힘 ' + pinch + (e.length ? ' 오류 ' + e[0] : ''));
  }
  console.log(out.join('\n')); await b.close();
})();
