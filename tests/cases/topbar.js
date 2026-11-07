const { chromium } = require('/opt/node22/lib/node_modules/playwright');
/* L09 위 막대: 설치 단추가 뜨고 별이 12345개일 때 320~1280 폭 12가지에서 칸 잘림·겹침·막대 안 스크롤 0 */
(async()=>{const b=await chromium.launch();const out=[];
for (const w of [320,360,375,390,412,430,480,600,768,820,1024,1280]) {
 const c=await b.newContext({viewport:{width:w,height:800},isMobile:w<1000,hasTouch:w<1100,deviceScaleFactor:2});const p=await c.newPage();
 await p.goto('http://127.0.0.1:8765/index.html');await p.waitForTimeout(300);
 const inp=p.locator('input').first(); if(await inp.count()){await inp.fill('정우'); const bt=p.locator('button').filter({hasText:/시작|좋아|확인/}).last(); if(await bt.count()) await bt.click();} await p.waitForTimeout(300);
 await p.evaluate(()=>{const e=new Event('beforeinstallprompt');e.prompt=()=>{};e.userChoice=Promise.resolve({outcome:'dismissed'});window.dispatchEvent(e);KidLab.mutate(d=>{d.stars=12345});});
 await p.evaluate(()=>window.dispatchEvent(new Event('resize')));await p.waitForTimeout(200);
 const r=await p.evaluate(()=>{const W=innerWidth;const vis=[...document.querySelectorAll('#topbar .pill')].filter(e=>getComputedStyle(e).display!=='none');
  const bad=[];vis.forEach(e=>{const q=e.getBoundingClientRect();const par=e.parentElement.getBoundingClientRect(); if(q.right>Math.min(W,par.right)+1||q.left<par.left-1) bad.push(e.id+'잘림');});
  for(let i=0;i<vis.length;i++)for(let j=i+1;j<vis.length;j++){const a=vis[i].getBoundingClientRect(),c=vis[j].getBoundingClientRect(); if(a.right>c.left+1&&c.right>a.left+1&&a.bottom>c.top&&c.bottom>a.top) bad.push(vis[i].id+'/'+vis[j].id+'겹침');}
  const L=document.querySelector('#topbar .left'),R=document.querySelector('#topbar .right');
  const hid=[...document.querySelectorAll('#topbar .fit-hide')].map(e=>e.id||'이름');const shown=getComputedStyle(document.getElementById('installBtn')).display;return {hid,inst:shown,bad, lsc:L.scrollWidth-L.clientWidth, rsc:R.scrollWidth-R.clientWidth, h:document.getElementById('topbar').offsetHeight}});
 out.push(w+' '+JSON.stringify(r));
 await c.close();}
console.log(out.join('\n'));await b.close();})();
