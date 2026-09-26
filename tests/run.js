/* 키즈랩 전수조사 - TESTPLAN.md의 케이스를 한 번에 돌리고 tests/report.md에 결과를 쓴다.
   실행: node tests/run.js            (전부)
         node tests/run.js S01,R02    (골라서) */
const fs = require('fs'), path = require('path'), vm = require('vm'), http = require('http');
const { spawn, spawnSync } = require('child_process');
const PW = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright';
const { chromium, devices } = require(PW);
const ROOT = path.resolve(__dirname, '..'), BASE = 'http://127.0.0.1:8765/', OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const ONLY = process.argv[2] ? process.argv[2].split(',') : null;
const results = [];
function rec(id, pass, detail) { results.push({ id, pass, detail: String(detail || '') }); console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + String(detail || '').slice(0, 300)); }
const want = id => !ONLY || ONLY.includes(id);
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const walk = d => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name]);

/* 앱 목록 */
const ctxApps = { window: {} }; vm.createContext(ctxApps); vm.runInContext(read('shared/apps.js'), ctxApps);
const APPS = ctxApps.window.KIDLAB_APPS || ctxApps.window.APPS || vm.runInContext('typeof APPS!=="undefined"?APPS:null', ctxApps);
const CATS = (read('index.html').match(/var CATS = \[([^\]]*)\]/)[1].match(/'([^']+)'/g) || []).map(s => s.slice(1, -1));

