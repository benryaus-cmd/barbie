const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript'),THREE=require('three');
const root=path.resolve(__dirname,'..'),cache={};function load(name){name=name.replace(/\.tsx?$/,'');if(cache[name])return cache[name];const m={exports:{}};cache[name]=m.exports;new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path.join(root,'src',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(id=>id.startsWith('@/')?load(id.slice(2)):(id.startsWith('./')||id.startsWith('../'))?load(path.posix.join(path.posix.dirname(name),id)):require(id),m,m.exports);return cache[name]=m.exports;}
const avatar=load('game/avatar').createAvatar();assert(avatar.rig?.skeleton instanceof THREE.Skeleton,'avatar exposes a native mapped body skeleton');
const required=['hips','spine','neck','head','leftUpperArm','leftLowerArm','leftHand','rightUpperArm','rightLowerArm','rightHand','leftUpperLeg','leftLowerLeg','leftFoot','rightUpperLeg','rightLowerLeg','rightFoot'];
for(const id of required){const bone=avatar.rig.bones[id];assert(bone?.isBone,id+' maps actual native bone');assert(avatar.rig.skeleton.bones.includes(bone));assert.equal(bone.userData.humanoidBone,id);}
let bodyMeshes=0;avatar.group.traverse(n=>{if(n.isSkinnedMesh&&n.name.includes('continuous skin')){assert.equal(n.skeleton,avatar.rig.skeleton,'limb skin shares mapped body skeleton');bodyMeshes++;}});assert.equal(bodyMeshes,4);
const prop=new THREE.Object3D(),detach=avatar.attachHeldObject(prop,'right');avatar.setCarry('one-hand');
const still={moving:false,speed:0,grounded:true,dancing:false,sitting:false};
for(let i=0;i<60;i++)avatar.update(1/60,still);avatar.group.updateMatrixWorld(true);const start=prop.getWorldPosition(new THREE.Vector3());assert.equal(prop.parent,avatar.rig.sockets.rightHand);
assert(avatar.playAction('swing'),'swing starts');let displacement=0;for(let i=0;i<100;i++){avatar.update(1/60,still);avatar.group.updateMatrixWorld(true);const pos=prop.getWorldPosition(new THREE.Vector3());displacement=Math.max(displacement,pos.distanceTo(start));assert(pos.distanceTo(avatar.rig.sockets.rightHand.getWorldPosition(new THREE.Vector3()))<1e-7,'held origin stays at hand socket');}assert(displacement>.1,'swing actually moves held tool');assert(!avatar.getActionState().active,'swing completes once');assert.equal(avatar.getActionState().carry,'one-hand','returns to carry');detach();assert.equal(prop.parent,null,'detach preserves reusable prop');
console.log('PASS: native mapped skeleton, shared limb skin, stable hand attachment, one-shot swing and carry recovery');

// Appliques must follow the actual selected bodice, including triangle interiors.
const {createSurfaceMap}=load('game/character/surface-map');
for(const id of ['casual','popstar']){
 const top=avatar.group.getObjectByName('top '+id);
 const decorations=[];top.traverse(n=>{if(n.isMesh&&n.name.includes('shirt '))decorations.push(n)});
 assert(decorations.length,id+' has fitted applique');const surface=createSurfaceMap(top.children.filter(n=>n.isMesh&&!n.name.includes('shirt ')),top);
 for(const mesh of decorations){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){const point=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrix);const base=surface.sample(point.x,point.y);assert(base);assert(point.z-base.z>.0006&&point.z-base.z<.001,'logo stays sewn to cloth');}}
}
console.log('PASS: actual heart/star shirt appliques stay within one millimetre of bodice');
