const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript'),THREE=require('three');
const file='src/game/character/limb-rig.ts';assert(fs.existsSync(file),'continuous weighted limb skin is required');
const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(require,mod,mod.exports);
const root=new THREE.Group(),upper=new THREE.Group(),lower=new THREE.Group();root.add(upper);upper.add(lower);lower.position.y=-.27;
const material=new THREE.MeshStandardMaterial();const rig=mod.exports.createLimbSkin(upper,lower,material,'arm');
root.updateMatrixWorld(true);const mesh=upper.children.find(n=>n.isSkinnedMesh);assert(mesh,'actual weighted limb mesh');
const p=mesh.geometry.attributes.position;let end=0;for(let i=0;i<p.count;i++)if(p.getY(i)<p.getY(end))end=i;
const before=new THREE.Vector3().fromBufferAttribute(p,end);lower.rotation.x=-1.4;rig.update();root.updateMatrixWorld(true);
const after=mesh.applyBoneTransform(end,new THREE.Vector3().fromBufferAttribute(p,end));assert(after.distanceTo(before)>.2,'lower skin follows elbow');
const weights=mesh.geometry.attributes.skinWeight;let blended=false;for(let i=0;i<weights.count;i++)if(weights.getX(i)>0&&weights.getY(i)>0)blended=true;assert(blended,'continuous skin blends across joint instead of two rigid capsules');
for(let i=0;i<p.count;i++){const v=mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(p,i));assert([v.x,v.y,v.z].every(Number.isFinite));}
lower.rotation.set(0,0,0);rig.update();root.updateMatrixWorld(true);assert(mesh.applyBoneTransform(end,new THREE.Vector3().fromBufferAttribute(p,end)).distanceTo(before)<1e-6);
console.log('PASS: continuous weighted elbow/knee skin deforms, blends joint and returns to rest');
