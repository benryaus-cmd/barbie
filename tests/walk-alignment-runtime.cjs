const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript'),THREE=require('three');
const root=path.resolve(__dirname,'..'),cache={};function load(name){name=name.replace(/\.tsx?$/,'');if(cache[name])return cache[name];const m={exports:{}};cache[name]=m.exports;new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path.join(root,'src',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(id=>id.startsWith('@/')?load(id.slice(2)):(id.startsWith('./')||id.startsWith('../'))?load(path.posix.join(path.posix.dirname(name),id)):require(id),m,m.exports);return cache[name]=m.exports;}
const {createMotionController}=load('game/character/motion-controller'),controller=createMotionController();
const still={moving:false,speed:0,grounded:true,dancing:false,sitting:false,pose:'idle'};
const q=r=>new THREE.Quaternion().setFromEuler(new THREE.Euler(...r));
function points(frame,side,kind){const p=side<0?'left':'right',arm=kind==='arm',upper=q(frame.rotations[p+(arm?'UpperArm':'UpperLeg')]),lower=upper.clone().multiply(q(frame.rotations[p+(arm?'LowerArm':'LowerLeg')]));const start=new THREE.Vector3(side*(arm?.212:.108),arm?.368:-.025,0),bend=start.clone().add(new THREE.Vector3(0,arm?-.27:-.425,0).applyQuaternion(upper)),end=bend.clone().add(new THREE.Vector3(0,arm?-.245:-.397,0).applyQuaternion(lower));return{start,bend,end};}
for(let i=0;i<180;i++)controller.update(1/60,still);
let f=controller.update(1/60,still);
for(const side of [-1,1]){const leg=points(f,side,'leg');assert(leg.bend.z-leg.start.z<.035,'resting knee should sit under hip, not permanently pushed forward');}
for(let i=0;i<360;i++){
 f=controller.update(1/60,{...still,moving:true,speed:4.5});if(i<90)continue;
 for(const side of [-1,1]){
  const arm=points(f,side,'arm');
  assert(side*arm.bend.x<.275,'relaxed elbow must not flare like a bodybuilder');
  assert(side*arm.end.x<.270&&side*arm.end.x>.215,'relaxed hand hangs near body');
  const lineZ=THREE.MathUtils.lerp(arm.start.z,arm.end.z,.27/.515);
  assert(arm.bend.z<lineZ-.004,'elbow bends behind forearm, never backwards toward front');
 }
}
const avatar=load('game/avatar').createAvatar();avatar.setPose('confident');for(let i=0;i<180;i++)avatar.update(1/60,still);avatar.group.updateMatrixWorld(true);
const pelvis=avatar.rig.bones.hips;
for(const side of [-1,1]){const palm=avatar.rig.fingers[side<0?'left':'right'].palm;const centre=pelvis.worldToLocal(palm.localToWorld(new THREE.Vector3(0,-.029,.004)));assert(side*centre.x<.223,'hip pose palm must contact the hip rather than hovering a palm-width outside');assert(centre.z<.10,'hip hand rests at side, not suspended in front');const target=pelvis.children.find(n=>n.isMesh),world=pelvis.localToWorld(centre.clone()),dir=new THREE.Vector3(-side,0,0).transformDirection(pelvis.matrixWorld);const hit=new THREE.Raycaster(world,dir,0,.10).intersectObject(target,false)[0];assert(hit&&hit.distance>.009&&hit.distance<.032,'palm actually rests within its thickness of hip surface');}
console.log('PASS: knees below hips, relaxed non-flared arms, correct elbow bend and hip-contact palms');

const leg=avatar.group.getObjectByName('leg continuous skin'),p=leg.geometry.attributes.position;let x=0,z=0;for(let i=0;i<p.count;i++)if(p.getY(i)<-.18&&p.getY(i)>-.23){x=Math.max(x,Math.abs(p.getX(i)));z=Math.max(z,Math.abs(p.getZ(i)));}assert(z/x>.93,'thigh retains rounded depth rather than a flattened side silhouette');
