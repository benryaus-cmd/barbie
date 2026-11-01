const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript'),THREE=require('three');
const file='src/game/character/hand-rig.ts';
assert(fs.existsSync(file),'articulated hand rig is required');
const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(require,mod,mod.exports);
const gestures=['relaxed','open','point','peace','grip','heart'];
const skin=new THREE.MeshStandardMaterial(),shade=new THREE.MeshStandardMaterial();
function setup(side){const body=new THREE.Group(),wrist=new THREE.Bone();body.add(wrist);const rig=mod.exports.createHandRig(wrist,side,skin,shade);let mesh;rig.root.traverse(n=>{if(n.isSkinnedMesh)mesh=n;});assert(mesh,'a real weighted hand mesh is required');return{body,wrist,rig,mesh};}
function settle(rig,gesture){rig.setGesture(gesture);for(let i=0;i<120;i++)rig.update(1/60);}
function vertex(mesh,i){return mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i));}
function tipIndex(mesh,name){const bone=mesh.skeleton.bones.findIndex(b=>b.name===name);assert(bone>=0,`${name} is a native finger bone`);const si=mesh.geometry.attributes.skinIndex,sw=mesh.geometry.attributes.skinWeight,p=mesh.geometry.attributes.position;let index=-1;for(let i=0;i<p.count;i++)if((si.getX(i)===bone&&sw.getX(i)>.9)||(si.getY(i)===bone&&sw.getY(i)>.9))if(index<0||p.getY(i)<p.getY(index))index=i;assert(index>=0,`${name} influences actual vertices`);return index;}
const right=setup(1),left=setup(-1);
assert.equal(right.rig.root.parent,right.wrist,'hand follows wrist hierarchy');
assert.equal(right.mesh.material[0],skin,'NPC recolouring retains skin reference');assert.equal(right.mesh.material[1],shade,'NPC recolouring retains shade reference');
assert(Object.values(right.rig.bones).every(b=>b.isBone),'all exposed bones are native THREE.Bone');
assert(Object.keys(right.rig.bones).length<=12,'small hand skeleton');
assert.equal(right.rig.root.children.filter(n=>n.isSkinnedMesh).length,1,'one skin mesh per hand');
const normal=right.mesh.geometry.attributes.normal;assert(normal.getX(5*17)>.9,'palm surface normals face outward for front-face rendering');
const tips={};for(const finger of ['index','middle','ring','pinky','thumb'])tips[finger]=tipIndex(right.mesh,`${finger}.tip`);
settle(right.rig,'open');right.body.updateMatrixWorld(true);
const open=Object.fromEntries(Object.entries(tips).map(([n,i])=>[n,vertex(right.mesh,i)]));
right.rig.setGesture('grip');right.rig.update(1/60);right.body.updateMatrixWorld(true);const partial=vertex(right.mesh,tips.index);assert(partial.distanceTo(open.index)>.001&&partial.distanceTo(open.index)<.035,'gesture changes blend rather than snapping');
settle(right.rig,'grip');right.body.updateMatrixWorld(true);
for(const [name,i] of Object.entries(tips))assert(vertex(right.mesh,i).distanceTo(open[name])>.012,`${name} finger vertices articulate into grip`);
for(const i of Object.values(tips)){const v=vertex(right.mesh,i);assert(Math.hypot(v.y+.055,v.z-.023)<.029,'grip fingertips close around transverse tool shaft');}
const sw=right.mesh.geometry.attributes.skinWeight;let blended=false;for(let i=0;i<sw.count;i++)if(sw.getX(i)>.01&&sw.getY(i)>.01)blended=true;assert(blended,'finger joint has blended vertex weights');
settle(right.rig,'point');right.body.updateMatrixWorld(true);
assert(vertex(right.mesh,tips.index).distanceTo(open.index)<.012,'point extends index');
assert(vertex(right.mesh,tips.middle).distanceTo(open.middle)>.02,'point curls middle');
settle(right.rig,'peace');right.body.updateMatrixWorld(true);
assert(vertex(right.mesh,tips.index).distanceTo(open.index)<.015,'peace extends index');
assert(vertex(right.mesh,tips.middle).distanceTo(open.middle)<.015,'peace extends middle');
assert(vertex(right.mesh,tips.ring).distanceTo(open.ring)>.02,'peace curls ring');
for(const gesture of gestures){settle(right.rig,gesture);settle(left.rig,gesture);right.body.updateMatrixWorld(true);left.body.updateMatrixWorld(true);const a=vertex(right.mesh,tips.thumb),b=vertex(left.mesh,tipIndex(left.mesh,'thumb.tip'));assert(Math.abs(a.x+b.x)<1e-6&&Math.abs(a.y-b.y)<1e-6&&Math.abs(a.z-b.z)<1e-6,`${gesture} thumbs mirror exactly`);const p=right.mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=vertex(right.mesh,i);assert([v.x,v.y,v.z].every(Number.isFinite),`${gesture} finite skin`);assert(v.length()<.14,`${gesture} bounded hand pose`);}assert(right.rig.grip.position.distanceTo(new THREE.Vector3(0,-.055,.023))<.015,'socket inside palm/fist');}
const socketPosition=right.rig.grip.position.clone(),socketQuaternion=right.rig.grip.quaternion.clone();
const prop=new THREE.Object3D();prop.position.set(0,.12,0);right.rig.grip.add(prop);
for(let i=0;i<24;i++){right.wrist.position.set(Math.sin(i)*.2,1.2+Math.cos(i)*.05,.1);right.wrist.rotation.set(Math.sin(i)*1.2,Math.cos(i)*.6,Math.sin(i*.5)*1.1);right.rig.setGesture(gestures[i%gestures.length]);right.rig.update(1/60);right.body.updateMatrixWorld(true);const expected=new THREE.Vector3(0,.12,0).applyMatrix4(right.rig.grip.matrixWorld),actual=prop.getWorldPosition(new THREE.Vector3());assert(actual.distanceTo(expected)<1e-8,'dummy prop tracks walking/swinging wrist');assert(right.rig.grip.position.distanceTo(socketPosition)<1e-9&&right.rig.grip.quaternion.angleTo(socketQuaternion)<1e-7,'gesture never jitters grip frame');const shaft=new THREE.Vector3(0,1,0).applyQuaternion(right.rig.grip.quaternion),front=new THREE.Vector3(0,0,1).applyQuaternion(right.rig.grip.quaternion);assert(shaft.distanceTo(new THREE.Vector3(1,0,0))<1e-7&&front.distanceTo(new THREE.Vector3(0,0,1))<1e-7,'canonical prop +Y is palm X and +Z is palm front');}
for(const dt of [NaN,Infinity,-Infinity,-1,0,1e6]){right.rig.update(dt);for(const bone of Object.values(right.rig.bones))assert([...bone.quaternion].every(Number.isFinite),'invalid/large dt cannot corrupt bones');}
console.log('PASS: weighted hand vertices, six gestures, mirrored thumbs, bounded poses, stable palm grip and wrist/prop transforms');
