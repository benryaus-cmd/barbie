const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict');
const m={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync('src/game/movement.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(m,m.exports);
const steering=m.exports.createSteering();
const initial=steering.direction(.7,.7,0);for(let i=0;i<600;i++){const d=steering.direction(.7,.7,-i*.01);assert(Math.abs(d.x-initial.x)<1e-9);assert(Math.abs(d.z-initial.z)<1e-9,'camera cannot curve a held diagonal');}
const up=steering.direction(0,1,-Math.PI/2);assert(up.x>.999&&Math.abs(up.z)<1e-9,'deliberate up maps to new screen forward');
assert.equal(steering.direction(0,-1,0).follow,false,'backward walk keeps front view');
assert.deepEqual(steering.direction(0,.05,0),{x:0,z:0,follow:false});assert.deepEqual(steering.direction(NaN,0,0),{x:0,z:0,follow:false});
console.log('PASS stable held direction, deliberate screen reanchor, backward view and input deadzone');
