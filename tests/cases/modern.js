const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path'), os = require('os'), { spawn, execSync } = require('child_process');
/* L10 최신 기능: 새 버전 자동 적용(앱 창이 열려 있으면 닫을 때까지 미룸)·화면 꺼짐 방지(앱 창 안에서 만져도 바깥이 잠금)·기록 보존 상태 */
(async () => {
  const ROOT = path.resolve(__dirname, '../..');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kl-'));
  execSync('git -C "' + ROOT + '" ls-files -z | xargs -0 -I{} cp --parents {} "' + tmp + '"', { shell: '/bin/bash' });
  const srv = spawn('python3', ['-m', 'http.server', '8799'], { cwd: tmp, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  const out = [];
  const b = await chromium.launch(); const c = await b.newContext(devices['Pixel 7']);
  await c.addInitScript(() => {
    window.__wake = 0;
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: () => { window.__wake++; return Promise.resolve({ release() { }, addEventListener() { } }); } } });
  });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8799/index.html'); await p.waitForTimeout(500);
  const inp = p.locator('input').first(); if (await inp.count()) { await inp.fill('하늘'); const bt = p.locator('button').filter({ hasText: /시작|좋아|확인/ }).last(); if (await bt.count()) await bt.click(); }
  await p.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 15000 }).catch(() => { });
  out.push('서비스워커 ' + (await p.evaluate(() => !!navigator.serviceWorker.controller)));
  /* 화면 꺼짐 방지: 앱 창 안을 누른다 */
  await p.locator('.app-icon').first().click(); await p.waitForTimeout(600);
  const fr = p.frameLocator('.win iframe'); await fr.locator('.kl-menu-item').first().click(); await p.waitForTimeout(300);
  out.push('화면잠금 요청 ' + (await p.evaluate(() => window.__wake)));
  /* 새 버전 배포 흉내: 앱 창이 열린 채로 캐시 버전을 올린다 */
  await p.evaluate(() => { window.__marker = 1; });
  const sw = path.join(tmp, 'sw.js'); fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace(/kidlab-v(\d+)/, (m, n) => 'kidlab-v' + (+n + 1)));
  await p.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
  await p.waitForTimeout(4000);
  out.push('앱 창 열린 동안 새로고침 안 함 ' + (await p.evaluate(() => window.__marker === 1)));
  await p.locator('.win .close').click();
  await p.waitForFunction(() => window.__marker !== 1, null, { timeout: 8000 }).catch(() => { });
  await p.waitForTimeout(1200);
  out.push('창 닫자 새 버전 적용 ' + (await p.evaluate(() => window.__marker !== 1)) + ' · 안내 ' + (await p.locator('.kl-toast').count() > 0));
  /* 기록 보존 상태 */
  await p.click('#parentBtn'); await p.waitForSelector('.panel');
  const q = await p.textContent('.panel p'); const mm = q.match(/(\d+) × (\d+)/); await p.fill('.panel input', String(mm[1] * mm[2])); await p.click('.panel .kl-btn'); await p.waitForSelector('.stat');
  await p.waitForTimeout(400);
  const row = await p.locator('.panel .toggle', { hasText: '기록 보존' }).innerText().catch(() => '없음');
  out.push('기록 보존 줄: ' + row.replace(/\s+/g, ' '));
  out.push('오류: ' + (errs.length ? errs.join(' / ') : '없음'));
  console.log(out.join('\n'));
  await b.close(); srv.kill(); fs.rmSync(tmp, { recursive: true, force: true });
})();
