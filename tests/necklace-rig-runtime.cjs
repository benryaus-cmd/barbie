const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const repo = process.env.DREAMLAND_REPO || path.resolve(__dirname, '..'), localRequire = createRequire(repo + '/package.json');
const THREE = localRequire('three'), ts = localRequire('typescript');
const filename = repo + '/src/game/character/necklace-rig.ts';
assert(fs.existsSync(filename), 'surface-following necklace module exists');
const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} }; new Function('require', 'module', 'exports', code)(localRequire, mod, mod.exports);
const world = new THREE.Group(), spine = new THREE.Group(); world.add(spine);
const gold = new THREE.MeshStandardMaterial({ color: 0xf6c35e }), pink = new THREE.MeshStandardMaterial({ color: 0xff4999 });
const rig = mod.exports.createNecklaceRig(spine, gold, pink), idle = { moving: false, speed: 0, dancing: false, phase: 0 };
assert.equal(rig.root.parent, spine, 'neck anchors follow the articulated torso');
const chain = rig.root.getObjectByName('necklace chain'), pendant = rig.root.getObjectByName('necklace pendant');
assert(chain?.isMesh && pendant, 'visible continuous chain and attached heart are present');
const readChain = () => Array.from({ length: chain.geometry.attributes.position.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(chain.geometry.attributes.position, i));
const readPendant = () => {
 rig.root.updateWorldMatrix(true, true); const inverse = rig.root.matrixWorld.clone().invert(), points = [];
 pendant.traverse(mesh => { if (mesh.isMesh) { const transform = inverse.clone().multiply(mesh.matrixWorld), positions = mesh.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) points.push(new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(transform));
 } }); return points;
};
// These are the real avatar's skin, neck and eight tops' common outer profiles.
// Reverting to the old fixed z=.143 chain must fail against cloth at y=.333.
const shells = [
 { depth: .68, points: [[.151,.23],[.194,.32],[.204,.37],[.15,.415],[.075,.44]] },
 { depth: .88, points: [[.067,.415],[.055,.5],[.065,.54]] },
 { depth: .74, points: [[.17,.26],[.207,.33],[.194,.37]] },
];
function front(x, y) {
 let z = 0;
 for (const { depth, points } of shells) for (let i = 1; i < points.length; i++) {
  const [a, low] = points[i-1], [b, high] = points[i];
  if (y >= low && y <= high) { const radius = a + (b-a)*(y-low)/(high-low); z = Math.max(z, depth*Math.sqrt(Math.max(0,radius*radius-x*x))); }
 } return z;
}
function assertClear(points, label) {
 for (const p of points) {
  assert(Number.isFinite(p.x+p.y+p.z), `${label} remains finite`);
  assert(p.z >= front(p.x,p.y)+.0005, `${label} clears actual body/cloth: ${p.toArray()} front=${front(p.x,p.y)}`);
 }
}
const rest = readChain(), pendantRest = readPendant();
assertClear(rest, 'rest chain'); assertClear(pendantRest, 'rest heart');
assert(rest.some(p => Math.abs(p.x)<.008 && p.y<.345), 'chain hangs in a U down to the heart');
assert(Math.max(...rest.map(p=>p.y))>.46 && Math.min(...rest.map(p=>p.y))<.345, 'chain spans neck to upper bust');
const fixed = rest.map((p,i)=>p.y>.465 ? i : -1).filter(i=>i>=0); assert(fixed.length>5, 'both neck-end rings can be inspected');
const geometry = chain.geometry, position = chain.geometry.attributes.position;
rig.update(1/60,idle); spine.position.x=.09; rig.update(1/60,idle);
const kicked = readChain();
assert(kicked.some((p,i)=>p.y<.37 && p.distanceTo(rest[i])>.0002), 'real world translation excites lower chain');
assert(readPendant().some((p,i)=>p.distanceTo(pendantRest[i])>.0002), 'heart has subtle inertia when torso translates');
for (const i of fixed) assert(kicked[i].distanceTo(rest[i])<1e-8,'neck ends stay anchored');
for (let frame=0;frame<480;frame++) {
 spine.position.set(Math.sin(frame*.19)*.15,Math.cos(frame*.21)*.04,Math.sin(frame*.17)*.15);
 spine.rotation.set(Math.sin(frame*.11)*.6,Math.sin(frame*.09)*1.3,Math.sin(frame*.13)*.25);
 rig.update(1/60,{moving:true,speed:5,dancing:true,phase:frame*.13});
 const points=readChain(); assertClear(points,'moving chain'); assertClear(readPendant(),'moving heart');
 for (const i of fixed) assert(points[i].distanceTo(rest[i])<1e-8,'neck ends never slide while walking/dancing');
 assert(points.every((p,i)=>p.distanceTo(rest[i])<.018),'chain sway stays gentle and supported');
 assert(readPendant().every((p,i)=>p.distanceTo(pendantRest[i])<.025),'heart sway stays bounded');
}
assert.equal(chain.geometry,geometry,'animation reuses chain geometry'); assert.equal(chain.geometry.attributes.position,position,'animation reuses vertex buffer');
spine.position.set(0,0,0); spine.rotation.set(0,0,0);
for(let frame=0;frame<600;frame++)rig.update(1/60,idle);
assert(Math.max(...readChain().map((p,i)=>p.distanceTo(rest[i])))<.0001,'spring recovers after motion stops');
assert(Math.max(...readPendant().map((p,i)=>p.distanceTo(pendantRest[i])))<.0001,'heart settles to its supported rest');
for(const dt of [0,-1,NaN,Infinity,5,.5,1/120]) { spine.position.x+=.2; rig.update(dt,{moving:true,speed:Infinity,dancing:true,phase:NaN}); assertClear(readChain(),'time discontinuity chain'); assertClear(readPendant(),'time discontinuity heart'); }
rig.update(1,idle);
assert(Math.max(...readChain().map((p,i)=>p.distanceTo(rest[i])))<.0001,'pause/teleport clears stale spring energy');
assert.equal(chain.material,gold,'chain retains shared gold material');
console.log('PASS: exterior U chain and heart, stable neck anchors, real transform inertia, gentle bounded sway, world pitch, finite time spikes, reused buffers and damped/pause recovery');

