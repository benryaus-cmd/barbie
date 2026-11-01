const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const repo=process.env.DREAMLAND_REPO||path.resolve(__dirname,'..'),localRequire=createRequire(repo+'/package.json');
const THREE=localRequire('three'),ts=localRequire('typescript');
const filename=repo+'/src/game/character/hair-rig.ts';
assert(fs.existsSync(filename),'weighted hair module exists');
const source=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const mod={exports:{}};new Function('require','module','exports',source)(localRequire,mod,mod.exports);
const {createHairRig}=mod.exports;
const idle={moving:false,speed:0,dancing:false,phase:0};
function fixture(style='straight') {
 const world=new THREE.Group(),head=new THREE.Group(),holder=new THREE.Group(),sway=new THREE.Group();
 holder.name='hair '+style;world.add(head);head.add(holder);holder.add(sway);sway.position.set(0,.05,-.1);
 const mat=new THREE.MeshStandardMaterial({color:0xeec86b});
 if(style!=='pixie') for(const x of [-.18,0,.18]) {
  const points=[[x,.11,-.02],[x,-.12,-.08],[x,-.36,-.06],[x,-.55,-.03]].map(p=>new THREE.Vector3(...p));
  sway.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),18,.025,6,false),mat));
 }
 world.updateMatrixWorld(true);const rig=createHairRig(sway);world.updateMatrixWorld(true);
 const meshes=[];sway.traverse(node=>{if(node.isSkinnedMesh)meshes.push(node)});
 const read=()=>{world.updateMatrixWorld(true);meshes.forEach(m=>m.skeleton.update());return meshes.flatMap(m=>{const p=m.geometry.attributes.position;return Array.from({length:p.count},(_,i)=>m.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(p,i)));});};
 return {world,head,holder,sway,rig,meshes,read,mat};
}
// Removing skinning, assigning rigid weights, or rotating the whole sway must fail these checks.
const f=fixture();assert.equal(f.meshes.length,3,'all secondary material meshes are skinned');
for(const mesh of f.meshes) {
 assert.equal(mesh.material,f.mat,'hair colour material remains shared');
 const w=mesh.geometry.attributes.skinWeight;
 for(let i=0;i<w.count;i++)assert(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-6,'normalized weights');
 assert(mesh.skeleton.bones.some(b=>b.parent?.isBone),'real connected bone chains');
}
const rest=f.read();f.rig.update(1/60,idle);f.head.position.x=.12;f.head.rotation.y=.45;f.rig.update(1/60,idle);
const moved=f.read();let tipChange=0,rootChange=0;
for(let i=0;i<rest.length;i++){const d=rest[i].distanceTo(moved[i]);if(rest[i].y<-.3)tipChange=Math.max(tipChange,d);if(rest[i].y>.075)rootChange=Math.max(rootChange,d);}
assert(tipChange>.001,'world head translation and turn deform actual tip vertices without walking sine');
assert(rootChange<1e-7,'roots stay fixed in head space');assert(f.sway.quaternion.angleTo(new THREE.Quaternion())<1e-8,'motion lives in weighted chains');
f.rig.update(1/60,idle);const lag=f.read();assert(lag.some((p,i)=>p.distanceTo(moved[i])>.0001),'spring continues after head stops');
for(let i=0;i<600;i++)f.rig.update(1/60,idle);
assert(Math.max(...f.read().map((p,i)=>p.distanceTo(rest[i])))<.0003,'damped hair returns to authored rest');
for(const dt of [0,-1,NaN,Infinity,5,.5,1/120]) {f.head.position.x+=.01;f.rig.update(dt,{moving:true,speed:100,dancing:true,phase:10});}
assert(f.read().every(v=>Number.isFinite(v.x+v.y+v.z)),'dt spikes cannot poison vertices');
f.rig.reset();assert(Math.max(...f.read().map((p,i)=>p.distanceTo(rest[i])))<1e-7,'style reset removes stale inertia');
// Turning/moving in every direction must leave low hair outside a conservative neck/torso ellipse.
for(let frame=0;frame<180;frame++) {
 f.head.position.set(Math.sin(frame*.2)*.1,Math.cos(frame*.13)*.025,Math.cos(frame*.17)*.12);f.head.rotation.y=Math.sin(frame*.12)*1.1;
 f.rig.update(1/60,{moving:true,speed:4,dancing:true,phase:frame*.11});
 for(const p of f.read()) {const y=p.y+.05,z=p.z-.1;if(y<-.27)assert((p.x/.255)**2+(z/.155)**2>=.99,`hair clears shoulder/back volume frame=${frame} p=${p.toArray()} r=${(p.x/.255)**2+(z/.155)**2}`);}
}
const pixie=fixture('pixie');pixie.rig.update(1/60,idle);pixie.rig.reset();assert.equal(pixie.meshes.length,0,'empty pixie sway needs no empty skeleton');
const updo=fixture('updo');updo.rig.update(1/60,idle);const updoRest=updo.read();updo.head.position.x=.2;updo.rig.update(1/60,{moving:true,speed:4,dancing:true,phase:1});
assert(Math.max(...updo.read().map((p,i)=>p.distanceTo(updoRest[i])))<.01,'updo secondary motion stays restrained');
console.log('PASS: weighted real hair vertices, stable roots, head movement and turn inertia, damped recovery, finite dt spikes, body clearance, reset and compact styles');
for(const change of ['translation','rotation']) {
 const sample=fixture();sample.rig.update(1/60,idle);const before=sample.read();
 if(change==='translation')sample.head.position.z=.1;else sample.head.rotation.y=.7;
 sample.rig.update(1/60,idle);
 assert(sample.read().some((p,i)=>p.y<-.3&&p.distanceTo(before[i])>.001),`independent world ${change} excites hair`);
}
// Exercise the real authored nine styles, including batching and head scale/bind matrices.
const modules={};function load(name) {name=name.replace(/\.tsx?$/,'');
 if(modules[name])return modules[name];const file=repo+'/src/'+name+'.ts',entry={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 new Function('require','module','exports',code)(id=>id.startsWith('@/')?load(id.slice(2)):(id.startsWith('./')||id.startsWith('../'))?load(path.posix.join(path.posix.dirname(name),id)):localRequire(id),entry,entry.exports);
 return modules[name]=entry.exports;
}
const avatar=load('game/avatar').createAvatar(),styles=['blonde','pink','updo','bob','curls','braids','pixie','twin-buns','straight'];
for(const style of styles) {
 avatar.setHair(style);avatar.group.updateMatrixWorld(true);
 let holder;avatar.group.traverse(n=>{if(n.name==='hair '+style)holder=n;});assert(holder?.visible,`${style} remains selectable`);
 const selected=[];holder.traverse(n=>{if(n.isSkinnedMesh)selected.push(n)});
 assert.equal(selected.length>0,style!=='pixie',`${style} has appropriate secondary geometry`);
 for(let i=0;i<60;i++) {avatar.group.position.x+=.006;avatar.group.rotation.y+=.009;avatar.update(1/60,{...idle,moving:true,speed:2,grounded:true,sitting:false});}
 avatar.group.updateMatrixWorld(true);
 for(const mesh of selected) {
  mesh.skeleton.update();const positions=mesh.geometry.attributes.position,normals=mesh.geometry.attributes.normal;
  const sharedNormals=new Map();
  for(let i=0;i<positions.count;i++){
   const key=[positions.getX(i),positions.getY(i),positions.getZ(i)].map(v=>Math.round(v*1e5)).join(',');
   const n=new THREE.Vector3().fromBufferAttribute(normals,i),other=sharedNormals.get(key);
   if(other)assert(n.dot(other)>.999,`${style} retains smooth normals on merged hair triangles`);else sharedNormals.set(key,n);
  }
  for(let i=0;i<positions.count;i++) {
   const p=mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(positions,i));
   assert(Number.isFinite(p.x+p.y+p.z),`${style} has finite deformed vertices`);
   const y=p.y+.05,z=p.z-.1;
   if(y<-.3)assert((p.x/.255)**2+(z/.155)**2>.97,`${style} clears torso after world movement`);
   if(y<-.075&&y>-.22)assert((p.x/.201)**2+(y/.242)**2+(z/.179)**2>.97,`${style} clears lower head`);
   // A collider must never push back-hair vertices onto the visible cheek/mouth surface.
   if(y<-.07&&y>-.22&&Math.abs(p.x)<.145)assert(z<-.045,`${style} keeps central face-height hair behind the face`);
  }
 }
}
console.log('PASS: separate translation/rotation impulses and all nine real authored hairstyles with weighted mesh binding and torso clearance');