function up() { return new Promise(r => http.get(BASE, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); }
async function ensureServer() {
  if (await up()) return null;
  const s = spawn('python3', ['-m', 'http.server', '8765', '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 40 && !(await up()); i++) await new Promise(r => setTimeout(r, 250));
  return s;
}

/* ---------------- S. 정적 검사 ---------------- */
function staticChecks() {
  if (want('S01')) {
    const bad = [];
    for (const a of APPS) {
      const f = 'apps/' + a.id + '/index.html';
      if (!fs.existsSync(path.join(ROOT, f))) { bad.push(a.id + ' 파일 없음'); continue; }
      const s = read(f);
      if (!new RegExp('<body data-app="' + a.id + '"').test(s)) bad.push(a.id + ' data-app 다름');
      if (!/<\/html>\s*$/.test(s)) bad.push(a.id + ' </html> 없음');
      if ((s.match(/<script\b/g) || []).length !== (s.match(/<\/script>/g) || []).length) bad.push(a.id + ' script 태그 짝 안 맞음');
    }
    rec('S01', !bad.length, bad.length ? bad.join(', ') : APPS.length + '개 앱 구조 정상');
  }
  if (want('S02')) {
    const bad = [];
    const files = ['index.html', 'sw.js'].concat(walk('apps'), walk('shared')).filter(f => /\.(html|js)$/.test(f));
    for (const f of files) {
      const s = read(f);
      const chunks = f.endsWith('.js') ? [s] : [...s.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
      chunks.forEach((c, k) => { try { new vm.Script(c, { filename: f }); } catch (e) { bad.push(f + '#' + k + ' ' + e.message); } });
    }
    rec('S02', !bad.length, bad.length ? bad.join(' | ') : files.length + '개 파일 문법 정상');
  }
  if (want('S03')) {
    const bad = [], seen = { id: {}, name: {}, icon: {} };
    for (const a of APPS) {
      for (const k of ['id', 'name']) { if (seen[k][a[k]]) bad.push(k + ' 중복 ' + a[k]); seen[k][a[k]] = 1; }
      const ic = a.svg || a.icon; if (!ic) bad.push(a.id + ' 아이콘 없음'); else { if (seen.icon[ic]) bad.push('아이콘 중복 ' + a.id + ' ' + ic); seen.icon[ic] = 1; }
      if (a.svg && !fs.existsSync(path.join(ROOT, a.svg))) bad.push(a.id + ' svg 파일 없음');
      if (!CATS.includes(a.cat)) bad.push(a.id + ' 묶음 ' + a.cat + ' 이 런처에 없음');
      if (!a.how) bad.push(a.id + ' how 없음');
    }
    rec('S03', !bad.length, bad.length ? bad.join(', ') : '앱 ' + APPS.length + '개, 묶음 ' + (CATS.length - 1) + '개');
  }
  if (want('S04')) {
    const sw = read('sw.js'), list = [...sw.matchAll(/"(\.\/[^"]*)"/g)].map(m => m[1]);
    const missing = list.filter(f => f !== './' && !fs.existsSync(path.join(ROOT, f)));
    const deploy = walk('apps').concat(walk('shared'), walk('icons')).map(f => './' + f);
    const notCached = deploy.filter(f => !list.includes(f));
    rec('S04', !missing.length && !notCached.length, (missing.length ? '없는 파일 ' + missing.join(',') + ' ' : '') + (notCached.length ? '캐시 빠짐 ' + notCached.join(',') : '캐시 ' + list.length + '개 정상'));
  }
  if (want('S05')) {
    const kid = read('shared/kid.js'), pool = kid.slice(kid.indexOf('var MISSION_POOL'), kid.indexOf('];', kid.indexOf('var MISSION_POOL')));
    const ms = [...pool.matchAll(/app: '(\w+)', key: '(\w+)'/g)].map(m => ({ app: m[1], key: m[2] }));
    const fixed = kid.match(/DAILY_FIXED = \{ app: '(\w+)', key: '(\w+)'/); if (fixed) ms.push({ app: fixed[1], key: fixed[2] });
    const bad = [];
    for (const m of ms) {
      if (!APPS.find(a => a.id === m.app)) { bad.push(m.app + ' 앱 없음'); continue; }
      const dir = path.join(ROOT, 'apps', m.app), own = fs.readdirSync(dir).map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
      /* 앱이 불러 쓰는 공용 스크립트(trace.js, copy.js 등)가 내는 이벤트도 센다 */
      const shared = [...own.matchAll(/src="\.\.\/\.\.\/shared\/([\w.]+)"/g)].map(m => m[1]).filter(f => f !== 'kid.js').map(f => read('shared/' + f)).join('\n');
      const src = own + '\n' + shared;
      const ok = m.key === 'correct' ? /runQuiz|event\('correct'\)/.test(src) : new RegExp("event\\('" + m.key + "'").test(src) || (m.key === 'win' && /copy\.js|KidCopy/.test(src));
      if (!ok) bad.push(m.app + ':' + m.key + ' 이벤트를 내지 않음');
    }
    rec('S05', !bad.length, bad.length ? bad.join(', ') : '미션 ' + ms.length + '개 정상');
  }
  if (want('S06')) {
    /* Emoji 13.0 이후에 추가되어 Windows 10 글꼴에 없는 것 */
    const NEW = '🥲🥸🤌🫀🫁🥷🦬🦣🦫🦤🪶🦭🪲🪳🪰🪱🪴🫐🫒🫑🫓🫔🫕🫖🧋🪨🪵🛖🛻🛼🪄🪅🪆🪡🪢🩴🪖🪗🪘🪙🪃🪚🪛🪝🪜🛗🪞🪟🪠🪤🪣🪥🪦🪧🫠🫢🫣🫡🫥🫤🥹🫱🫲🫳🫴🫰🫵🫶🪸🪷🪹🪺🫘🫗🫙🛝🛞🛟🪬🩼🩻🪫🫧🪪🟰🫨🩷🩵🩶🫷🫸🫎🫏🪽🪿🪼🪻🫚🫛🪭🪮🪇🪈🪯🛜';
    const set = [...NEW], hits = {};
    const files = ['index.html'].concat(walk('apps'), walk('shared')).filter(f => /\.(html|js)$/.test(f));
    for (const f of files) { const s = read(f); for (const e of set) if (s.includes(e)) (hits[e] = hits[e] || []).push(f.replace(/^apps\//, '').replace('/index.html', '')); }
    const keys = Object.keys(hits);
    rec('S06', !keys.length, keys.length ? keys.map(k => k + '(' + [...new Set(hits[k])].join(',') + ')').join(' ') : '새 이모지 0');
  }
  if (want('S08')) {
    /* 낱말 뒤에 조사를 손으로 붙인 곳 - 받침에 따라 달라지는 조사는 KidLab.josa로 붙여야 한다.
       아래 OK 목록은 앞말이 늘 같은 받침이라 직접 붙여도 맞는 곳(사람이 확인함) */
    const OK = ["won(have) + '이 있어요", "won(pocket) + '을 모았", "won(rest) + '을 모았", "won(pocket) + ' 모으기'", "NAME[x.j] + '을 붙이면", "FNAME[FINGER[code]] + '으로", "v[1] + '는?'", "w[2] + '이에요.'", "safeOk + ' / '", "firstTry + ' / '", "fmt(have) + ')", "moves + '번", "score + ' / '"];
    const hits = [];
    const files = ['index.html'].concat(walk('apps'), walk('shared')).filter(f => /\.(html|js)$/.test(f));
    for (const f of files) read(f).split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/([\w\]\)]+) \+ '(을|를|은|는|이|가|와|과|로|으로|이에요|예요)[ '.,!?]/g)) {
        const around = line.slice(Math.max(0, m.index - 30), m.index + m[0].length + 12);
        if (!OK.some(o => around.includes(o))) hits.push(f + ':' + (i + 1) + ' ' + around.trim());
      }
    });
    rec('S08', !hits.length, hits.length ? hits.slice(0, 15).join(' | ') : '손으로 붙인 조사 0 (확인된 예외 ' + OK.length + '곳)');
  }
  if (want('S09')) {
    /* 학습 코스: 앱이 있고, 그 앱이 그 이벤트를 내고, 적힌 메뉴 이름이 앱에 실제로 있는지 */
    const cctx = { window: {} }; vm.createContext(cctx); vm.runInContext(read('shared/courses.js'), cctx);
    const C = cctx.window.KIDLAB_COURSES, bad = []; let tasks = 0;
    const FREE = ['첫 책', '조금 긴 책', '긴 책', '옛이야기', '탈무드 지혜 이야기', '좋아하는 책', '읽기 책 한 권', '초등', '중학교', '내 학년 글 한 편', '가장 어려웠던 글 다시', '영어 그림책', 'My Cat', 'Colors', 'Good Morning', 'At the Zoo', 'Rainy Day', 'Count with Me', '로봇 코딩 한 단계', '오늘 기분 기록', '한 줄 일기', '방학 일기', '영단어 단계', '칠교 두 개', '고전 한 문장 필사', '원문·뜻 따라 쓰기', '천자문 1~4구절 보기', '천자문 5~8구절 보기', '천자문 필사하기', '오늘의 지구 약속 3개', '좋아하는 책 두 권', '한글 낱말', '영어 낱말', '가운뎃줄 왼손', '가운뎃줄 오른손', '윗줄', '아랫줄', 'ABC 가운뎃줄'];
    const srcOf = {};
    C.list.forEach(c => {
      if (!c.weeks.every(w => w.days.length === 5)) bad.push(c.id + ' 5일이 아닌 주');
      c.weeks.forEach((w, wi) => w.days.forEach((d, di) => d.forEach(t => {
        tasks++;
        const [app, key, n, where] = t, tag = c.id + ' ' + (wi + 1) + '주' + (di + 1) + '일 ' + app;
        if (!APPS.find(a => a.id === app)) { bad.push(tag + ' 앱 없음'); return; }
        if (!(n > 0)) bad.push(tag + ' 횟수');
        if (!srcOf[app]) { const dir = path.join(ROOT, 'apps', app), own = fs.readdirSync(dir).map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n'); const sh = [...own.matchAll(/src="\.\.\/\.\.\/shared\/([\w.]+)"/g)].map(m => m[1]).filter(f => f !== 'kid.js').map(f => read('shared/' + f)).join('\n'); srcOf[app] = own + '\n' + sh; }
        const src = srcOf[app];
        const evOk = key === 'correct' ? /runQuiz|event\('correct'\)/.test(src) : new RegExp("event\\('" + key + "'").test(src);
        if (!evOk) bad.push(tag + ' 이벤트 ' + key + ' 없음');
        const core = where.split(' → ')[0].replace(/ \(.*\)$/, '').trim();
        if (!src.includes(core) && !FREE.some(f => where.startsWith(f))) bad.push(tag + ' 메뉴 "' + core + '" 없음');
      })));
    });
    rec('S09', !bad.length, bad.length ? bad.slice(0, 15).join(' | ') : '코스 ' + C.list.length + '개, 할 일 ' + tasks + '개 정상');
  }
  if (want('S07')) {
    const man = JSON.parse(read('manifest.webmanifest')), miss = (man.icons || []).filter(i => !fs.existsSync(path.join(ROOT, i.src.replace(/^\.?\//, ''))));
    /* id 는 시작 주소의 "도메인 루트" 기준으로 풀린다. "./" 이면 https://dibrain.dev/ 가 되어
       같은 도메인의 블로그 앱(id "/")과 겹치고, 휴대폰이 이미 설치된 앱으로 보고 설치를 막는다. */
    const idOk = man.id === '/kids-lab/';
    if (!idOk) miss.push({ src: 'id가 "/kids-lab/" 이 아님: ' + JSON.stringify(man.id) });
    rec('S07', !miss.length, miss.length ? '문제 ' + miss.map(i => i.src).join(',') : '아이콘 ' + man.icons.length + '개, id ' + man.id);
  }
}

/* ---------------- 브라우저 공통 ---------------- */
/* 기다리는 시간(정답 뒤 머무는 시간 등)을 1/10로 줄여서 흐름만 빠르게 확인한다 */
const FAST = () => {
  const st = window.setTimeout; window.setTimeout = function (f, ms) { return st.call(window, f, ms > 60 ? ms / 10 : ms); };
  /* 큰 ✗(오답 알림)가 몇 번 떴는지 센다 - 금방 사라져서 직접 세어 둔다 */
  window.__nope = 0;
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.classList && n.classList.contains('kl-nope')) window.__nope++; }))).observe(document, { childList: true, subtree: true });
};
async function newPage(b, dev, fast) {
  const ctx = await b.newContext({ ...dev, locale: 'ko-KR' });
  if (fast) await ctx.addInitScript(FAST);
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push(m.text()); });
  return p;
}
const hOver = p => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/* ---------------- R. 앱별 실행 ---------------- */
async function runtime(b) {
  if (want('R01') || want('R03')) {
    for (const [id, dev] of [['R01', devices['Pixel 7']], ['R03', { viewport: { width: 1366, height: 768 } }]]) {
      if (!want(id)) continue;
      const p = await newPage(b, dev), bad = [];
      for (const a of APPS) {
        p.errs = [];
        await p.goto(BASE + 'apps/' + a.id + '/index.html'); await p.waitForTimeout(250);
        const r = await p.evaluate(() => ({ head: !!document.querySelector('.kl-header'), items: document.querySelectorAll('.kl-menu-item, .cover, .kl-card').length }));
        const ov = await hOver(p);
        if (p.errs.length || !r.head || (id === 'R01' && !r.items) || ov > 1) bad.push(a.id + (p.errs.length ? ' 오류:' + p.errs[0] : '') + (!r.head ? ' 머리말없음' : '') + (!r.items ? ' 메뉴없음' : '') + (ov > 1 ? ' 넘침' + ov : ''));
      }
      rec(id, !bad.length, bad.length ? bad.join(' | ') : APPS.length + '개 앱 정상');
      await p.context().close();
    }
  }
  if (want('R02')) {
    const bad = [], stat = { menus: 0, rounds: 0, open: 0, wrongShown: 0, explain: 0 };
    for (const a of APPS.filter(a => !process.env.R02_APPS || process.env.R02_APPS.split(',').includes(a.id))) {
      /* 앱마다 새 세션: 한 세션에서 오래 돌리면 쉬는 시간 안내(20분)가 떠서 누르기를 막는다 */
      const p = await newPage(b, devices['Pixel 7'], true);
      await p.goto(BASE + 'apps/' + a.id + '/index.html'); await p.waitForTimeout(150);
      const n = await p.locator('.kl-menu-item').count();
      for (let i = 0; i < n; i++) {
        p.errs = [];
        let label = '#' + i;
        try {
        await p.goto(BASE + 'apps/' + a.id + '/index.html'); await p.waitForSelector('.kl-menu-item');
        label = ((await p.locator('.kl-menu-item').nth(i).innerText()).split('\n')[1] || '').trim();
        await p.locator('.kl-menu-item').nth(i).click(); await p.waitForTimeout(250);
        stat.menus++;
        let qs = 0, stuck = false, first = true;
        for (let guard = 0; guard < 30; guard++) {
          if (await p.locator('.kl-result').count()) break;
          const ch = p.locator('.kl-stage .kl-choice');
          let cnt = await ch.count();
          /* 그림을 잠깐 보여 준 뒤에 보기를 내는 문제(기억력 "뭐가 사라졌지?")는 보기가 늦게 뜬다.
             고정 250ms 안에 뜨느냐에 따라 결과가 갈리지 않게, 문제 칸이 있으면 조금 더 기다린다 */
          if (!cnt && await p.locator('.kl-stage').count()) {
            await p.waitForSelector('.kl-stage .kl-choice, .kl-result', { timeout: 800 }).catch(() => { });
            if (await p.locator('.kl-result').count()) break;
            cnt = await ch.count();
          }
          if (!cnt) break;
          const nope0 = await p.evaluate(() => window.__nope || 0);
          let solved = false;
          for (let j = 0; j < cnt && !solved; j++) {
            const dim = await p.evaluate(j => { const e = document.querySelectorAll('.kl-stage .kl-choice')[j]; return !e || e.classList.contains('dim'); }, j);
            if (dim) continue;
            await ch.nth(j).click({ force: true, timeout: 3000 }).catch(() => { });
            /* 누른 칸에 ⭕ 또는 ✗ 표시가 붙을 때까지 기다린다 (고정 시간만 기다리면 느린 기기에서 헛돈다) */
            await p.waitForFunction(j => { const e = document.querySelectorAll('.kl-stage .kl-choice')[j]; return !e || document.querySelector('.kl-stage .kl-choice.right') || e.classList.contains('wrong-mark'); }, j, { timeout: 3000 }).catch(() => { });
            if (await p.locator('.kl-stage .kl-choice.right').count()) solved = true;
            /* 한 번만 고르는 실험형(뜰까 가라앉을까): 고르면 단추가 모두 잠기고 다음으로 넘어간다 */
            else if (await p.evaluate(() => { const cs = [...document.querySelectorAll('.kl-stage .kl-choice')]; return cs.length && cs.every(c => c.disabled); })) { solved = true; await p.evaluate(() => { const w = document.querySelector('.kl-stage .kl-choice.wrong-mark'); if (w) w.classList.add('right-once'); }); }
            else if (first) {
              /* 오답이면 고른 칸의 ✗ 표시와 함께, 문제 위 빨간 띠나 화면 가운데 큰 ✗ 중 하나는 떠야 한다 */
              const fb = await p.locator('.kl-feedback.bad').count(), mk = await p.locator('.kl-choice.wrong-mark').count(), big = (await p.evaluate(() => window.__nope || 0)) > nope0;
              if (mk && (fb || big)) stat.wrongShown++; else bad.push(a.id + '/' + label + ' 오답 표시 없음'); first = false;
            }
          }
          if (!solved) { stuck = true; break; }
          qs++;
          /* 다음 문제로 넘어갔는지: 맞힌 칸이 화면에서 사라지거나 결과 화면이 나오면 */
          await p.evaluate(() => { const r = document.querySelector('.kl-stage .kl-choice.right, .kl-stage .kl-choice.right-once'); if (r) r.dataset.solved = '1'; });
          /* 풀이 카드가 뜨면 저절로 넘어가지 않아야 하고, "다음" 단추가 화면 안에 보여야 한다 */
          const exb = p.locator('.kl-explain-next');
          if (await exb.count()) {
            await p.waitForTimeout(150);
            if (!(await p.locator('[data-solved]').count())) bad.push(a.id + '/' + label + ' 풀이 카드인데 저절로 넘어감');
            await exb.scrollIntoViewIfNeeded();
            const vis = await exb.evaluate(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.top >= 0 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1; });
            if (!vis) bad.push(a.id + '/' + label + ' 다음 단추 화면 밖');
            const txt = await p.locator('.kl-explain-body').textContent();
            if (/undefined|NaN|null/.test(txt) || txt.trim().length < 8) bad.push(a.id + '/' + label + ' 풀이 내용 이상: ' + txt.slice(0, 30));
            stat.explain++;
            await exb.click();
          }
          await p.waitForFunction(() => document.querySelector('.kl-result') || !document.querySelector('[data-solved]'), null, { timeout: 5000 }).catch(() => { stuck = true; });
          if (stuck) break;
        }
        const done = await p.locator('.kl-result').count();
        if (qs && done) stat.rounds++; else if (!qs) stat.open++;
        const ov = await hOver(p);
        if (stuck || (qs && !done)) bad.push(a.id + '/' + label + ' 막힘(' + qs + '문제)');
        if (p.errs.length) bad.push(a.id + '/' + label + ' 오류:' + p.errs[0]);
        if (ov > 1) bad.push(a.id + '/' + label + ' 가로넘침' + ov);
        } catch (e) { bad.push(a.id + '/' + label + ' 검사 중 예외: ' + e.message.split('\n')[0]); }
      }
      await p.context().close();
    }
    rec('R02', !bad.length, (bad.length ? bad.join(' | ') + ' || ' : '') + '메뉴 ' + stat.menus + ', 퀴즈 완주 ' + stat.rounds + ', 퀴즈 아닌 화면 ' + stat.open + ', 오답 표시 확인 ' + stat.wrongShown + ', 풀이 카드 ' + stat.explain);
  }
}

