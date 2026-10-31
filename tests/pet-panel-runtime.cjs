const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript'),React=require('react'),{JSDOM}=require('jsdom');
const dom=new JSDOM('<html><body><div id="root"></div></body></html>',{url:'https://example.test'});
Object.assign(global,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
const {createRoot}=require('react-dom/client'),cache={};
function load(name){if(cache[name])return cache[name];const source=fs.readFileSync('src/'+name+'.tsx','utf8');const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;const mod={exports:{}};new Function('require','module','exports',code)(id=>id.endsWith('.css')?{}:id.startsWith('./')?load(path.posix.join(path.posix.dirname(name),id)):require(id),mod,mod.exports);return cache[name]=mod.exports;}
const {PetCompanionPanel,EmotePanel}=load('ui/LifestylePanels');const root=createRoot(document.getElementById('root')),actions=[];const props={bond:4,toys:[],points:0,onAction:a=>actions.push(a),onMode:a=>actions.push(a),onPhoto(){},onClose(){}};
function button(text){return [...document.querySelectorAll('button')].find(b=>b.textContent.includes(text))}
React.act(()=>root.render(React.createElement(PetCompanionPanel,{...props,following:false})));
assert(document.body.textContent.includes('Resting at home'),'panel explains default bed mode');
React.act(()=>button('Follow me').click());assert.equal(actions.at(-1),'follow');
React.act(()=>root.render(React.createElement(PetCompanionPanel,{...props,following:true})));
assert(document.body.textContent.includes('Following you'));
React.act(()=>button('Back to bed').click());assert.equal(actions.at(-1),'bed');
React.act(()=>button('Whistle').click());assert.equal(actions.at(-1),'whistle');
React.act(()=>button('Pat Mochi').click());assert.equal(actions.at(-1),'pat');
React.act(()=>root.render(React.createElement(EmotePanel,{onClose(){},onPose:p=>actions.push(p)})));
for(const [label,pose] of [['Hug','hug'],['Arm around','arm-around'],['Half heart','half-heart'],['Salute','salute'],['Curtsy','curtsy'],['Jump','jump']]){React.act(()=>button(label).click());assert.equal(actions.at(-1),pose)}
React.act(()=>root.unmount());console.log('PASS pet mode controls and expanded emotes reach game callbacks');
