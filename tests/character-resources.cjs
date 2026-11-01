const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict'),THREE=require('three');
const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync('src/core/release-root.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(require,mod,mod.exports);
const root=new THREE.Group(),bone=new THREE.Bone(),skeleton=new THREE.Skeleton([bone]);skeleton.computeBoneTexture();let freed=0;skeleton.boneTexture.addEventListener('dispose',()=>freed++);
const geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial();for(let i=0;i<3;i++){const mesh=new THREE.SkinnedMesh(geometry,material);mesh.add(bone);mesh.bind(skeleton);root.add(mesh);}
mod.exports.releaseRunRoot(root,new Set());assert.equal(freed,1,'shared bone texture disposed exactly once');assert.equal(root.children.length,0);
console.log('PASS: shared weighted character skeleton textures disposed once');
