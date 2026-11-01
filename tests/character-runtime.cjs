const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ts=require('typescript'),THREE=require('three');
const root=path.resolve(__dirname,'..'),cache={};
function load(name){if(cache[name])return cache[name];const file=path.join(root,'src',name+'.ts');const mod={exports:{}};cache[name]=mod.exports;new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(id=>id.startsWith('@/')?load(id.slice(2)):id.startsWith('./')?load(path.posix.join(path.posix.dirname(name),id)):require(id),mod,mod.exports);return cache[name]=mod.exports;}
const avatar=load('game/avatar').createAvatar();
const motion={moving:false,speed:0,grounded:true,dancing:false,sitting:false};
const all=[];avatar.group.traverse(n=>{if(n.isSkinnedMesh)all.push(n)});
assert(all.some(n=>n.name.includes('gown')),'gown must actually have weighted deforming geometry');
assert(all.some(n=>n.name.includes('hair')),'hair must actually have weighted deforming geometry');
const joint=name=>{let found;avatar.group.traverse(n=>{if(n.name===name)found=n});assert(found,name);return found};
const pos=n=>n.getWorldPosition(new THREE.Vector3());
for(const vehicle of ['scooter','convertible','buggy']){
 const ride=load('game/character/riding').RIDING[vehicle];avatar.group.position.set(0,ride.rootY,ride.rootZ);avatar.group.rotation.set(0,0,0);avatar.setPose('idle');
 for(let i=0;i<180;i++)avatar.update(1/60,{...motion,sitting:true,vehicle});avatar.group.updateMatrixWorld(true);
 for(let side=0;side<2;side++){
  const arm=joint(side?'shoulder.R':'shoulder.L'),wrist=arm.children.find(n=>n.name==='elbow').children.find(n=>n.name==='wrist');
  assert(pos(wrist).distanceTo(new THREE.Vector3(...ride.hands[side]))<.025,vehicle+' hands must reach the grips');
  const hip=joint(side?'hip.R':'hip.L'),ankle=hip.children.find(n=>n.name==='knee').children.find(n=>n.name==='ankle');
  assert(pos(ankle).distanceTo(new THREE.Vector3(...ride.feet[side]))<.025,vehicle+' feet must rest at their authored supports');
 }
}
avatar.group.position.set(0,0,0);avatar.setPose('peace');for(let i=0;i<180;i++)avatar.update(1/60,motion);avatar.group.updateMatrixWorld(true);
const left=joint('shoulder.L'),elbow=left.children.find(n=>n.name==='elbow'),wrist=elbow.children.find(n=>n.name==='wrist');
assert(Math.abs(pos(elbow).x)>.26,'free elbow stays outside torso');assert(Math.abs(pos(wrist).x)>.20,'hip hand stays outside waist');
for(const pose of ['idle','peace','heart','kiss','pet','surf','dance']){avatar.setPose(pose);for(let i=0;i<90;i++)avatar.update(1/60,motion);avatar.group.updateMatrixWorld(true);avatar.group.traverse(n=>assert(n.matrixWorld.elements.every(Number.isFinite),pose+' matrices finite'));}
avatar.setPose('pet');for(let i=0;i<120;i++)avatar.update(1/60,motion);for(let i=0;i<180;i++)avatar.update(1/60,{...motion,moving:true,speed:4});
for(const mesh of all.filter(n=>n.name.includes('gown')))assert(mesh.morphTargetInfluences.every(v=>v<1e-5),'walking clears the inactive pet/crouch drape');
avatar.setPose('idle');avatar.setLook({...load('game/fashion').DEFAULT_LOOK,bottom:'gown'});for(let i=0;i<100;i++)avatar.update(1/60,{...motion,sitting:true,vehicle:'scooter'});avatar.setLook({...load('game/fashion').DEFAULT_LOOK,bottom:'shorts'});for(let i=0;i<180;i++)avatar.update(1/60,motion);avatar.setLook({...load('game/fashion').DEFAULT_LOOK,bottom:'gown'});avatar.update(1/60,motion);for(const mesh of all.filter(n=>n.name.includes('gown')))assert(mesh.morphTargetInfluences.every(v=>v<1e-5),'reselected skirt immediately matches standing body');
avatar.setPose('idle');for(let i=0;i<240;i++){avatar.update(1/60,{...motion,moving:true,speed:4.5});if(i<60)continue;avatar.group.updateMatrixWorld(true);for(const side of [-1,1]){const shoulder=joint(side<0?'shoulder.L':'shoulder.R'),w=shoulder.children.find(n=>n.name==='elbow').children.find(n=>n.name==='wrist'),local=joint('pelvis').worldToLocal(pos(w));assert(side*local.x>.25,'walking wrist stays outside skirt/hip for both gait halves');}}
console.log('PASS: integrated weighted garments/hair, vehicle grip/foot alignment, free-arm clearance and pose transitions');
