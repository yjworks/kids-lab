const { chromium } = require('/opt/node22/lib/node_modules/playwright');
/* R05 작은 화면: 320×460·412×360·412×560·360×420·640×300·1000×470에서 모든 앱 메뉴 화면과 한 단계 안 화면(글자·칠교·이야기 고르기 뒤)의 단추·그림이 화면 밖으로 잘리지 않음(스크롤 없는 고정 화면은 아래도) */
const fs=require('fs');
const APPS=fs.readFileSync(require('path').join(__dirname,'../../shared/apps.js'),'utf8').match(/id: '([a-z]+)'/g).map(x=>x.slice(5,-1));
(async()=>{const b=await chromium.launch();const bad=[];let n=0,fixedN=0;
for (const [w,h] of [[320,460],[412,360],[412,560],[360,420],[640,300],[1000,470]]) {
 const c=await b.newContext({viewport:{width:w,height:h},isMobile:true,hasTouch:true});const p=await c.newPage();
 for (const a of APPS) {
  await p.goto('http://127.0.0.1:8765/apps/'+a+'/index.html');await p.waitForTimeout(100);
  const items=await p.locator('.kl-menu-item').count();
  for (let i=0;i<items;i++){
   await p.goto('http://127.0.0.1:8765/apps/'+a+'/index.html');await p.waitForTimeout(80);
   await p.locator('.kl-menu-item').nth(i).click().catch(()=>{}); await p.waitForTimeout(350);
   for (let depth=0; depth<2; depth++) {
    n++;
    const r=await p.evaluate(()=>{const W=document.documentElement.clientWidth,H=innerHeight;const fixed=document.body.classList.contains('fixed')||getComputedStyle(document.body).overflowY==='hidden'||(document.querySelector('main')&&getComputedStyle(document.querySelector('main')).overflowY==='hidden');
      const els=[...document.querySelectorAll('main button, main canvas, main svg, main .kl-choice, main input')].filter(e=>{const q=e.getBoundingClientRect();if(!q.width||!q.height)return false;if(getComputedStyle(e).visibility==='hidden')return false;
        let x=e.parentElement; while(x&&x!==document.body){const cs=getComputedStyle(x); if(/(auto|scroll)/.test(cs.overflowX+cs.overflowY)&&x.scrollHeight>x.clientHeight) return false; x=x.parentElement;}
        return q.right>W+2||q.left<-2||(fixed&&q.bottom>H+2);});
      return {fixed, cut:[...new Set(els.map(e=>(typeof e.className==='string'&&e.className?e.className.split(' ')[0]:e.tagName.toLowerCase())))].slice(0,3), over:document.documentElement.scrollWidth-W};});
    if(r.fixed) fixedN++;
    if(r.cut.length||r.over>1) bad.push(w+'x'+h+' '+a+'#'+i+(depth?'>':'')+' '+(r.fixed?'[고정] ':'')+r.cut.join(',')+(r.over>1?' 가로넘침'+r.over:''));
    // 한 단계 더: 고르기 화면이면 첫 항목을 눌러 본다
    const nxt = p.locator('main .pick button, main .tan-card, main .ep-grid button, main .cover').first();
    if (depth===0 && await nxt.count()) { await nxt.click().catch(()=>{}); await p.waitForTimeout(350); } else break;
   }
  }
 }
 await c.close();}
console.log('화면 '+n+' (고정 화면 '+fixedN+') · 문제 '+bad.length); console.log(bad.join('\n'));await b.close();})();