// Raycast the actual authored tops as well as the independent body ellipses.
// This catches raised collars/trim omitted by a fitted-bodice-only collision shell.
const modules = {};
function load(name) {
 if(modules[name])return modules[name];
 const entry={exports:{}}, file=repo+'/src/'+name+'.ts'; modules[name]=entry.exports;
 const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 new Function('require','module','exports',source)(id=>id.startsWith('@/')?load(id.slice(2)):id.startsWith('./')?load(path.posix.join(path.posix.dirname(name),id)):localRequire(id),entry,entry.exports);
 return modules[name]=entry.exports;
}
const avatar=load('game/avatar').createAvatar(); avatar.group.updateMatrixWorld(true);
const waist=avatar.group.getObjectByName('waist'), ray=new THREE.Raycaster(), direction=new THREE.Vector3(0,0,-1).transformDirection(waist.matrixWorld);
for(const id of ['glam','beach','popstar','casual','sunset','denim','sport','midnight']) {
 const top=avatar.group.getObjectByName('top '+id); assert(top,`${id} top exists`);
 for(const p of [...rest,...pendantRest,...kicked]) {
  const origin=new THREE.Vector3(p.x,p.y,.5).applyMatrix4(waist.matrixWorld); ray.set(origin,direction);
  const intersections=ray.intersectObject(top,true);
  if(intersections.length) {
   const cloth=waist.worldToLocal(intersections[0].point.clone());
   assert(p.z>=cloth.z+.0002,`${id} raised trim stays behind chain/heart at ${p.toArray()} cloth=${cloth.toArray()}`);
  }
 }
}
console.log('PASS: actual all-eight-top raycasts, including puff sleeves, halter straps, sport collar and raised decorative trim');
