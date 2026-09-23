const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('http://127.0.0.1:8765/apps/hanja/index.html'); await p.waitForTimeout(300);
  await p.addScriptTag({ url: '/shared/copy.js' });
  const res = await p.evaluate(() => {
    const CH = '天地玄黃宇宙洪荒日月盈昃學而時習之배우고때때로익히면가나다ABC'.split('');
    const out = { trace: [0, 0], sloppy: [0, 0], diag: [0, 0], fill: [0, 0], half: [0, 0], dot: [0, 0], missing: [] };
    const G = 48;
    function mask(ch) {
      const c = document.createElement('canvas'); c.width = c.height = G; const x = c.getContext('2d');
      x.fillStyle = '#000'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = Math.round(G * 0.8) + 'px "Noto Serif KR", "Nanum Myeongjo", "Batang", serif, "Noto Sans KR"';
      x.fillText(ch, G / 2, G / 2 + G * 0.04);
      const d = x.getImageData(0, 0, G, G).data; const pts = [];
      for (let y = 0; y < G; y += 2) for (let xx = 0; xx < G; xx++) if (d[(y * G + xx) * 4 + 3] > 90) pts.push([xx, y]);
      return pts;
    }
    for (const ch of CH) {
      const pts = mask(ch);
      if (!pts.length) { out.missing.push(ch); continue; }
      // 글자 칸을 짧은 획으로 따라가기 (가로로 이어진 칸 = 한 획)
      const rows = {}; pts.forEach(p => (rows[p[1]] = rows[p[1]] || []).push(p[0]));
      const trace = [];
      Object.keys(rows).forEach(y => { const xs = rows[y].sort((a, b) => a - b); let s = xs[0], prev = xs[0];
        for (let i = 1; i <= xs.length; i++) { if (i === xs.length || xs[i] !== prev + 1) { trace.push([[s / G, +y / G], [(prev + 0.9) / G, +y / G]]); s = xs[i]; } prev = xs[i]; } });
      const jit = (st, j, o) => st.map(q => [q[0] + (Math.random() * 2 - 1) * j + o[0], q[1] + (Math.random() * 2 - 1) * j + o[1]]);
      const sample = trace.filter((_, i) => i % 2 === 0);
      const T = (name, strokes) => { const r = KidCopy.judge(ch, strokes); out[name][1]++; if (r.ok) out[name][0]++; };
      T('trace', sample);
      T('sloppy', sample.map(st => jit(st, 0.02, [0.03, -0.02])));
      T('diag', [[[0.05, 0.05], [0.95, 0.95]], [[0.95, 0.05], [0.05, 0.95]]]);
      const fill = []; for (let y = 0.05; y < 0.96; y += 0.05) fill.push([[0.03, y], [0.97, y]]); T('fill', fill);
      T('half', sample.filter(st => st[0][1] < 0.45));
      T('dot', [[[0.5, 0.5], [0.52, 0.52]]]);
    }
    return out;
  });
  for (const k of ['trace', 'sloppy', 'diag', 'fill', 'half', 'dot']) console.log(k.padEnd(7), '통과', res[k][0] + '/' + res[k][1]);
  console.log('글꼴에 없는 글자', res.missing.join('') || '없음');
  await b.close();
})();
