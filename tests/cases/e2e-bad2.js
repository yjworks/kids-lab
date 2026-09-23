const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
/* 실제 앱에서 낙서·대충 그리기가 막히는지 확인 */
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'], locale: 'ko-KR' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  const CASES = {
    '대각선 낙서': () => [[[10,10],[90,90]],[[90,10],[10,90]]],
    '지그재그 낙서': () => { const st=[]; for(let y=12;y<92;y+=9){st.push([12,y]);st.push([88,y+4]);} return [st]; },
    '글자 위 마구칠': S => { const pts=S.flat(),xs=pts.map(q=>q[0]),ys=pts.map(q=>q[1]);
      const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
      const out=[]; for(let k=0;k<6;k++){const st=[];for(let i=0;i<5;i++)st.push([x0+Math.random()*(x1-x0),y0+Math.random()*(y1-y0)]);out.push(st);} return out; },
    '전체 칠하기': () => { const out=[]; for(let y=12;y<92;y+=6)out.push([[10,y],[90,y]]); return out; },
    '점 하나': () => [[[50,50],[53,53]]],
    '길이 절반만': S => S.map(st => {
      /* 획 길이의 딱 절반 지점까지 긋는다 (점 두 개짜리 직선도 중간에서 멈춘다) */
      const seg = []; let L = 0; for (let i = 1; i < st.length; i++) { const d = Math.hypot(st[i][0]-st[i-1][0], st[i][1]-st[i-1][1]); seg.push(d); L += d; }
      const half = L / 2, out = [st[0]]; let acc = 0;
      for (let i = 1; i < st.length; i++) { if (acc + seg[i-1] >= half) { const t = (half - acc) / seg[i-1]; out.push([st[i-1][0] + (st[i][0]-st[i-1][0])*t, st[i-1][1] + (st[i][1]-st[i-1][1])*t]); break; } acc += seg[i-1]; out.push(st[i]); }
      return out; }),
    '획 하나 빠뜨림': S => S.length > 1 ? S.slice(0, S.length-1) : null
  };
  const SETS = [['batchim',-1,'bat'], ['hanja',-1,'hanja']];
  const tally = {}; for (const c of Object.keys(CASES)) tally[c] = [0,0];
  for (const [app, subIdx, setId] of SETS) {
    await p.goto('http://127.0.0.1:8765/apps/' + app + '/index.html');
    await p.waitForSelector('.kl-menu-item');
    const names = await p.$$eval('.kl-menu-item', e => e.map(x => x.textContent));
    await p.locator('.kl-menu-item').nth(names.findIndex(t => t.indexOf('따라 쓰기') >= 0 || t.indexOf('글자 쓰기') >= 0)).tap();
    await p.waitForTimeout(350);
    if (subIdx >= 0) { await p.locator('.kl-menu-item').nth(subIdx).tap(); await p.waitForTimeout(350); }
    await p.waitForSelector('.pick button');
    const n = Math.min(12, await p.$$eval('.pick button', e => e.length));
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
        if (passed) await p.waitForTimeout(1800);
      }
      // 글자 고르기로 돌아간다
      await p.locator('.kl-back').first().tap({timeout:4000}).catch(()=>{});
      await p.waitForSelector('.pick button');
    }
  }
  console.log('낙서·대충 그리기가 통과하는 비율 (낮을수록 좋음)');
  for (const [k, v] of Object.entries(tally)) console.log('  ' + k.padEnd(14), (v[0]/Math.max(1,v[1])*100).toFixed(0) + '% (' + v[0] + '/' + v[1] + ')');
  console.log('오류:', errs.length ? errs.slice(0,3).join(' | ') : '없음');
  await b.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
