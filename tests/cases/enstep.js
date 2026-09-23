const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['Pixel 7'], locale:'ko-KR' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__cfgs = [];
    Object.defineProperty(window, 'KidLab', { configurable: true, set(v) { const o = v.runQuiz; v.runQuiz = function (c) { window.__cfgs.push(c); return o.apply(this, arguments); }; Object.defineProperty(window, 'KidLab', { value: v, writable: true, configurable: true }); } }); });
  for (let k = 0; k < 5; k++) {
    await p.goto('http://127.0.0.1:8765/apps/english/index.html');
    await p.locator('.kl-menu-item', {hasText:'영단어 단계'}).click(); await p.waitForTimeout(200);
    await p.locator('.kl-menu-item').nth(k).click(); await p.waitForTimeout(200);
    await p.locator('.kl-menu-item', {hasText:'낱말장'}).click(); await p.waitForTimeout(200);
    if (k===0||k===2) await p.screenshot({path: __dirname+'/en-list'+k+'.png'});
    await p.locator('.kl-back').click(); await p.waitForTimeout(200);
    await p.locator('.kl-menu-item', {hasText:'문제 풀기'}).click(); await p.waitForTimeout(400);
    await p.screenshot({path: __dirname+'/en-step'+k+'.png'});
    const r = await p.evaluate(() => { const cfg = window.__cfgs[window.__cfgs.length-1]; let n=0, bad=[]; const kinds={};
      for (let lv=1; lv<=5; lv++) for (let i=0;i<200;i++){ const q=cfg.make(i%8,lv); n++; kinds[q.key[0]]=(kinds[q.key[0]]||0)+1;
        const ch=q.choices; const h=ch.map(c=>String(c.html)); if (ch.filter(c=>c.correct).length!==1) bad.push('정답수'); if (new Set(h).size!==h.length) bad.push('중복 '+h);
        if (/undefined|null|NaN/.test(q.prompt+h.join()+(q.sub||''))) bad.push('빈값'); }
      return {n, bad:[...new Set(bad)].slice(0,3), kinds}; });
    // 실제로 몇 문제 풀어 끝내 보기
    for (let t=0;t<40;t++){ const c=p.locator('.kl-choice:not(.dim):not(.right)'); const cnt=await c.count(); if(!cnt) break; await c.nth(0).click({force:true}).catch(()=>{}); await p.waitForTimeout(150); }
    console.log('step', k+1, JSON.stringify(r));
  }
  console.log('errs', errs); await b.close();
})();
