const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module'),repo=process.env.DREAMLAND_REPO||path.resolve(__dirname,'..'),localRequire=createRequire(repo+'/package.json');
const THREE=localRequire('three'),ts=localRequire('typescript'),modules={};
function load(name){
 if(modules[name])return modules[name];
 const entry={exports:{}},file=repo+'/src/'+name+'.ts';modules[name]=entry.exports;
 const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 new Function('require','module','exports',source)(id=>id.startsWith('@/')?load(id.slice(2)):id.startsWith('./')?load(path.posix.join(path.posix.dirname(name),id)):localRequire(id),entry,entry.exports);
 return modules[name]=entry.exports;
}
const {createNecklaceRig}=load('game/character/necklace-rig'),{createSurfaceMap}=load('game/character/surface-map');
const avatar=load('game/avatar').createAvatar();avatar.group.updateMatrixWorld(true);
const waist=avatar.group.getObjectByName('waist'),skin=avatar.group.getObjectByName('nose continuous surface').material;
const body=waist.children.filter(node=>node.isMesh&&node.material===skin);assert(body.length,'test samples actual torso skin');
const world=new THREE.Group(),spine=new THREE.Group();world.add(spine);
const gold=new THREE.MeshStandardMaterial({color:0xf6c35e}),pink=new THREE.MeshStandardMaterial({color:0xff4999});
const rig=createNecklaceRig(spine,gold,pink),idle={moving:false,speed:0,dancing:false,phase:0};
assert.equal(typeof rig.setSurface,'function','necklace accepts actual selected-top surface instead of global collar envelope');
assert.equal(rig.root.parent,spine,'neck anchors follow the articulated torso');
const chain=rig.root.getObjectByName('necklace chain'),pendant=rig.root.getObjectByName('necklace pendant');
assert(chain?.isMesh&&pendant,'continuous chain and attached heart are present');
const readChain=()=>Array.from({length:chain.geometry.attributes.position.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(chain.geometry.attributes.position,i));
const readPendant=()=>{rig.root.updateWorldMatrix(true,true);const inverse=rig.root.matrixWorld.clone().invert(),points=[];pendant.traverse(mesh=>{if(mesh.isMesh){const transform=inverse.clone().multiply(mesh.matrixWorld),positions=mesh.geometry.attributes.position;for(let i=0;i<positions.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(transform))}});return points};
let supports=[];
const ray=new THREE.Raycaster(),direction=new THREE.Vector3(0,0,-1).transformDirection(waist.matrixWorld),inverseWaist=waist.matrixWorld.clone().invert();
// Independent actual mesh intersections catch both penetration and an overly large offset.
function front(x,y){ray.set(new THREE.Vector3(x,y,.8).applyMatrix4(waist.matrixWorld),direction);const hits=ray.intersectObjects(supports,false);return hits.length?hits[0].point.clone().applyMatrix4(inverseWaist).z:null}
function assertFit(points,label,maxGap){let supported=0,minGap=Infinity;for(const p of points){assert(Number.isFinite(p.x+p.y+p.z),`${label} remains finite`);const z=front(p.x,p.y);if(z===null)continue;supported++;const gap=p.z-z;minGap=Math.min(minGap,gap);assert(gap>=.0004,`${label} clears actual selected cloth: gap=${gap} point=${p.toArray()}`);assert(gap<maxGap,`${label} stays close to actual selected cloth: gap=${gap} point=${p.toArray()}`)}assert(supported>points.length*.8,`${label} mostly rests on skin/cloth`);return minGap}
function select(id){const top=avatar.group.getObjectByName('top '+id);assert(top,`${id} exists`);supports=[...body];top.traverse(node=>{if(node.isMesh)supports.push(node)});rig.setSurface(createSurfaceMap(supports,waist));rig.update(1,idle)}
const topDepths={};
for(const id of ['glam','beach','popstar','casual','sunset','denim','sport','midnight']){
 select(id);const rest=readChain(),pendantRest=readPendant();
 assertFit(rest,id+' resting chain',.0048);assert(assertFit(pendantRest,id+' resting heart',.010)<.0012,`${id} pendant back contacts cloth`);
 topDepths[id]=rest.map(p=>p.z);
 assert(rest.some(p=>Math.abs(p.x)<.008&&p.y<.345),'chain hangs in a U to heart');
 const fixed=rest.map((p,i)=>p.y>.465?i:-1).filter(i=>i>=0);assert(fixed.length>5,'both neck end rings are inspectable');
 rig.update(1/60,idle);spine.position.x+=.09;rig.update(1/60,idle);const kicked=readChain();
 assert(kicked.some((p,i)=>p.y<.37&&p.distanceTo(rest[i])>.0002),'torso translation excites lower chain');
 for(const i of fixed)assert(kicked[i].distanceTo(rest[i])<1e-8,'neck ends remain anchored');
 for(let frame=0;frame<90;frame++){
  spine.position.set(Math.sin(frame*.19)*.15,Math.cos(frame*.21)*.04,Math.sin(frame*.17)*.15);spine.rotation.set(Math.sin(frame*.11)*.6,Math.sin(frame*.09)*1.3,Math.sin(frame*.13)*.25);
  rig.update(1/60,{moving:true,speed:5,dancing:true,phase:frame*.13});
  if(frame%15===0){const current=readChain();assertFit(current,id+' moving chain',.0048);assertFit(readPendant(),id+' moving heart',.010);for(const i of fixed)assert(current[i].distanceTo(rest[i])<1e-8,'neck ends never slide');assert(current.every((p,i)=>p.distanceTo(rest[i])<.024),`${id} sway stays gentle: ${Math.max(...current.map((p,i)=>p.distanceTo(rest[i])))}`)}
 }
}
assert(topDepths.sport.some((z,i)=>z>topDepths.beach[i]+.006),'raised sport collar only affects the selected sport top');
select('beach');const rest=readChain(),pendantRest=readPendant(),geometry=chain.geometry,position=geometry.attributes.position;
spine.position.set(0,0,0);spine.rotation.set(0,0,0);for(let frame=0;frame<600;frame++)rig.update(1/60,idle);
assert(Math.max(...readChain().map((p,i)=>p.distanceTo(rest[i])))<.0001,'spring recovers after motion stops');
assert(Math.max(...readPendant().map((p,i)=>p.distanceTo(pendantRest[i])))<.0001,'heart settles on selected surface');
for(const dt of [0,-1,NaN,Infinity,5,.5,1/120]){spine.position.x+=.2;rig.update(dt,{moving:true,speed:Infinity,dancing:true,phase:NaN});assertFit(readChain(),'time discontinuity chain',.0048);assertFit(readPendant(),'time discontinuity heart',.010)}
rig.update(1,idle);assert(Math.max(...readChain().map((p,i)=>p.distanceTo(rest[i])))<.0001,'pause clears stale spring energy');
assert.equal(chain.geometry,geometry,'animation reuses chain geometry');assert.equal(chain.geometry.attributes.position,position,'animation reuses vertex buffer');assert.equal(chain.material,gold,'chain retains shared gold');
console.log('PASS: all eight actual selected tops, bounded chain/pendant contact gap, collar isolation, anchored neck, transform inertia, finite motion and reusable buffers');
