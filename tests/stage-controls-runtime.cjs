const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {createRequire} = require('node:module');
const repo=process.env.DREAMLAND_REPO || path.resolve(__dirname,'..');
const sourceRoot=process.env.CONTROLS_SOURCE_ROOT || repo;
const localRequire=createRequire(repo+'/package.json');
const ts=localRequire('typescript');
const React=localRequire('react');
const {JSDOM}=localRequire('jsdom');
const dom=new JSDOM('<html><body><div id="root"></div></body></html>',{url:'https://example.test'});
Object.assign(global,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
const {createRoot}=localRequire('react-dom/client');
const cache={};
function load(name){
 if(cache[name]) return cache[name];
 const text=fs.readFileSync(sourceRoot+'/src/ui/'+name+'.tsx','utf8');
 const code=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const mod={exports:{}};
 new Function('require','module','exports',code)(id=>id.startsWith('@/ui/')?load(id.slice(5)):localRequire(id),mod,mod.exports);
 cache[name]=mod.exports; return mod.exports;
}
const root=createRoot(document.getElementById('root'));
const {WardrobeSheet}=load('WardrobeSheet');
let selectedHair=null;
React.act(()=>root.render(React.createElement(WardrobeSheet,{title:'Style studio',outfit:'glam',hair:'blonde',accessory:'none',shoes:'heels',unlocked:['glam','beach'],points:50,notice:null,onOutfit:()=>{},onHair:id=>selectedHair=id,onAccessory:()=>{},onShoes:()=>{},onClose:()=>{}})));
assert(document.querySelector('.dream-panel-wardrobe'),'wardrobe uses compact transparent-top panel');
assert.equal(document.querySelector('.panel-backdrop'),null,'wardrobe leaves world clear');
assert.equal(document.querySelectorAll('[role="tab"]').length,4,'all style categories are available');
const hairTab=[...document.querySelectorAll('[role="tab"]')].find(x=>x.textContent==='Hair');
React.act(()=>hairTab.click());
React.act(()=>document.querySelector('[aria-label^="Bubble Pony"]').click());
assert.equal(selectedHair,'pink','hair choice reaches existing callback');
assert.equal(document.querySelectorAll('select').length,0,'wardrobe uses no native dropdown');
React.act(()=>root.unmount());
const gameRoot=createRoot(document.getElementById('root'));
const {DjGame}=load('DjGame');
const timers=new Map(); let seq=0;
const oldSet=global.setTimeout, oldClear=global.clearTimeout, oldRandom=Math.random;
global.setTimeout=callback=>{const id=++seq;timers.set(id,callback);return id;};
global.clearTimeout=id=>timers.delete(id);
Math.random=()=>.99;
let milestones=0,finishScore=null;
try{
 React.act(()=>gameRoot.render(React.createElement(DjGame,{onClose:()=>{},onMilestone:()=>milestones++,onFinish:score=>finishScore=score})));
 assert(document.querySelector('.dream-panel-stage'),'DJ uses compact stage');
 assert.equal(document.querySelector('.panel-backdrop'),null,'no dark dancer backdrop');
 assert.equal(document.querySelectorAll('.rhythm-pad').length,4,'four pads share a single strip');
 for(let beat=1;beat<=10;beat++){
  const entry=timers.entries().next().value; assert(entry,'next beat scheduled');timers.delete(entry[0]);
  React.act(()=>entry[1]());
  const active=document.querySelector('.rhythm-pad-active');
  assert(active,`beat ${beat} has a playable window`);
  assert(active.getAttribute('aria-label').includes('SYNTH'),'fourth pad can be selected after a successful hit');
  React.act(()=>active.click());
 }
 assert.equal(milestones,10,'all ten beats can be scored');
 const entry=timers.entries().next().value;timers.delete(entry[0]);React.act(()=>entry[1]());
 assert(document.querySelector('.stage-result'),'result appears after the last playable beat');
 React.act(()=>document.querySelector('.stage-collect').click());
 assert.equal(finishScore,80,'collect returns the full score');
 React.act(()=>gameRoot.unmount());
 console.log('PASS: wardrobe tabs/selection, transparent panels, four pads, all ten DJ beats, fourth pad access, reward score');
}finally{global.setTimeout=oldSet;global.clearTimeout=oldClear;Math.random=oldRandom;}
