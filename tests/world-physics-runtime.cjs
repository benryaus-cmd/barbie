const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const cache = new Map();
// Load the package's exact browser WASM binary in Node, including the generated
// bindings. The real Rapier World/controller execute every movement assertion.
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  if (file.endsWith('.wasm')) {
    const binding = load(path.join(path.dirname(file), 'rapier_wasm3d_bg.js'));
    const instance = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(file)), {'./rapier_wasm3d_bg.js':binding});
    return instance.exports;
  }
  const mod = {exports:{}};cache.set(file,mod);
  const code = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,allowJs:true}}).outputText;
  const requireLocal = id => {
    let next;
    if (id === '@dimforge/rapier3d') next=path.resolve('node_modules/@dimforge/rapier3d/rapier.js');
    else if (id.startsWith('@/')) next=path.resolve('src',id.slice(2));
    else if (id.startsWith('.')) next=path.resolve(path.dirname(file),id);
    else return require(id);
    if (!fs.existsSync(next) || fs.statSync(next).isDirectory()) next=[next+'.ts',next+'.js',path.join(next,'index.js')].find(p=>fs.existsSync(p));
    return load(next);
  };
  new Function('require','module','exports',code)(requireLocal,mod,mod.exports);
  return mod.exports;
}
const {createPhysics,FEET_OFFSET}=load(path.resolve('src/game/physics.ts'));
const {createBuilder}=load(path.resolve('src/game/builder.ts'));
const {buildDreamhouse}=load(path.resolve('src/game/world/dreamhouse.ts'));
const errors=[],samples=[];
for(const [x,z] of [[57,31],[51,42],[55,46],[64,34],[-63,22]]) {
  const beach=createPhysics([],{x,y:FEET_OFFSET+.15,z});let minimum=Infinity;
  for(let i=0;i<120;i++){beach.step(0,0,0,false,1/60);minimum=Math.min(minimum,beach.position.y);}
  samples.push({x,z,y:beach.position.y,minimum});beach.free();
  if(minimum<FEET_OFFSET-.05)errors.push(`Visible terrain lacks ground at ${x},${z}: minimum y ${minimum}`);
}
const colliders=[];buildDreamhouse(createBuilder(colliders));
const rig=createPhysics(colliders,{x:-8.1,y:FEET_OFFSET+.2,z:-41.8});
const walk=(x,z,frames)=>{for(let i=0;i<frames;i++)rig.step(x,z,2.4,false,1/60);};
const walkTo=(x,z)=>{for(let i=0;i<600;i++){const dx=x-rig.position.x,dz=z-rig.position.z,d=Math.hypot(dx,dz);if(d<.06)break;rig.step(dx/d,dz/d,Math.min(2.4,d*8),false,1/60);}walk(0,0,20);};
walk(0,0,30);walkTo(-8.1,-51.15);
const top={...rig.position};
if(top.y<3.9+FEET_OFFSET-.08||top.z>-50.3)errors.push(`Stair ascent blocked: ${JSON.stringify(top)}`);
walkTo(-5.8,-51.15);const loft={...rig.position};
if(loft.x<-6||loft.y<3.9+FEET_OFFSET-.08)errors.push(`Landing cannot enter loft: ${JSON.stringify(loft)}`);
walkTo(-8.1,-51.15);walkTo(-8.1,-41.8);walk(0,0,35);const bottom={...rig.position};
if(bottom.z<-42.1||bottom.y>FEET_OFFSET+.3)errors.push(`Stair descent blocked: ${JSON.stringify(bottom)}`);
rig.free();
console.log(JSON.stringify({errors,samples,top,loft,bottom},null,2));
assert.deepEqual(errors,[],'World traversal must stay supported without jumping');
console.log('PASS real Rapier ground coverage, stair ascent, loft landing and descent');
