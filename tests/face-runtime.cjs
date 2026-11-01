const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const repo=process.env.DREAMLAND_REPO||path.resolve(__dirname,'..');
const ts=require('typescript'),THREE=require('three');
function load(name){
 const file=path.join(repo,'src/game/character',name+'.ts');
 assert(fs.existsSync(file),`${name} module exists`);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const mod={exports:{}};new Function('require','module','exports',code)(require,mod,mod.exports);return mod.exports;
}
const {createFace}=load('face');
const {applyCharacterSurface}=load('surfaces');
const materials=Object.fromEntries(Object.entries({skin:0xffd4b9,shade:0xeaa88f,ivory:0xfffaf3,ink:0x302435,lips:0xe84a82,blush:0xf4a395,eyeshadow:0xc98cab}).map(([name,color])=>[name,new THREE.MeshStandardMaterial({color})]));
const head=new THREE.Group(),face=createFace(head,materials);
const find=name=>{const node=head.getObjectByName(name);assert(node,`${name} is present`);return node};
function geometrySignature(name){const root=find(name),out=[];root.traverse(node=>{if(node.isMesh)out.push(...node.geometry.attributes.position.array)});return out.map(n=>n.toFixed(5)).join(',')}
const noseParts=[];head.traverse(node=>{if(node.isMesh&&node.name.startsWith('nose'))noseParts.push(node)});
assert.equal(noseParts.length,1,'nose is one continuous skin mesh without separate bridge/tip/wing plugs');
const nose=noseParts[0],nosePositions=nose.geometry.attributes.position,noseIndex=nose.geometry.index;
assert.equal(nose.material,materials.skin,'nose shares recolorable skin');assert(noseIndex,'nose has shared indexed vertices');
const adjacency=new Map();for(let i=0;i<noseIndex.count;i+=3){const triangle=[noseIndex.getX(i),noseIndex.getX(i+1),noseIndex.getX(i+2)];for(const a of triangle){const neighbors=adjacency.get(a)||new Set();for(const b of triangle)neighbors.add(b);adjacency.set(a,neighbors)}}
const reached=new Set(),pending=[0];while(pending.length){const vertex=pending.pop();if(reached.has(vertex))continue;reached.add(vertex);for(const neighbor of adjacency.get(vertex)||[])if(!reached.has(neighbor))pending.push(neighbor)}
assert.equal(reached.size,nosePositions.count,'all nose vertices form one connected surface');
let largestLift=0,edgeCount=0;for(let i=0;i<nosePositions.count;i++){const x=nosePositions.getX(i),y=nosePositions.getY(i),z=nosePositions.getZ(i),headZ=.161*Math.sqrt(Math.max(.02,1-(x/.186)**2-(y/.232)**2));largestLift=Math.max(largestLift,z-headZ);if(Math.abs(x)>.0319||y<-.0619||y>.0369){edgeCount++;assert(z<headZ,'nose perimeter tucks into the head without a raised rim')}}
assert(edgeCount>20&&largestLift>.012&&largestLift<.027,'nose has a small modeled tip and blended perimeter');
assert([...nose.geometry.attributes.normal.array].filter((_,i)=>i%3===2).every(z=>z>.3),'nose normals face forward throughout the blended surface');
const eyeShapes=[],mouthShapes=[];
for(const eyeStyle of ['soft','almond','wide']){face.setLook({eyeStyle});eyeShapes.push(geometrySignature('eye.L'))}
for(const mouthStyle of ['smile','soft','full']){face.setLook({mouthStyle});mouthShapes.push(geometrySignature('mouth'))}
assert.equal(new Set(eyeShapes).size,3,'eye styles alter actual geometry');
assert.equal(new Set(mouthShapes).size,3,'mouth styles alter actual geometry');
face.setLook({eyeStyle:'soft',mouthStyle:'smile',eyeColor:'#278eae'});const defaultEye=geometrySignature('eye.L'),defaultMouth=geometrySignature('mouth');
face.setLook({eyeStyle:'wide',mouthStyle:'full',eyeColor:'#51ad76'});face.setLook({});
assert.equal(geometrySignature('eye.L'),defaultEye,'legacy look resets eye style');assert.equal(geometrySignature('mouth'),defaultMouth,'legacy look resets mouth style');assert.equal(find('iris.L').material.color.getHexString(),'278eae','legacy look resets eye color');
face.setLook({eyeColor:'#51ad76'});assert.equal(find('iris.L').material.color.getHexString(),'51ad76');
let minOpen=1,maxOpen=0;
for(let i=0;i<720;i++){face.update(1/60,'idle',false);const opening=find('eye opening.L').scale.y;minOpen=Math.min(minOpen,opening);maxOpen=Math.max(maxOpen,opening)}
assert(minOpen<.12&&maxOpen>.95,'eyes close and reopen during deterministic blink');
face.update(.1,'idle',false);const normalWidth=find('mouth').scale.x;
for(let i=0;i<30;i++)face.update(1/60,'kiss',false);
assert(find('mouth').scale.x<normalWidth*.85,'kiss expression visibly purses mouth');
for(const dt of [0,-1,NaN,Infinity,.016,100])for(const pose of ['wave','kiss','dance','idle'])face.update(dt,pose,true);
head.updateMatrixWorld(true);head.traverse(node=>{assert(node.matrixWorld.elements.every(Number.isFinite),'all animated transforms stay finite');if(node.isMesh)assert([...node.geometry.attributes.position.array].every(Number.isFinite),'face vertex positions stay finite')});
const blush=find('blush.L');assert(blush.geometry.attributes.color.itemSize===4,'blush uses feathered per-vertex alpha');
assert([...blush.geometry.attributes.normal.array].filter((_,i)=>i%3===2).some(z=>z>.8),'blush feather faces the camera');
const colors=[...blush.geometry.attributes.color.array];assert(colors.some((v,i)=>i%4===3&&v===0)&&colors.some((v,i)=>i%4===3&&v>.1),'blush fades to transparent edges');
const skinA=new THREE.MeshStandardMaterial({color:0xffd4b9}),skinB=skinA.clone();
applyCharacterSurface(skinA,'skin');applyCharacterSurface(skinB,'skin');
assert.equal(skinA.color.getHex(),0xffd4b9,'surface keeps resident skin recolor key');
assert.equal(skinA.bumpMap,skinB.bumpMap,'same surface shares micro texture');assert.equal(skinA.roughnessMap,skinB.roughnessMap,'roughness texture is shared');
assert(skinA.bumpScale>0&&skinA.bumpScale<.001,'skin detail stays subtle at game scale');
for(const kind of ['satin','cotton','denim','hair']){const a=new THREE.MeshStandardMaterial({color:0x123456}),b=a.clone();applyCharacterSurface(a,kind);applyCharacterSurface(b,kind);assert.equal(a.color.getHex(),0x123456);assert.equal(a.bumpMap,b.bumpMap);assert(a.bumpMap.image.data.length<=64*64*4,'surface memory is bounded')}
console.log('Face runtime passed: distinct geometry, iris color, blink, kiss, finite motion, feathered blush and shared surface maps');
