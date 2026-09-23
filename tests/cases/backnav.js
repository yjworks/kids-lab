const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['Pixel 7'], locale: 'ko-KR' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://127.0.0.1:8765/apps/hangul/index.html'); // 이전 페이지 (나가면 여기로 돌아와야 함)
await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(400);
const inp = p.locator('.overlay input'); if (await inp.count()) { await inp.fill('테스트'); await p.locator('.overlay .kl-btn.primary').click(); await p.waitForTimeout(300); }
const log = [];
const state = async () => p.evaluate(() => { const w = [...document.querySelectorAll('.win')].filter(x => !x.classList.contains('min')); const f = w.length ? w[w.length - 1].querySelector('iframe') : null; let inner = ''; try { const d = f && f.contentDocument; inner = d ? (d.querySelector('.kl-choice') ? '퀴즈' : d.querySelector('.kl-menu-item') ? '앱메뉴' : '기타') : ''; } catch (e) {} return (location.pathname) + ' 창' + w.length + (inner ? '(' + inner + ')' : '') + ' 겹창' + document.querySelectorAll('.overlay').length; });
log.push('시작: ' + await state());
await p.locator('.app-icon', { hasText: '한글 놀이' }).first().click(); await p.waitForTimeout(800);
const fr = p.frameLocator('.win iframe'); await fr.locator('.kl-menu-item').first().click(); await p.waitForTimeout(500);
log.push('앱 퀴즈: ' + await state());
for (let i = 0; i < 4; i++) { await p.evaluate(() => history.back()); await p.waitForTimeout(500); log.push('뒤로' + (i + 1) + ': ' + await state()); }
// 미션 창 열고 뒤로
await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(400);
await p.locator('#missionBtn, button:has-text("0/4"), .top button').filter({ hasText: '/4' }).first().click().catch(() => {}); await p.waitForTimeout(300);
log.push('미션창: ' + await state()); await p.evaluate(() => history.back()); await p.waitForTimeout(400); log.push('뒤로: ' + await state());
// 아이콘 확인
log.push('svg 아이콘 ' + await p.$$eval('.app-icon .svgic', e => e.map(x => x.naturalWidth > 0).join(',')));
await p.locator('.app-icon', { hasText: '받침 놀이' }).first().click(); await p.waitForTimeout(800);
await p.screenshot({ path: __dirname + '/icon-win.png' });
log.push('창 제목 아이콘 ' + await p.$$eval('.win .bar .svgic', e => e.length) + ' / 앱 머리말 ' + await p.frameLocator('.win iframe').locator('.kl-svgicon').count());
await p.evaluate(() => document.querySelectorAll('.win').forEach(w => w.remove()));
await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(400); await p.screenshot({ path: __dirname + '/icon-home.png' });
console.log(log.join('\n'), '\n오류', errs); await b.close(); })();
