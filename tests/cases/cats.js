const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  for (const [name, opt] of [['phone', { ...devices['Pixel 7'] }], ['pc', { viewport: { width: 1366, height: 768 } }]]) {
    const ctx = await b.newContext({ ...opt, locale: 'ko-KR' });
    await ctx.addInitScript(() => { try { if (!localStorage.getItem('kidlab.meta')) {} } catch (e) {} });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(500);
    const inp = p.locator('.overlay input'); if (await inp.count()) { await inp.fill('테스트'); await p.locator('.overlay .kl-btn.primary').click(); await p.waitForTimeout(300); }
    const heads = await p.$$eval('.cat-head', e => e.map(x => x.textContent));
    const icons = await p.$$eval('#icons .app-icon', e => e.length);
    await p.evaluate(() => document.querySelector('#icons').scrollIntoView());
    await p.screenshot({ path: __dirname + '/cats-' + name + '.png' });
    const per = [];
    for (const c of await p.$$eval('#cats button', e => e.map(x => x.textContent))) {
      await p.locator('#cats button', { hasText: c }).first().click(); await p.waitForTimeout(100);
      per.push(c + ':' + await p.$$eval('#icons .app-icon', e => e.length) + (await p.$$eval('.cat-head', e => e.length) ? 'h' : ''));
    }
    // 우리말 탭에서 새 앱 열기
    await p.locator('#cats button', { hasText: '한자·고전' }).click();
    await p.locator('.app-icon', { hasText: '고전 한 문장' }).click(); await p.waitForTimeout(800);
    const fr = p.frameLocator('iframe[src*="classic"]'); const n = await fr.locator('.kl-menu-item').count();
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log(name, 'heads', heads.join('|'), 'icons', icons, per.join(' '), 'classic menus', n, 'ov', ov, 'errs', errs);
    await ctx.close();
  }
  await b.close();
})();
