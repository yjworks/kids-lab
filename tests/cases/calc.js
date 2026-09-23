const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'], locale:'ko-KR' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await p.goto('http://127.0.0.1:8765/apps/calc/index.html');
  await p.waitForSelector('.kl-menu-item');
  await (await p.$$('.kl-menu-item'))[0].tap();          // 계산기
  await p.waitForSelector('.keys');
  const key = async t => { const b = await p.$(`.keys button:text-is("${t}")`); await b.tap(); await p.waitForTimeout(60); };
  const read = () => p.evaluate(() => ({ num: document.querySelector('.screen .num').textContent,
    ko: document.querySelector('.screen .read').textContent, err: document.querySelector('.screen').classList.contains('err') }));
  const seq = async (...ks) => { for (const k of ks) await key(k); return read(); };

  const results = [];
  results.push(['12 + 7', await seq('AC','1','2','＋','7','＝')]);
  results.push(['9 ÷ 0', await seq('AC','9','÷','0','＝')]);
  results.push(['오류 후 AC', await seq('AC','5')]);
  results.push(['8 × 9', await seq('AC','8','×','9','＝')]);
  results.push(['0.1 + 0.2', await seq('AC','.','1','＋','.','2','＝')]);
  results.push(['7 ÷ 2', await seq('AC','7','÷','2','＝')]);
  results.push(['100 − 250', await seq('AC','1','0','0','－','2','5','0','＝')]);
  // 15자리 입력 제한
  await key('AC'); for (let i=0;i<18;i++) await key('9');
  results.push(['9 18번 입력', await read()]);
  // 큰 수 곱하기 → 넘침
  results.push(['999...9 × 9', await seq('×','9','＝')]);
  results.push(['오류 후 ←', await seq('←')]);
  // 연속 계산
  results.push(['2+3+4', await seq('AC','2','＋','3','＋','4','＝')]);
  results.push(['100조+3', await seq('AC','1','0','0','0','0','0','0','0','0','0','0','0','0','0','0','＋','3','＝')]);
  results.push(['100조+3 -3', await seq('－','3','＝')]);
  results.push(['999조999...+1', await seq('AC','9','9','9','9','9','9','9','9','9','9','9','9','9','9','9','＋','1','＝')]);
  results.push(['1조+0.5', await seq('AC','1','0','0','0','0','0','0','0','0','0','0','0','0','＋','.','5','＝')]);
  for (const [name, r] of results) console.log(name.padEnd(16), JSON.stringify(r));
  const tape = await p.$$eval('.tape .row', r => r.length);
  console.log('계산 기록 줄수:', tape);
  console.log('오류:', errs.length ? errs.join(' | ') : '없음');
  await p.screenshot({ path: process.argv[2] + '/calc.png' });
  await b.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
