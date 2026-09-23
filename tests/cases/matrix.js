const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const UA = devices['Pixel 7'].userAgent;
const CASES = [
  ['PC 1920x1080',  {viewport:{width:1920,height:1080}}, 'pc'],
  ['PC 1440x900',   {viewport:{width:1440,height:900}}, 'pc'],
  ['노트북 1366x768',{viewport:{width:1366,height:768}}, 'pc'],
  ['노트북 1280x800',{viewport:{width:1280,height:800}}, 'pc'],
  ['태블릿 820x1180',{viewport:{width:820,height:1180},isMobile:true,hasTouch:true,userAgent:UA}, 'touch'],
  ['폰 412x839',    {...devices['Pixel 7']}, 'touch'],
  ['폰 390x844',    {...devices['iPhone 12']}, 'touch'],
  ['폰 360x740',    {viewport:{width:360,height:740},isMobile:true,hasTouch:true,userAgent:UA}, 'touch'],
  ['폰 320x658',    {viewport:{width:320,height:658},isMobile:true,hasTouch:true,userAgent:UA}, 'touch'],
  ['폰 가로 740x360',{viewport:{width:740,height:360},isMobile:true,hasTouch:true,userAgent:UA}, 'touch'],
];
(async () => {
  const b = await chromium.launch();
  const rows = [];
  for (const [name, dev, kind] of CASES) {
    const ctx = await b.newContext({ ...dev, locale:'ko-KR' });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
    const tap = async (sel) => kind==='touch' ? p.tap(sel) : p.click(sel);
    await p.goto('http://127.0.0.1:8765/index.html');
    await p.waitForSelector('.panel');
    await p.fill('input[type=text]','이정우'); await tap('.kl-btn.primary');
    await p.waitForSelector('.app-icon');

    const shell = await p.evaluate(() => {
      const tb=document.getElementById('topbar'), ds=document.getElementById('desktop'), bb=document.getElementById('taskbar');
      const pills=[...tb.querySelectorAll('.pill')].filter(e=>getComputedStyle(e).display!=='none');
      const overlap = pills.some((a,i)=> pills.slice(i+1).some(c=>{
        const r1=a.getBoundingClientRect(), r2=c.getBoundingClientRect();
        return r1.right > r2.left+1 && r2.right > r1.left+1 && r1.bottom > r2.top+1 && r2.bottom > r1.top+1; }));
      return { barsFit: tb.offsetHeight + ds.offsetHeight + bb.offsetHeight <= innerHeight+1,
        topbarScrollOverflow: tb.scrollWidth - tb.clientWidth,
        clipped: pills.filter(e=>e.offsetHeight > tb.clientHeight-2).length,
        pillOverlap: overlap, pageOverflowX: document.documentElement.scrollWidth - innerWidth,
        iconsPerRow: (()=>{const g=document.getElementById('icons'); return getComputedStyle(g).gridTemplateColumns.split(' ').length;})() };
    });

    // 앱 실행 → 문제 풀이 → 별 반영 → 닫기
    await tap('.app-icon:nth-child(3)');                 // 수학 놀이
    await p.waitForSelector('.win iframe'); await p.waitForTimeout(700);
    const win = await p.evaluate(() => { const w=document.querySelector('.win'), r=w.getBoundingClientRect();
      const tb=document.getElementById('topbar').offsetHeight, bb=document.getElementById('taskbar').offsetHeight;
      return { fits: r.top>=tb-1 && r.bottom<=innerHeight-bb+1 && r.left>=-1 && r.right<=innerWidth+1,
        w:Math.round(r.width), h:Math.round(r.height) }; });
    const fr = p.frames().find(f=>f.url().includes('/apps/'));
    await fr.waitForSelector('.kl-menu-item');
    const items = await fr.$$('.kl-menu-item');
    kind==='touch' ? await items[1].tap() : await items[1].click();
    await p.waitForTimeout(400);
    let solved = 0;
    for (let i=0;i<60;i++){
      const ch = await fr.$$('.kl-choice:not(.dim):not(.right)'); if(!ch.length) break;
      const t = ch[Math.floor(Math.random()*ch.length)];
      kind==='touch' ? await t.tap().catch(()=>{}) : await t.click({force:true}).catch(()=>{});
      solved++; await p.waitForTimeout(110);
    }
    const appOverflow = await fr.evaluate(()=>({
      x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      choiceMin: Math.min(...[...document.querySelectorAll('.kl-choice')].map(e=>e.offsetHeight).concat([999])) }));
    const starSynced = (await p.textContent('#starPill')).replace(/\D/g,'') === String(await fr.evaluate(()=>KidLab.data().stars));
    await tap('.win .close'); await p.waitForTimeout(300);
    const closed = (await p.$$('.win')).length === 0;

    // 데스크톱은 창 복원/드래그도 확인
    let drag = 'n/a';
    if (kind === 'pc') {
      await p.click('.app-icon'); await p.waitForSelector('.win'); await p.waitForTimeout(400);
      await p.click('.win .maxbtn'); await p.waitForTimeout(200);
      const before = await p.evaluate(()=>document.querySelector('.win').getBoundingClientRect().left);
      const bar = await p.$('.win .bar'); const bb2 = await bar.boundingBox();
      await p.mouse.move(bb2.x+120, bb2.y+20); await p.mouse.down();
      await p.mouse.move(bb2.x+300, bb2.y+120, {steps:8}); await p.mouse.up(); await p.waitForTimeout(200);
      const after = await p.evaluate(()=>document.querySelector('.win').getBoundingClientRect().left);
      drag = (after - before) > 100 ? 'ok' : 'FAIL('+Math.round(after-before)+')';
      await p.click('.win .close');
    }
    rows.push([name, shell, win, {solved, appOverflow, starSynced, closed, drag}, errs]);
    await ctx.close();
  }
  console.log('화면'.padEnd(16), '막대맞음 가로넘침 잘림 겹침 창맞음 푼문제 앱넘침 별동기 닫힘 드래그 오류');
  for (const [n,s,w,a,e] of rows) {
    console.log(n.padEnd(16),
      String(s.barsFit).padEnd(6), String(s.pageOverflowX).padEnd(6), String(s.clipped).padEnd(4),
      String(s.pillOverlap).padEnd(5), String(w.fits).padEnd(6), String(a.solved).padEnd(5),
      String(a.appOverflow.x).padEnd(6), String(a.starSynced).padEnd(6), String(a.closed).padEnd(5),
      String(a.drag).padEnd(6), e.length? 'ERR:'+e.join('|') : '없음');
  }
  await b.close();
})().catch(e=>{console.error('FATAL',e.message);process.exit(1)});
