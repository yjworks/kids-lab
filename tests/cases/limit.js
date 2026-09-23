const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'], locale:'ko-KR' });
  const p = await ctx.newPage(); const errs=[];
  p.on('pageerror', e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html');
  await p.waitForSelector('.panel'); await p.fill('input[type=text]','이정우'); await p.click('.kl-btn.primary');
  await p.waitForSelector('.app-icon');
  await p.evaluate(() => { KidLab.setSetting('limitMin', 1); KidLab.addUsage(180); });
  await p.locator('.app-icon').first().click(); await p.waitForTimeout(400);
  const locked = await p.evaluate(() => !!document.getElementById('limitLock'));
  const openedWin = await p.evaluate(() => document.querySelectorAll('.win').length);
  // 부모 해제
  const q = await p.evaluate(() => document.querySelector('#limitLock p:nth-of-type(2)').textContent);
  const m = q.match(/(\d+) × (\d+)/);
  await p.fill('#limitLock input', String(+m[1]*+m[2]));
  await p.click('#limitLock .kl-btn.primary'); await p.waitForTimeout(300);
  const unlocked = await p.evaluate(() => !!document.getElementById('limitLock'));
  await p.locator('.app-icon').first().click(); await p.waitForTimeout(500);
  const winAfter = await p.evaluate(() => document.querySelectorAll('.win').length);
  console.log('제한 도달 시 잠김:', locked, '| 창 열림 막힘:', openedWin === 0, '| 부모 해제 후 잠금 사라짐:', !unlocked, '| 해제 후 앱 열림:', winAfter === 1);
  await p.evaluate(() => KidLab.setSetting('limitMin', 0));
  console.log('오류:', errs.length?errs.join('|'):'없음');
  await b.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1)});
