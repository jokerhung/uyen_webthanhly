// Reproducible reference-only Chrome DevTools Protocol capture; no dependencies.
// Run: node docs/reference/capture.mjs (Chrome must be installed at the path below).
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const out = dirname(fileURLToPath(import.meta.url));
const profile = await mkdtemp(join(tmpdir(), 'hun-reference-chrome-'));
const port = 19371;
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`,
  'about:blank'], { stdio: 'ignore' });
let socket, pending = new Map(), id = 0;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function send(method, params = {}) {
  const key = ++id;
  const promise = new Promise((resolve, reject) => pending.set(key, {resolve, reject}));
  socket.send(JSON.stringify({id:key, method, params}));
  const response = await promise;
  if(response.error) throw Error(JSON.stringify(response.error));
  return response.result;
}
async function evalJS(expression) {
  const response = await send('Runtime.evaluate', {expression, returnByValue:true, awaitPromise:true});
  if(response.exceptionDetails) throw Error(response.exceptionDetails.text);
  return response.result.value;
}
async function ready() {
  for(let i=0;i<100;i++) {
    try { const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if(tabs.find(t => t.type==='page')) return tabs.find(t => t.type==='page'); } catch {}
    await wait(100);
  }
  throw Error('Chrome debugging endpoint unavailable');
}
const routes = [['home','/'],['about','/about'],['consign','/consign'],['buy','/buy'],['sales','/sales']];
const sizes = [['desktop',1440,900],['mobile',390,844]];
let results = [];
try {
  const tab = await ready();
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve,reject) => {socket.addEventListener('open',resolve,{once:true}); socket.addEventListener('error',reject,{once:true});});
  socket.addEventListener('message', e => {const msg=JSON.parse(e.data); if(msg.id && pending.has(msg.id)) {const p=pending.get(msg.id);pending.delete(msg.id);p.resolve(msg);}});
  await send('Page.enable'); await send('Runtime.enable');
  for(const [device,width,height] of sizes) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:device==='mobile'});
    for(const [name,path] of routes) {
      const url='https://hunthanhlykygui.com'+path;
      await send('Page.navigate',{url});
      for(let i=0;i<100;i++) {
        const state=await evalJS('({path:location.pathname, loaded:!!document.querySelector(".fashion-app .view-section, .fashion-app .view-home"), fonts:document.fonts.status})');
        if(state.loaded && state.path===path && state.fonts==='loaded') break;
        await wait(100);
      }
      await evalJS('document.fonts.ready.then(()=>true)');
      await wait(400);
      async function capture(state) {
        const key=`${name}-${state}-${device}-${width}x${height}`;
        const report=await evalJS(`(() => {
          const selector=['.ticker','.back-btn','.view-section','.section-wrapper','.section-heading','.methods','.methods__tabs','.methods__panel','.home-title','.home-nav','.footer','.input-section h2'];
          const metrics={}; for(const s of selector) {let el=document.querySelector(s);if(!el)continue;let r=el.getBoundingClientRect(),c=getComputedStyle(el);metrics[s]={x:r.x,y:r.y,width:r.width,height:r.height,fontFamily:c.fontFamily,fontSize:c.fontSize,fontWeight:c.fontWeight,lineHeight:c.lineHeight,letterSpacing:c.letterSpacing,color:c.color,backgroundColor:c.backgroundColor,position:c.position};}
          let scrollers=[...document.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+200 && getComputedStyle(e).overflowY!=='visible').map(e=>({tag:e.tagName,className:typeof e.className==='string'?e.className:'',scrollTop:e.scrollTop,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight}));
          return {url:location.href,title:document.title,viewport:{innerWidth,innerHeight,devicePixelRatio},document:{scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight},scrollers,tabLabels:[...document.querySelectorAll('.methods__tab')].map(x=>({label:x.textContent.trim(),active:x.classList.contains('is-active')})),stepCount:document.querySelectorAll('.methods__panel .step').length,images:[...document.images].map(x=>({src:x.src.startsWith('data:')?'data URI ('+x.src.length+' chars)':x.src,alt:x.alt,loaded:x.complete&&x.naturalWidth>0})),externalLinks:[...new Set([...document.querySelectorAll('a[href]')].map(a=>a.href).filter(h=>!h.startsWith(location.origin)))],metrics};
        })()`);
        const png=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
        await writeFile(join(out,`${key}.png`),Buffer.from(png.data,'base64'));
        results.push({file:`${key}.png`,state,...report});
        console.log(`${key}: ${report.url}, steps=${report.stepCount}, document=${report.document.scrollWidth}x${report.document.scrollHeight}`);
      }
      await capture('default');
      if(name==='consign'||name==='buy') {
        await evalJS(`(() => {document.querySelector('.methods__tabs').scrollIntoView({block:'start',behavior:'instant'});document.querySelector('.tab-content').scrollTop-=110;return true})()`);
        await wait(250); await capture('direct-panel');
        const clicked=await evalJS(`(() => {let b=[...document.querySelectorAll('.methods__tab')].find(x=>/Online/i.test(x.textContent));if(!b)return false;b.click();return true})()`);
        if(!clicked) throw Error(`${name} Online tab not found`);
        await wait(300); await capture('online-panel');
      }
      if(name!=='home' && name!=='sales') {
        const scrolling=await evalJS(`(() => {let a=[...document.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+200 && getComputedStyle(e).overflowY!=='visible').sort((a,b)=>b.scrollHeight-b.clientHeight-(a.scrollHeight-a.clientHeight));let e=a[0]||document.scrollingElement;e.scrollTop=e.scrollHeight-e.clientHeight;return {tag:e.tagName,className:e.className,scrollTop:e.scrollTop,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight}})()`);
        await wait(300); await capture('bottom');
        console.log(`${name} ${device} bottom scroll: ${JSON.stringify(scrolling)}`);
      }
    }
  }
  await writeFile(join(out,'browser-measurements.json'),JSON.stringify({capturedAt:new Date().toISOString(),chrome:await send('Browser.getVersion'),results},null,2)+'\n');
} finally {socket?.close();chrome.kill(); await wait(500);await rm(profile,{recursive:true,force:true,maxRetries:3});}