/* ---------------- Q. 문제 생성 ---------------- */
async function generators(b) {
  if (!['Q01', 'Q02', 'Q03', 'Q04', 'Q05'].some(want)) return;
  const p = await newPage(b, { viewport: { width: 1000, height: 800 } });
  await p.context().addInitScript(() => {
    window.__cfgs = [];
    Object.defineProperty(window, 'KidLab', { configurable: true, set(v) { const o = v.runQuiz; v.runQuiz = function (c) { window.__cfgs.push(c); return o.apply(this, arguments); }; Object.defineProperty(window, 'KidLab', { value: v, writable: true, configurable: true }); } });
  });
  const tally = { Q01: [], Q02: [], Q03: [], Q04: [], Q05: [] }; let total = 0, modes = 0;
  for (const a of APPS) {
    await p.goto(BASE + 'apps/' + a.id + '/index.html'); await p.waitForTimeout(150);
    const labels = await p.$$eval('.kl-menu-item', e => e.map(x => (x.querySelector('.kl-menu-label') || x).textContent));
    for (let i = 0; i < labels.length; i++) {
      await p.goto(BASE + 'apps/' + a.id + '/index.html'); await p.waitForSelector('.kl-menu-item');
      await p.evaluate(i => { window.__cfgs = []; document.querySelectorAll('.kl-menu-item')[i].click(); }, i); await p.waitForTimeout(120);
      const r = await p.evaluate(({ app, label }) => {
        const out = { n: 0, Q01: [], Q02: [], Q03: [], Q04: [], Q05: [] };
        const cfg = window.__cfgs[0]; if (!cfg || !cfg.make) return null;
        const strip = h => String(h == null ? '' : h).replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');
        const jong = c => { const k = c.charCodeAt(0) - 0xAC00; return k >= 0 && k <= 11171 ? k % 28 : -1; };
        /* 자음 이름(니은·리을 등), 가을·마을·노을, 동사 모으다·짓다의 모은·지을은 조사가 아니다 */
        const EXC = ['가을', '마을', '노을', '모은', '모을', '지을', '니은', '리을', '미음', '비읍', '이응', '지읒', '치읓', '키읔', '티읕', '피읖', '히읗', '디귿', '시옷', '기역'];
        function josaErr(t) {
          const e = [], B = '(?=[\\s.,!?"\'」)~…·]|$)';
          for (const m of t.matchAll(new RegExp('([가-힣])(를|와|예요|로)' + B, 'g'))) { const j = jong(m[1]); if (j > 0 && !(m[2] === '로' && j === 8)) e.push(m[0]); }
          for (const m of t.matchAll(new RegExp('([가-힣])(을|은|으로|이에요)' + B, 'g'))) { const j = jong(m[1]); const word = t.slice(Math.max(0, m.index - 1), m.index + 2); if (j === 0 && !EXC.some(x => word.includes(x))) e.push(m[0]); if (m[2] === '으로' && j === 8) e.push(m[0]); }
          if (/\((을|를|이|가|은|는)\)/.test(t)) e.push('괄호조사');
          return e;
        }
        let spoken = ''; const sp = KidLab.speak; KidLab.speak = function (t) { spoken = t; return false; };
        for (let lv = 1; lv <= 5; lv++) for (let k = 0; k < 150; k++) {
          let q; try { q = cfg.make(k % (cfg.total || 8), lv); } catch (e) { out.Q03.push('예외 ' + e.message); continue; }
          out.n++;
          const ch = q.choices || [], right = ch.filter(c => c.correct);
          const tag = label + ' L' + lv + ' ' + strip(q.prompt).replace(/\s+/g, ' ').slice(0, 40);
          if (right.length !== 1) out.Q01.push(tag + ' 정답' + right.length);
          const hs = ch.map(c => String(c.html)); if (!q.allowDupChoices && new Set(hs).size !== hs.length) out.Q02.push(tag);
          const txt = [strip(q.prompt), strip(q.sub), q.say || '', strip(q.explain), q.explainSay || '', ...ch.map(c => strip(c.html) + ' ' + (c.say || ''))].join(' | ');
          /* 우리말 탐험·고전 뜻 문제는 맞힌 뒤 풀이 카드를 꼭 보여 준다 */
          if ((app === 'korean' || (app === 'classic' && /뜻/.test(label))) && !(q.explain && q.explainSay && strip(q.explain).trim().length > 10)) out.Q05.push(tag + ' 풀이 없음');
          if (/undefined|NaN|\bnull\b/.test(txt)) out.Q03.push(tag);
          const je = josaErr(txt); if (je.length) out.Q04.push(tag + ' [' + je.join(',') + ']');
          /* 뜻 검사 */
          if (app === 'wordmath' && q.onCorrect && right[0] && /\d/.test(strip(right[0].html))) {
            spoken = ''; q.onCorrect(); const m = spoken.match(/^(.*), (\d+)/);
            if (m) { const expr = m[1].replace(/곱하기/g, '*').replace(/나누기/g, '/').replace(/빼기/g, '-').replace(/더하기/g, '+'); const v = Function('return ' + expr)(); if (v !== +m[2] || +strip(right[0].html) !== v) out.Q05.push(tag + ' 식' + expr + '=' + v + ' 정답' + strip(right[0].html)); }
          }
          if (app === 'wordmath' && /알맞은 식/.test(label) && right[0]) {
            const expr = strip(right[0].html).replace(/×/g, '*').replace(/÷/g, '/'); const v = Function('return ' + expr)();
            if (!Number.isInteger(v) || v < 0) out.Q05.push(tag + ' 식값 ' + v);
          }
          if (app === 'space' && /몇 개/.test(label)) { const polys = (String(q.prompt).match(/<polygon/g) || []).length; if (polys / 3 !== +strip(right[0].html)) out.Q05.push(tag + ' 그림' + polys / 3 + ' 정답' + strip(right[0].html)); }
          if (app === 'money' && /알뜰/.test(label)) {
            const unit = c => { const d = document.createElement('div'); d.innerHTML = c.html; const pr = +d.querySelector('.p').textContent.replace(/[^\d]/g, ''); const two = /2개/.test(d.querySelector('.d').textContent) ? 2 : 1; return pr / two; };
            const us = ch.map(unit), r0 = unit(right[0]); if (us.some(u => u < r0)) out.Q05.push(tag + ' 정답 단가 ' + r0 + ' / ' + us.join(','));
          }
          /* 영어 문장 앱의 문장만 본다 (알파벳 보기 'a e'는 문장이 아님) */
          if (app === 'esent') ch.forEach(c => { if (/\ba [aeiou]/i.test(strip(c.html))) out.Q05.push(tag + ' a+모음 ' + strip(c.html)); });
        }
        KidLab.speak = sp;
        return out;
      }, { app: a.id, label: labels[i] });
      if (!r) continue;
      modes++; total += r.n;
      for (const k of Object.keys(tally)) r[k].forEach(x => tally[k].push(a.id + ': ' + x));
    }
  }
  fs.writeFileSync(path.join(OUT, 'q-detail.json'), JSON.stringify(tally, null, 1));
  for (const k of Object.keys(tally)) if (want(k)) rec(k, !tally[k].length, tally[k].length ? tally[k].slice(0, 12).join(' | ') : '퀴즈 모드 ' + modes + '개, 문제 ' + total + '개 검사');
  await p.context().close();
}

