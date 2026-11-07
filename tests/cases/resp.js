const { chromium } = require('/opt/node22/lib/node_modules/playwright');
/* R04 반응형: 320 폭(아주 크게)·가로 작은 폰·485 폭(작게)에서 모든 앱 첫 화면과 메뉴 화면의 가로 넘침·잘림·오류 */
const APPS = require('fs').readFileSync(require('path').join(__dirname,'../../shared/apps.js'),'utf8').match(/id: '([a-z]+)'/g).map(x=>x.slice(5,-1));
(async()=>{const b=await chromium.launch();const bad=[];let n=0;
for (const [vw,vh] of [[320,640],[640,320],[485,900]]) {
 const c=await b.newContext({viewport:{width:vw,height:vh},isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await c.newPage();
 await p.addInitScript(()=>{window.__err=[];addEventListener('error',e=>window.__err.push(e.message));});
 for (const a of APPS) {
  await p.goto('http://127.0.0.1:8765/apps/'+a+'/index.html'); await p.waitForTimeout(150);
  const items = await p.locator('.kl-menu-item').count();
  for (let i=-1;i<items;i++){
   if(i>=0){ await p.goto('http://127.0.0.1:8765/apps/'+a+'/index.html'); await p.waitForTimeout(100); await p.locator('.kl-menu-item').nth(i).click().catch(()=>{}); await p.waitForTimeout(250); }
   n++;
   const r=await p.evaluate(()=>{const W=innerWidth;const over=document.documentElement.scrollWidth-W;
     const cut=[...document.querySelectorAll('button,.kl-choice,.kl-prompt,svg,canvas,input,img,.kl-btn')].filter(e=>{const q=e.getBoundingClientRect();if(!q.width||!q.height)return false; if(getComputedStyle(e).visibility==='hidden')return false; let p=e.parentElement; while(p){const cs=getComputedStyle(p); if(/(auto|scroll)/.test(cs.overflowX))return false; p=p.parentElement;} return q.right>W+2||q.left<-2;}).slice(0,2).map(e=>(e.className&&e.className.baseVal!==undefined?e.tagName:(e.className||e.tagName))+':'+Math.round(e.getBoundingClientRect().left)+'~'+Math.round(e.getBoundingClientRect().right));
     return {over,cut,err:window.__err.slice(0,1)}});
   if(r.over>1||r.cut.length||r.err.length) bad.push(vw+'x'+vh+' '+a+'#'+i+' over'+r.over+' '+r.cut.join(',')+' '+r.err.join(''));
  }
 }
 await c.close();}
console.log('화면 '+n+' · 문제 '+bad.length); if(bad.length) console.log(bad.slice(0,8).join('\n')); await b.close();})();
