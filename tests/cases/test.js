const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'ko-KR' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
  const base = 'http://127.0.0.1:8765/';
  await page.goto(base + 'index.html');
  await page.waitForSelector('.panel');
  await page.fill('input[type=text]', '테스트');
  await page.click('.kl-btn.primary');
  await page.waitForSelector('.app-icon');
  const icons = await page.$$eval('.app-icon .nm', els => els.map(e => e.textContent));
  console.log('launcher icons:', icons.length, icons.join(','));
  // open first app via launcher window, check iframe loads, then close via X
  await page.click('.app-icon');
  await page.waitForSelector('.win iframe');
  await page.waitForTimeout(800);
  console.log('window opened, tasks:', await page.$$eval('.task', t => t.length));
  await page.click('.win .close');
  console.log('after close tasks:', await page.$$eval('.task', t => t.length));
  // missions panel, sticker panel, parent panel
  await page.click('#missionBtn'); await page.waitForSelector('.mission'); console.log('missions:', await page.$$eval('.mission', m => m.length)); await page.click('.panel .close');
  await page.click('#stickerBtn'); await page.waitForSelector('.sticker'); await page.click('.panel .close');
  await page.click('#parentBtn'); await page.waitForSelector('.panel');
  const qtext = await page.textContent('.panel p'); const mm = qtext.match(/(\d+) × (\d+)/); await page.fill('.panel input', String(mm[1] * mm[2])); await page.click('.panel .kl-btn'); await page.waitForSelector('.stat'); console.log('parent panel stats:', await page.$$eval('.stat', s => s.length)); await page.click('.panel .close');
  // now each app directly: click every menu item, then click choices until round ends or 40 clicks
  const apps = require('fs').readdirSync('/home/user/kids-lab/apps');
  for (const app of apps) {
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(base + 'apps/' + app + '/index.html');
    await p.waitForSelector('.kl-header');
    const n = await p.$$eval('.kl-menu-item', b => b.length);
    let played = 0;
    for (let i = 0; i < n; i++) {
      await p.goto(base + 'apps/' + app + '/index.html'); await p.waitForSelector('.kl-menu-item');
      const items = await p.$$('.kl-menu-item'); if (!items[i]) break;
      await items[i].click(); await p.waitForTimeout(300);
      // click choices / buttons blindly
      for (let k = 0; k < 40; k++) {
        const ch = await p.$$('.kl-choice:not(.dim):not(.right)');
        if (ch.length) { await ch[Math.floor(Math.random() * ch.length)].click({ force: true }).catch(() => {}); await p.waitForTimeout(120); played++; continue; }
        break;
      }
      await p.waitForTimeout(200);
    }
    const stars = await p.evaluate(() => KidLab.data().stars);
    console.log(app.padEnd(9), 'menus=' + n, 'clicks=' + played, 'stars=' + stars, errs.length ? 'ERRORS: ' + errs.join(' | ') : 'ok');
    await p.close();
  }
  console.log('launcher errors:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