/* ---------------- I06·I08·I09·I14·L01 ---------------- */
async function flows(b) {
  if (want('I06')) {
    const p = await newPage(b, devices['Pixel 7'], true), bad = [];
    const nb = 6;
    for (let k = 0; k < nb; k++) {
      await p.goto(BASE + 'apps/ebooks/index.html'); await p.locator('.cover').nth(k).click(); await p.waitForTimeout(100);
      const lay = await p.evaluate(() => { const n = document.querySelector('.nav').getBoundingClientRect(); return n.bottom <= innerHeight + 1; });
      if (!lay) bad.push('책' + k + ' 넘김단추 화면 밖');
      for (let g = 0; g < 20; g++) { const go = p.locator('.nav .go'); const t = await go.textContent(); await go.click(); await p.waitForTimeout(60); if (/다 읽었어요/.test(t)) break; }
      for (let g = 0; g < 10; g++) {
        if (await p.locator('.kl-result').count()) break;
        const ch = p.locator('.kl-stage .kl-choice'); const c = await ch.count(); if (!c) break;
        for (let j = 0; j < c; j++) { await ch.nth(j).click({ force: true }); await p.waitForTimeout(30); if (await p.locator('.kl-choice.right').count()) break; }
        await p.waitForTimeout(200);
      }
      if (!(await p.locator('.kl-result').count())) bad.push('책' + k + ' 질문 완주 못함');
    }
    await p.goto(BASE + 'apps/ebooks/index.html'); const shelf = await p.locator('.kl-prompt').first().textContent();
    if (!/6 \/ 6/.test(shelf)) bad.push('책장 ' + shelf);
    if (p.errs.length) bad.push('오류 ' + p.errs[0]);
    rec('I06', !bad.length, bad.length ? bad.join(' | ') : shelf.trim());
    await p.context().close();
  }
  if (want('I08')) {
    const p = await newPage(b, devices['Pixel 7']);
    await p.goto(BASE + 'apps/earth/index.html'); await p.locator('.kl-menu-item', { hasText: '지구 약속' }).click();
    for (let i = 0; i < 3; i++) await p.locator('.check button').nth(i).click();
    await p.reload(); await p.locator('.kl-menu-item', { hasText: '지구 약속' }).click();
    const on = await p.locator('.check button.on').count();
    rec('I08', on === 3 && !p.errs.length, '새로고침 뒤 체크 ' + on + '개' + (p.errs.length ? ' 오류 ' + p.errs[0] : ''));
    await p.context().close();
  }
  if (want('I09')) {
    const p = await newPage(b, devices['Pixel 7'], true), bad = [];
    await p.goto(BASE + 'apps/books/index.html'); await p.waitForSelector('.cover');
    const n = await p.locator('.cover').count();
    const lockedOld = await p.evaluate(() => { const c = [...document.querySelectorAll('.cover')]; return c.slice(12).filter(x => x.classList.contains('locked')).length; });
    if (lockedOld) bad.push('옛이야기·탈무드 잠김 ' + lockedOld);
    /* 잠긴 책도 넘겨 보려고 모두 읽은 것으로 기록해 둔다 */
    await p.evaluate(() => KidLab.mutate(d => { const pr = d.progress.books || (d.progress.books = {}); pr.read = pr.read || {}; for (let i = 1; i <= 12; i++) pr.read['b' + i] = pr.read['b' + i] || { n: 1, last: '2000-01-01' }; }));
    for (let i = 0; i < n; i++) {
      await p.goto(BASE + 'apps/books/index.html'); await p.waitForSelector('.cover');
      await p.locator('.cover').nth(i).click(); await p.waitForSelector('.reader');
      let pages = 0, over = 0;
      for (let g = 0; g < 15; g++) {
        pages++;
        over += await p.evaluate(() => { const pg = document.querySelector('.reader .page'); return pg.scrollHeight - pg.clientHeight > 2 ? 1 : 0; });
        const go = p.locator('.reader .nav .go'); const t = await go.textContent(); await go.click(); await p.waitForTimeout(40);
        if (/다 읽었어요/.test(t)) break;
      }
      if (over) bad.push('책' + (i + 1) + ' 쪽넘침 ' + over);
    }
    if (p.errs.length) bad.push('오류 ' + p.errs[0]);
    rec('I09', !bad.length, bad.length ? bad.join(' | ') : n + '권 끝까지, 쪽 넘침 0');
    await p.context().close();
  }
  if (want('I14')) {
    const p = await newPage(b, devices['Pixel 7'], true);
    await p.goto(BASE + 'apps/classic/index.html'); await p.locator('.kl-menu-item').nth(1).click(); await p.waitForTimeout(100);
    /* 가장 짧은 문장 골라 뜻 따라 쓰기 */
    await p.evaluate(() => { const it = [...document.querySelectorAll('.sitem')].sort((a, b) => a.textContent.length - b.textContent.length)[0]; it.click(); });
    await p.locator('button', { hasText: '뜻 따라 쓰기' }).click(); await p.waitForTimeout(200);
    for (let g = 0; g < 60; g++) {
      if (!(await p.locator('button', { hasText: '다 썼어요' }).count())) break;
      /* 회색 글자 위를 가로줄로 촘촘히 긋지 않고, 글꼴 모양 칸을 따라 점을 찍어 그린다 */
      const pts = await p.evaluate(() => {
        const cv = [...document.querySelectorAll('canvas')].pop(), r = cv.getBoundingClientRect();
        const ch = document.querySelector('.cp-chips span.cur'); const text = ch ? ch.textContent.trim() : '';
        const g = document.createElement('canvas'); g.width = g.height = 48; const x = g.getContext('2d');
        x.font = 'bold 36px "Noto Serif KR", serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 24, 26);
        const d = x.getImageData(0, 0, 48, 48).data, out = [];
        for (let yy = 0; yy < 48; yy += 2) { let run = null; for (let xx = 0; xx < 48; xx++) { const on = d[(yy * 48 + xx) * 4 + 3] > 90; if (on && !run) run = [xx, yy]; if ((!on || xx === 47) && run) { out.push([r.left + run[0] / 48 * r.width, r.top + yy / 48 * r.height, r.left + xx / 48 * r.width]); run = null; } } }
        return out;
      });
      for (const s of pts) { await p.mouse.move(s[0], s[1]); await p.mouse.down(); await p.mouse.move(s[2], s[1], { steps: 2 }); await p.mouse.up(); }
      await p.locator('button', { hasText: '다 썼어요' }).click(); await p.waitForTimeout(120);
    }
    await p.goto(BASE + 'apps/classic/index.html'); const lab = await p.locator('.kl-menu-item').nth(3).innerText();
    rec('I14', /\(1\)/.test(lab) && !p.errs.length, lab.replace(/\s+/g, ' ') + (p.errs.length ? ' 오류 ' + p.errs[0] : ''));
    await p.context().close();
  }
}

