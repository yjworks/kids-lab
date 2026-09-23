const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'], locale:'ko-KR' });
  const p = await ctx.newPage(); const errs=[];
  p.on('pageerror', e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/apps/daily/index.html');
  await p.waitForSelector('.kl-menu-item');
  // 오답을 직접 하나 심는다
  await p.evaluate(() => {
    KidLab.mutate(d => { d.wrong = {}; });
  });
  await p.locator('.kl-menu-item').nth(2).click();
  await p.waitForSelector('.kl-choice');
  // 첫 문제를 일부러 틀린 뒤 맞히고 끝까지 진행
  for (let round=0; round<10; round++) {
    const n = await p.locator('.kl-choice').count(); if (!n) break;
    for (let i=0;i<n;i++) {
      await p.locator('.kl-choice').nth(i).click(); await p.waitForTimeout(240);
      if (await p.locator('.kl-feedback.good').count()) { await p.waitForTimeout(820); break; }
    }
    if (await p.locator('.kl-result').count()) break;
  }
  const saved = await p.evaluate(() => { const d=KidLab.data(); const k=Object.keys(d.wrong||{})[0]; return { k, n:(d.wrong[k]||[]).length, first:(d.wrong[k]||[])[0] }; });
  console.log('저장된 오답 수:', saved.n, '| 첫 문제 키:', String(saved.first && saved.first.key).slice(0,40));
  await p.locator('.kl-btn.primary', { hasText: '한 번 더' }).click();
  await p.waitForTimeout(600);
  // 화면의 복습 문제에 대한 정답 보기를 저장된 데이터에서 찾아 그대로 누른다
  const clicked = await p.evaluate(() => {
    const d = KidLab.data(); const k = Object.keys(d.wrong||{})[0];
    const list = d.wrong[k] || [];
    const prompt = document.querySelector('.kl-prompt').innerHTML;
    const item = list.find(x => x.q.prompt === prompt);
    if (!item) return { ok:false, why:'문제 못 찾음' };
    const right = item.q.choices.find(c => c.correct);
    const btns = [...document.querySelectorAll('.kl-choice')];
    const target = btns.find(b => b.innerHTML === right.html);
    if (!target) return { ok:false, why:'보기 못 찾음' };
    target.click();
    return { ok:true, key:item.key };
  });
  await p.waitForTimeout(600);
  const after = await p.evaluate(() => { const d=KidLab.data(); const k=Object.keys(d.wrong||{})[0]; return (d.wrong[k]||[]).length; });
  console.log('복습 정답 클릭:', JSON.stringify(clicked), '| 남은 오답:', after, '(하나 줄어야 정상:', saved.n-1, ')');
  console.log('오류:', errs.length?errs.join('|'):'없음');
  await b.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1)});
