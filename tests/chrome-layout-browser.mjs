import {createServer} from 'vite';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const fixture = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body><div id="root"></div><script type="module">
import React from 'react';
import {createRoot} from 'react-dom/client';
import {Hud} from '/src/ui/Hud.tsx';
import {CameraControls} from '/src/ui/CameraControls.tsx';
import '/src/index.css';import '/src/collection.css';
const e=React.createElement;const noop=()=>{};
const props={points:1500,earned:2500,tokens:4,followers:25,cardCount:2,zoneName:'Dream Plaza',onLeaderboard:noop,onAlbum:noop,onSettings:noop,onCamera:noop,onEmotes:noop,onPet:noop};
window.orbit=[];window.zoom=[];
createRoot(document.getElementById('root')).render(e('div',{className:'app-shell'},e('div',{className:'ui-layer'},e('div',{className:'flex h-full flex-col justify-between'},e(Hud,props),e('div',{className:'dream-controls flex items-end justify-between gap-3 px-3 pb-3'},e('div',{className:'movement-stick'}),e('button',{className:'world-action'},'Jump'))),e(CameraControls,{disabled:true,onOrbit:(...v)=>window.orbit.push(v),onZoom:v=>window.zoom.push(v)}))));
</script></body></html>`;
const server=await createServer({mode:'production',plugins:[{name:'chrome-layout-fixture',configureServer(server){server.middlewares.use(async(req,res,next)=>{if(req.url.startsWith('/__chrome-fixture')){res.setHeader('Content-Type','text/html');res.end(await server.transformIndexHtml(req.url,fixture));}else if(req.url.startsWith('/__chrome-host')){res.setHeader('Content-Type','text/html');res.end('<iframe src="/__chrome-fixture" style="width:360px;height:'+new URL(req.url,'http://local').searchParams.get('height')+'px;border:0;display:block"></iframe>');}else next();});}}],server:{host:'127.0.0.1',port:0,watch:{ignored:['**/*']}}});
await server.listen();
const url='http://127.0.0.1:'+server.httpServer.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
try{
 for(const height of [520,800])for(const embedded of [false,true]){
  const page=await browser.newPage({viewport:embedded?{width:1000,height:1100}:{width:360,height}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const client=await page.context().newCDPSession(page);
  await client.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:80,bottom:90,left:0,right:0}});
  await page.goto(url+(embedded?'/__chrome-host?height='+height:'/__chrome-fixture'));
  const frame=embedded?page.frames().find(frame=>frame.parentFrame()):page.mainFrame();
  await frame.waitForSelector('.hud-followers');
  const bounds=await frame.evaluate(()=>{
   const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,width:r.width}};
   const style=getComputedStyle(document.querySelector('.ui-layer'));
   const safe=document.createElement('div');safe.style.paddingTop='env(safe-area-inset-top)';document.body.append(safe);
   const safeTop=getComputedStyle(safe).paddingTop;safe.remove();
   const camera=getComputedStyle(document.querySelector('.camera-controls'));
   return {viewport:innerHeight,root:rect('#root'),app:rect('.app-shell'),ui:rect('.ui-layer'),hud:rect('.dream-hud'),wallet:rect('.hud-wallet'),location:rect('.hud-location'),controls:rect('.dream-controls'),stick:rect('.movement-stick'),followers:rect('.hud-followers'),safeTop,padding:style.padding,camera:{background:camera.backgroundColor,border:camera.borderWidth,text:document.querySelector('.camera-controls').textContent}};
  });
  assert.equal(bounds.app.height,height);assert.equal(bounds.ui.height,height);assert.equal(bounds.root.height,height);
  assert.equal(bounds.hud.top,0);assert.equal(bounds.wallet.top,6,'HUD starts 6px below game top');assert.equal(bounds.location.top,6);
  assert.equal(bounds.controls.bottom,height);assert.equal(bounds.stick.bottom,height-6,'joystick sits 6px from game bottom');
  assert(bounds.followers.bottom<bounds.stick.top,'follower progress remains above joystick');
  assert.equal(bounds.padding,'0px');assert.equal(bounds.camera.background,'rgba(0, 0, 0, 0)');assert.equal(bounds.camera.border,'0px');assert.equal(bounds.camera.text,'');
  assert.deepEqual(errors,[]);results.push({height,embedded,...bounds});
  await page.close();
 }
 console.log('PASS: 360x520 and 360x800 direct + real iframe; safe-area override 80px/90px; full UI height; HUD 6px and joystick 6px; follower/joystick separation; transparent camera');
 console.log(JSON.stringify(results));
}finally{await browser.close();await server.close();}
