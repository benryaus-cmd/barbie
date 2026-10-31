const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const repo=process.env.DREAMLAND_REPO||path.resolve(__dirname,'..');
const sourceRoot=process.env.PHOTO_SOURCE_ROOT||repo;
const localRequire=createRequire(repo+'/package.json');
const ts=localRequire('typescript'),React=localRequire('react'),{JSDOM}=localRequire('jsdom');
const dom=new JSDOM('<html><body><div id="root"></div></body></html>',{url:'https://example.test'});
Object.assign(global,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true,localStorage:dom.window.localStorage});
const {createRoot}=localRequire('react-dom/client');
const cache={};
function load(name){
 if(cache[name])return cache[name];
 const filename=sourceRoot+'/src/'+name+(name.startsWith('ui/')?'.tsx':'.ts');
 const source=fs.readFileSync(filename,'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
 const mod={exports:{}};
 new Function('require','module','exports',code)(id=>id.endsWith('.css')?{}:id.startsWith('@/')?load(id.slice(2)):id.startsWith('./')?load(path.posix.join(path.posix.dirname(name),id)):localRequire(id),mod,mod.exports);
 return cache[name]=mod.exports;
}
const timers=new Map();let seq=0;
const oldSet=global.setTimeout,oldClear=global.clearTimeout,oldRandom=Math.random,oldPerformance=global.performance;
global.setTimeout=callback=>{const id=++seq;timers.set(id,callback);return id};global.clearTimeout=id=>timers.delete(id);Math.random=()=>.99;
let now=0;global.performance=new Proxy(oldPerformance,{get(target,key){if(key==='now')return ()=>now;const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});
function nextTimer(){const entry=timers.entries().next().value;assert(entry,'timer scheduled');timers.delete(entry[0]);React.act(()=>entry[1]())}
let root;
try{
 let poses=[],captures=0,milestones=0,finished=null;
 root=createRoot(document.getElementById('root'));
 const {PhotoGame}=load('ui/PhotoGame');
 React.act(()=>root.render(React.createElement(PhotoGame,{onClose(){},onMilestone(){milestones++},onFinish:score=>finished=score,onPose:pose=>poses.push(pose),onCapture:()=>captures++})));
 assert(document.querySelector('.dream-panel-stage'));assert(!document.querySelector('.panel-backdrop'));
 assert.equal(document.querySelectorAll('.challenge-pose-strip button').length,4);
 for(let i=0;i<6;i++){React.act(()=>document.querySelector('[aria-label="Pose Blow kiss"]').click());assert.equal(poses.at(-1),'kiss','actual selected kiss reaches avatar');assert.equal(captures,i,'capture waits for pose render');nextTimer();}
 assert.equal(milestones,6);assert.equal(captures,6);
 React.act(()=>document.querySelector('.stage-collect').click());assert.equal(finished,60);
 React.act(()=>root.unmount());timers.clear();
 root=createRoot(document.getElementById('root'));
 const {RunwayGame}=load('ui/RunwayGame');poses=[];milestones=0;
 React.act(()=>root.render(React.createElement(RunwayGame,{onClose(){},onMilestone(){milestones++},onFinish:score=>finished=score,onPose:pose=>poses.push(pose)})));
 assert(!document.querySelector('.panel-backdrop'),'runway keeps scene undimmed');
 for(let i=0;i<6;i++){now+=990;React.act(()=>document.querySelector('.runway-pose').click());nextTimer();}
 assert.deepEqual(poses,['peace','spin','wave','kiss','heart','spin']);
 React.act(()=>document.querySelector('.stage-collect').click());assert.equal(finished,108);assert.equal(milestones,6);
 React.act(()=>root.unmount());timers.clear();
 root=createRoot(document.getElementById('root'));
 const {PhotoStudio}=load('ui/PhotoStudio');let companions=[],followers=0;
 React.act(()=>root.render(React.createElement(PhotoStudio,{onClose(){},capture:()=> 'data:image/jpeg;base64,/9j/AA==',onPose:pose=>poses.push(pose),onCompanion:id=>companions.push(id),initialCompanion:'pet',followers:0,onFollowers:value=>followers=value,look:{top:'glam',bottom:'gown',accessories:[],topColor:'#ff33aa',bottomColor:'#ffffff'},zone:'Beach'})));
 assert.equal(companions[0],'pet','NPC/pet selfie starts with requested companion');
 React.act(()=>document.querySelector('.photo-shutter').click());
 React.act(()=>document.querySelector('.photo-library-button').click());
 assert.equal(document.querySelectorAll('.photo-album-grid button').length,1);
 React.act(()=>document.querySelector('.photo-album-grid button').click());
 React.act(()=>document.querySelector('.photo-publish').click());
 assert(followers>0);assert(document.querySelector('.dream-post-image'),'published post displays actual capture');
 assert(document.querySelector('.dream-comments').textContent.includes('heart'),'pet gets contextual fictional comments');
 assert(document.querySelector('.photo-browser .panel-heading').textContent.includes('offline'),'offline nature is clear');
 React.act(()=>root.unmount());assert.equal(companions.at(-1),null,'leaving removes temporary companion');
 console.log('PASS: compact photo/runway panels, exact poses, six scored captures, 108 runway points, initial pet companion, captured album image, offline feed and follower reward');
}finally{global.setTimeout=oldSet;global.clearTimeout=oldClear;Math.random=oldRandom;global.performance=oldPerformance;}
