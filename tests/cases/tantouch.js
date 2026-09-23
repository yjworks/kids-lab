const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['Pixel 7'] }); const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
const res = [];
for (const i of [2, 5]) {
await p.goto('http://127.0.0.1:8765/apps/space/index.html'); await p.locator('.kl-menu-item').nth(2).click(); await p.locator('.tan-card').nth(i).click(); await p.waitForTimeout(300);
for (let k = 0; k < 6; k++) {
 const j = await p.evaluate(() => { const svg = document.querySelector('.tan-svg'); const g = [...svg.querySelectorAll('.piece')].find(x => x.style.cursor !== 'default'); if (!g) return null; const pp = g.getAttribute('points'); const sil = [...svg.querySelectorAll('g polygon')].filter(x => x.getAttribute('points') === pp && !x.dataset.u)[0]; sil.dataset.u = 1; const r = g.getBoundingClientRect(), s = sil.getBoundingClientRect();
  let pt = null; for (let a = 0.2; a <= 0.8 && !pt; a += 0.1) for (let c = 0.2; c <= 0.8; c += 0.1) { const x = r.left + r.width * a, y = r.top + r.height * c; if (document.elementFromPoint(x, y) === g) { pt = [x, y]; break; } }
  return { pt, dx: s.left - r.left, dy: s.top - r.top }; });
 if (!j) break;
 const tp = (x, y) => [{ x, y, id: 1 }];
 await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(j.pt[0], j.pt[1]) });
 for (let s = 1; s <= 8; s++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(j.pt[0] + j.dx * s / 8, j.pt[1] + j.dy * s / 8) });
 await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(150);
}
res.push(i + ':' + await p.locator('.tan-wrap .kl-sub').textContent() + ' scroll=' + await p.evaluate(() => scrollY));
}
await p.screenshot({ path: __dirname + '/tan-done-phone.png' });
console.log(res.join(' | ')); await b.close(); })();