/* ---------------- L07 학습 코스 흐름 ---------------- */
async function courseFlow(b) {
  if (!want('L07')) return;
  const p = await newPage(b, devices['Pixel 7']), log = [], bad = [];
  await p.goto(BASE + 'index.html'); await p.waitForTimeout(400);
  const inp = p.locator('.overlay input'); if (await inp.count()) { await inp.fill('코스'); await p.locator('.overlay .kl-btn.primary').click(); await p.waitForTimeout(300); }
  await p.locator('#courseBtn').click(); await p.waitForTimeout(200);
  const cards = await p.locator('.course-card').count(); log.push('코스 카드 ' + cards);
  await p.locator('.course-card', { hasText: '한글·숫자 첫걸음' }).locator('.go').click(); await p.waitForTimeout(300);
  const rows = await p.locator('.panel .mission').count(); log.push('오늘 할 일 ' + rows);
  if (rows !== 3) bad.push('할 일 수 ' + rows);
  await p.locator('.panel .close').click();
  const quick = await p.locator('.quick-card').first().innerText(); if (!/오늘의 코스/.test(quick)) bad.push('큰 카드에 코스 없음'); log.push('첫 카드: ' + quick.replace(/\s+/g, ' '));
  const star0 = await p.evaluate(() => KidLab.data().stars);
  /* 첫날 할 일 = 한글 5문제, 수학 4문제, 기억 카드 1판 → 앱이 내는 것과 같은 이벤트를 넣는다 */
  await p.evaluate(() => { KidLab.event('hangul', 'correct', 5); KidLab.event('math', 'correct', 4); window.postMessage({ type: 'kidlab', action: 'update' }, '*'); });
  await p.waitForTimeout(300);
  const mid = await p.locator('#courseCount').textContent(); log.push('두 가지 한 뒤 ' + mid); if (mid !== '2/3') bad.push('중간 표시 ' + mid);
  await p.evaluate(() => { KidLab.event('memory', 'win', 1); window.postMessage({ type: 'kidlab', action: 'update' }, '*'); });
  await p.waitForTimeout(400);
  const fin = await p.locator('#courseCount').textContent(), st = await p.evaluate(() => ({ done: KidLab.data().course.done.length, stars: KidLab.data().stars }));
  log.push('다 한 뒤 ' + fin + ', 끝낸 날 ' + st.done + ', 별 +' + (st.stars - star0));
  if (fin !== '✔' || st.done !== 1 || st.stars - star0 < 5) bad.push('하루 완료 처리 안 됨');
  /* 이튿날로 넘긴다 */
  await p.evaluate(() => { KidLab.mutate(d => { d.course.done = ['2000-01-01']; }); window.postMessage({ type: 'kidlab', action: 'update' }, '*'); });
  await p.waitForTimeout(300);
  /* 날짜만 넘긴 것이라 오늘 한 기록(수학 4문제)은 그대로 남아 이튿날 할 일 1개가 이미 채워진 것이 맞다 */
  const day2 = await p.locator('#courseCount').textContent(); log.push('이튿날 ' + day2); if (day2 !== '1/3') bad.push('이튿날 표시 ' + day2);
  await p.locator('#courseBtn').click(); await p.waitForTimeout(200);
  const head = await p.locator('.course-head').innerText(); log.push(head.replace(/\s+/g, ' ')); if (!/2일째|1 \/ 20일/.test(head + (await p.locator('.panel h3').first().innerText()))) bad.push('2일째 표시 없음');
  const ov = await hOver(p); if (ov > 1) bad.push('가로넘침 ' + ov);
  await p.screenshot({ path: path.join(OUT, 'course-panel.png') });
  await p.locator('.panel .kl-btn', { hasText: '다른 코스 보기' }).click(); await p.waitForTimeout(200);
  await p.screenshot({ path: path.join(OUT, 'course-list.png'), fullPage: false });
  /* 가이드 페이지 */
  const g = await newPage(b, devices['Pixel 7']); await g.goto(BASE + 'guide.html'); await g.waitForTimeout(300);
  const gi = await g.evaluate(() => ({ apps: document.querySelectorAll('#appTables tr').length, courses: document.querySelectorAll('.course').length, tasks: document.querySelectorAll('.task').length, ov: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
  log.push('가이드 앱 줄 ' + gi.apps + ', 코스 ' + gi.courses + ', 할 일 ' + gi.tasks);
  if (gi.courses !== 10 || gi.ov > 1 || g.errs.length) bad.push('가이드 ' + JSON.stringify(gi) + g.errs.join(','));
  await g.screenshot({ path: path.join(OUT, 'guide.png') });
  if (p.errs.length) bad.push('오류 ' + p.errs[0]);
  rec('L07', !bad.length, (bad.length ? bad.join(' | ') + ' || ' : '') + log.join(' / '));
  await p.context().close(); await g.context().close();
}

/* ---------------- 기존 검사 스크립트 (tests/cases) ---------------- */
const LEGACY = [
  ['I01', 'inter.js', [], o => { const m = (o.match(/칠교 .*/) || [''])[0]; const n = (m.match(/\d+:\d조각 완성/g) || []).length; return n === 22 && !/미완성|no slot|grab-fail/.test(m) && /오류 없음/.test(o); }, o => { const m = (o.match(/칠교 .*/) || [''])[0]; return '완성 ' + (m.match(/\d+:\d조각 완성/g) || []).length + '/22 ' + (m.match(/\d+:[^|]*(미완성|no slot|grab-fail)[^|]*/g) || []).join(' '); }],
  ['I02', 'tantouch.js', [], o => (o.match(/완성했어요! scroll=0/g) || []).length === 2, o => o.trim()],
  ['I03', 'inter.js', [], o => /조합 (\S+=ok ){11}\S+=ok/.test(o) && /한글 낱말 8개 → 분당/.test(o) && /자리 연습 → 분당/.test(o) && /영어 낱말 → 분당/.test(o), o => (o.match(/조합.*\n.*\n.*\n.*/) || [''])[0]],
  ['I04', 'inter.js', [], o => /AI 날 수 있을까 시험 6문제/.test(o) && /AI 과일일까 시험 6문제/.test(o) && /편향 실험 {2}\| ❌ 틀 \| ❌ 틀 \| {2}\| ⭕ 맞 \| ⭕ 맞/.test(o), o => (o.match(/AI.*\n.*\n편향.*/) || [''])[0]],
  ['I05', 'inter.js', [], o => /저금통 \d+일 → 🎉 \d+일 만에 .* 샀어요!/.test(o), o => (o.match(/저금통.*/) || [''])[0]],
  ['I07', 'inter.js', [], o => /문장 만들기 → 한 번에 맞힌 문장 6 \/ 6/.test(o), o => (o.match(/문장 만들기.*/) || [''])[0]],
  ['I10', 'passage.js', [OUT], o => !/오류 (?!없음)/.test(o.replace(/오류 없음/g, '')), o => o.split('\n').slice(0, 4).join(' ')],
  ['I11', 'e2e.js', [], o => /통과: 151 \(100%\)/.test(o) && /오류: 없음/.test(o), o => (o.match(/실제로 그려 본 글자.*/) || [''])[0]],
  ['I12', 'e2e-bad.js', [], o => /전체 칠하기\s+0%/.test(o) && /점 하나\s+0%/.test(o) && /지그재그 낙서\s+0%/.test(o), o => o.replace(/\s+/g, ' ')],
  ['I12b', 'e2e-bad2.js', [], o => /전체 칠하기\s+0%/.test(o) && /점 하나\s+0%/.test(o) && /지그재그 낙서\s+0%/.test(o), o => o.replace(/\s+/g, ' ')],
  ['I13', 'copyjudge.js', [], o => /trace\s+통과 32\/32/.test(o) && /fill\s+통과 0\/32/.test(o) && /dot\s+통과 0\/32/.test(o) && /글꼴에 없는 글자 없음/.test(o), o => o.replace(/\s+/g, ' ')],
  ['I15', 'elev2.js', [], o => /돌려 본 건물 20/.test(o) && /문제 없음/.test(o), o => (o.match(/돌려 본 건물.*/) || [''])[0]],
  ['I16', 'arcade.js', [OUT], o => !/오류 (?!없음)/.test(o), o => o.replace(/\s+/g, ' ').slice(0, 200)],
  ['I17', 'calc.js', [OUT], o => /오류: 없음/.test(o), o => (o.match(/오류:.*/) || [''])[0]],
  ['I18', 'story.js', [], o => /만든 이야기 7200 · 빈 값\/예외 0 · 조사 틀림 0/.test(o) && /입력칸 3 · 이름 들어감 true · 대사 true · 끝 문장 true · 책장 .*\(1\) · 넘침 0/.test(o) && /오류: 없음/.test(o), o => o.replace(/\s+/g, ' ').slice(0, 220)],
  ['L01', 'cats.js', [], o => (o.match(/icons 43 전체:43h/g) || []).length === 2 && (o.match(/errs \[\]/g) || []).length === 2 && /한자·고전:2/.test(o), o => o.split('\n')[0].slice(0, 200)],
  ['L02', 'test.js', [], o => /launcher errors: none/.test(o) && /missions: 4/.test(o) && !/ (fail|error)/i.test(o.replace(/launcher errors: none/, '')), o => (o.match(/missions.*|parent.*|launcher errors.*/g) || []).join(' ')],
  ['L03', 'backnav.js', [], o => /뒤로1: \/index\.html 창1\(앱메뉴\)/.test(o) && /뒤로2: \/index\.html 창0/.test(o) && /뒤로3: \/index\.html 창0/.test(o) && /뒤로4: \/apps\/hangul/.test(o) && /미션창: .*겹창1\n뒤로: .*겹창0/.test(o), o => o.replace(/\n/g, ' / ').slice(0, 300)],
  ['L04', 'matrix.js', [], o => o.split('\n').filter(l => /^(PC|노트북|태블릿|폰)/.test(l)).length === 10 && o.split('\n').filter(l => /^(PC|노트북|태블릿|폰)/.test(l)).every(l => /true\s+0\s+0\s+false\s+true\s+\d+\s+0\s+true\s+true\s+\S+\s+없음/.test(l)), o => o.split('\n').filter(l => /^(PC|노트북|태블릿|폰)/.test(l)).map(l => l.split(/\s+/)[0] + ':' + (/없음$/.test(l) ? 'ok' : l)).join(' ')],
  ['L05', 'limit.js', [], o => /제한 도달 시 잠김: true \| 창 열림 막힘: true \| 부모 해제 후 잠금 사라짐: true \| 해제 후 앱 열림: true/.test(o) && /오류: 없음/.test(o), o => o.replace(/\s+/g, ' ')],
  ['L06', 'review2.js', [], o => { const m = o.match(/저장된 오답 수: (\d+)/), r = o.match(/남은 오답: (\d+)/); return m && r && +r[1] === +m[1] - 1 && /오류: 없음/.test(o); }, o => o.replace(/\s+/g, ' ').slice(0, 200)]
];
function legacy() {
  const cache = {};
  for (const [id, file, args, ok, show] of LEGACY) {
    if (!want(id) && !(id === 'I12b' && want('I12'))) continue;
    const key = file + args.join();
    if (!cache[key]) { const r = spawnSync('node', [path.join(__dirname, 'cases', file)].concat(args), { encoding: 'utf8', timeout: 900000 }); cache[key] = (r.stdout || '') + (r.stderr || ''); }
    const o = cache[key];
    let pass = false; try { pass = !!ok(o); } catch (e) { }
    rec(id, pass, show(o));
  }
}

(async () => {
  const t0 = Date.now(), srv = await ensureServer();
  staticChecks();
  const b = await chromium.launch();
  await runtime(b); await generators(b); await flows(b); await courseFlow(b);
  await b.close();
  legacy();
  const order = id => ['S', 'R', 'Q', 'I', 'L'].indexOf(id[0]) * 1000 + parseInt(id.slice(1)) + (/b$/.test(id) ? 0.5 : 0);
  results.sort((a, c) => order(a.id) - order(c.id));
  const fail = results.filter(r => !r.pass);
  const md = '# 전수조사 결과\n\n' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' · ' + results.length + '케이스 · 통과 ' + (results.length - fail.length) + ' · 실패 ' + fail.length + ' · ' + Math.round((Date.now() - t0) / 1000) + '초\n\n| ID | 결과 | 내용 |\n|---|---|---|\n' +
    results.map(r => '| ' + r.id + ' | ' + (r.pass ? '✅' : '❌') + ' | ' + r.detail.replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 600) + ' |').join('\n') + '\n';
  if (!ONLY) fs.writeFileSync(path.join(__dirname, 'report.md'), md); else fs.writeFileSync(path.join(OUT, 'report-partial.md'), md);
  console.log('\n통과 ' + (results.length - fail.length) + ' / ' + results.length + (fail.length ? ' · 실패: ' + fail.map(r => r.id).join(',') : ''));
  if (srv) srv.kill();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
