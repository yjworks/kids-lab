const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
/* 실제 앱에서 마우스로 직접 그려 100자를 전부 확인한다.
   흉내낸 판정식이 아니라 앱이 실제로 내리는 판정을 읽는다. */
const ALL = [
  ['hangul', 0, 'cons'], ['hangul', 1, 'vow'], ['hangul', 2, 'syl'],
  ['english', 0, 'upper'], ['english', 1, 'lower'],
  ['math', -1, 'digits'], ['batchim', -1, 'bat'], ['hanja', -1, 'hanja']
];
const ONLY = process.argv[2] ? process.argv[2].split(',') : null;
const SETS = ONLY ? ALL.filter(x => ONLY.includes(x[2])) : ALL;
const STYLE = { jitter: +(process.env.JIT || 3), offset: +(process.env.OFF || 4) };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'], locale: 'ko-KR' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  const fails = [];
  let total = 0, pass = 0;

  for (const [app, subIdx, setId] of SETS) {
    await p.goto('http://127.0.0.1:8765/apps/' + app + '/index.html');
    await p.waitForSelector('.kl-menu-item');
    const items = await p.$$('.kl-menu-item');
    const n0 = await p.$$eval('.kl-menu-item', e => e.map(x => x.textContent));
    const ti = n0.findIndex(t => t.indexOf('따라 쓰기') >= 0 || t.indexOf('글자 쓰기') >= 0);
    await p.locator('.kl-menu-item').nth(ti).tap();
    await p.waitForTimeout(350);
    if (subIdx >= 0) { await p.locator('.kl-menu-item').nth(subIdx).tap(); await p.waitForTimeout(350); }
    await p.waitForSelector('.pick button');
    const count = await p.$$eval('.pick button', e => e.length);
    await p.locator('.pick button').first().tap();
    await p.waitForSelector('.sheet canvas.ink');

    for (let i = 0; i < count; i++) {
      // 지우기를 눌러 시범을 끊고 깨끗한 상태에서 시작한다 (타이밍에 기대지 않는다)
      await p.waitForTimeout(900);
      await p.locator('.bar button:has-text("지우기")').tap({ timeout: 5000 }).catch(() => {});
      await p.waitForTimeout(200);
      const info = await p.evaluate((sid) => {
        const t = document.querySelector('.cur'); if (!t) return null;
        const ch = t.textContent.trim().split(' ')[0];
        const s = document.querySelector('.sheet').getBoundingClientRect();
        return { ch: ch, box: { x: s.left, y: s.top, w: s.width, h: s.height },
                 strokes: window.GLYPHS[sid][ch] || null };
      }, setId);
      if (!info || !info.strokes) { fails.push(setId + ' ?? 글자 못 읽음'); continue; }
      const { ch, box, strokes } = info;
      const dx = (Math.random() * 2 - 1) * STYLE.offset, dy = (Math.random() * 2 - 1) * STYLE.offset;
      for (const st of strokes) {
        const at = k => [box.x + box.w * ((st[k][0] + dx + (Math.random()*2-1)*STYLE.jitter) / 100),
                         box.y + box.h * ((st[k][1] + dy + (Math.random()*2-1)*STYLE.jitter) / 100)];
        let q = at(0); await p.mouse.move(q[0], q[1]); await p.mouse.down();
        for (let k = 1; k < st.length; k++) { q = at(k); await p.mouse.move(q[0], q[1]); }
        await p.mouse.up();
      }
      await p.locator('.bar button:has-text("다 썼어요")').tap({ timeout: 5000 }).catch(() => {});
      await p.waitForTimeout(450);
      const v = await p.evaluate(() => document.querySelector('.verdict').textContent);
      total++;
      const ok = v.indexOf('잘 썼어요') >= 0 || v.indexOf('잘했어요') >= 0;
      if (ok) pass++; else fails.push(setId + ' ' + ch + ' → ' + v);
      if (ok) { await p.waitForTimeout(1900); }              // 저절로 다음 글자로 넘어간다
      else { await p.locator('.bar button:has-text("▶")').tap({ timeout: 5000 }).catch(() => {}); await p.waitForTimeout(400); }
    }
  }
  console.log('실제로 그려 본 글자:', total, '· 통과:', pass, '(' + (pass/total*100).toFixed(0) + '%)');
  if (fails.length) { console.log('통과 못한 글자 ' + fails.length + '자:'); fails.forEach(f => console.log('  ' + f)); }
  console.log('오류:', errs.length ? errs.slice(0,3).join(' | ') : '없음');
  await b.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
