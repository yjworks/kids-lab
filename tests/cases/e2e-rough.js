const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
/* I19 아이 손글씨: 삐뚤빼뚤·덜 긋기·순서 거꾸로 쓴 글씨가 실제 앱에서 통과하는지 */
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'], locale: 'ko-KR' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  /* 아이 손글씨 흉내: 획마다 옆으로 치우침(글자 100 기준), 손떨림, 획 끝 덜 긋기, 순서·방향 거꾸로.
     매번 같은 결과가 나오게 난수 씨앗을 고정한다 */
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  function rough(S, off, wob, trim, reverse, dens) {
    let out = S.map(st => {
      const pts = []; for (let i = 1; i < st.length; i++) { const a = st[i-1], b = st[i]; const n = Math.max(2, Math.ceil(Math.hypot(b[0]-a[0], b[1]-a[1]) / (dens || 4))); for (let k = 0; k < n; k++) pts.push([a[0] + (b[0]-a[0])*k/n, a[1] + (b[1]-a[1])*k/n]); }
      pts.push(st[st.length-1]);
      const cut = Math.floor(pts.length * trim / 2), seg = pts.slice(cut, Math.max(cut + 2, pts.length - cut));
      const ang = rnd() * Math.PI * 2, dx = Math.cos(ang) * off, dy = Math.sin(ang) * off;
      let q = seg.map(p => [p[0] + dx + (rnd()*2-1) * wob, p[1] + dy + (rnd()*2-1) * wob]);
      if (reverse) q = q.reverse();
      return q;
    });
    if (reverse) out = out.reverse();
    return out;
  }
  const CASES = {
    /* 손가락으로 천천히 그으면 터치 점이 0.8칸 간격으로 촘촘하다. 예전 판정은 이것을 거의 다 놓쳤다 */
    '손가락처럼 촘촘하게': S => rough(S, 4, 1, 0.05, false, 0.8),
    '조금 삐뚤게': S => rough(S, 6, 3, 0.10, false),
    '많이 삐뚤게': S => rough(S, 9, 4, 0.18, false),
    '가장자리에 붙여': S => rough(S, 13, 3, 0.12, false),
    '작게 쓰기': S => rough(S.map(st => st.map(q => [50 + (q[0]-50)*0.8, 50 + (q[1]-50)*0.8])), 5, 3, 0.1, false),
    '순서·방향 거꾸로': S => rough(S, 7, 3, 0.10, true)
  };

  const SETS = [['hangul',0,'cons'], ['english',0,'upper'], ['math',-1,'digits']];
  const tally = {}; for (const c of Object.keys(CASES)) tally[c] = [0,0];
  for (const [app, subIdx, setId] of SETS) {
    await p.goto('http://127.0.0.1:8765/apps/' + app + '/index.html');
    await p.waitForSelector('.kl-menu-item');
    const names = await p.$$eval('.kl-menu-item', e => e.map(x => x.textContent));
    await p.locator('.kl-menu-item').nth(names.findIndex(t => t.indexOf('따라 쓰기') >= 0)).tap();
    await p.waitForTimeout(350);
    if (subIdx >= 0) { await p.locator('.kl-menu-item').nth(subIdx).tap(); await p.waitForTimeout(350); }
    await p.waitForSelector('.pick button');
    const n = Math.min(8, await p.$$eval('.pick button', e => e.length));
    for (let i = 0; i < n; i++) {
      await p.locator('.pick button').nth(i).tap();
      await p.waitForSelector('.sheet canvas.ink'); await p.waitForTimeout(900);
      const info = await p.evaluate((sid) => { const ch = document.querySelector('.cur').textContent.trim().split(' ')[0];
        const s = document.querySelector('.sheet').getBoundingClientRect();
        return { ch, box:{x:s.left,y:s.top,w:s.width,h:s.height}, strokes: window.GLYPHS[sid][ch] }; }, setId);
      for (const [name, fn] of Object.entries(CASES)) {
        const drawn = fn(info.strokes); if (!drawn) continue;
        await p.locator('.bar button:has-text("지우기")').tap({timeout:4000}).catch(()=>{});
        await p.waitForTimeout(120);
        for (const st of drawn) {
          const at = k => [info.box.x + info.box.w * st[k][0]/100, info.box.y + info.box.h * st[k][1]/100];
          let q = at(0); await p.mouse.move(q[0], q[1]); await p.mouse.down();
          for (let k = 1; k < st.length; k++) { q = at(k); await p.mouse.move(q[0], q[1]); }
          await p.mouse.up();
        }
        await p.locator('.bar button:has-text("다 썼어요")').tap({timeout:4000}).catch(()=>{});
        await p.waitForTimeout(380);
        const v = await p.evaluate(() => document.querySelector('.verdict').textContent);
        const passed = v.indexOf('잘 썼어요') >= 0 || v.indexOf('잘했어요') >= 0;
        tally[name][1]++; if (passed) tally[name][0]++;
        /* 통과하면 앱이 다음 글자로 넘어가므로, 매번 글자 고르기로 돌아가 같은 글자를 다시 연다 */
        await p.waitForTimeout(passed ? 2000 : 50);   /* 축하 효과가 끝나고 다음 글자로 넘어간 뒤 */
        await p.locator('.kl-back').first().click({ force: true, timeout: 4000 }).catch(()=>{});
        await p.waitForSelector('.pick button');
        await p.locator('.pick button').nth(i).click({ force: true });
        await p.waitForSelector('.sheet canvas.ink'); await p.waitForTimeout(700);
      }
      // 글자 고르기로 돌아간다
      await p.locator('.kl-back').first().tap({timeout:4000}).catch(()=>{});
      await p.waitForSelector('.pick button');
    }
  }
  console.log('아이 글씨가 통과하는 비율 (높을수록 좋음)');
  for (const [k, v] of Object.entries(tally)) console.log('  ' + k.padEnd(14), (v[0]/Math.max(1,v[1])*100).toFixed(0) + '% (' + v[0] + '/' + v[1] + ')');
  console.log('오류:', errs.length ? errs.slice(0,3).join(' | ') : '없음');
  await b.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
