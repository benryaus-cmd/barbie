const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript'),THREE=require('three');
const repo=path.resolve(__dirname,'..'),cache={};
function load(name){name=name.replace(/\.tsx?$/,'');if(cache[name])return cache[name];const mod={exports:{}};cache[name]=mod.exports;new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path.join(repo,'src',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(id=>id.startsWith('@/')?load(id.slice(2)):id.startsWith('.')?load(path.posix.join(path.posix.dirname(name),id)):require(id),mod,mod.exports);return cache[name]=mod.exports;}
const {PHOTO_POSES,PAIR_POSES,getPairLayout}=load('game/poses'),{createMotionController}=load('game/character/motion-controller');
const still={moving:false,speed:0,grounded:true,dancing:false,sitting:false,pose:'idle'},q=r=>new THREE.Quaternion().setFromEuler(new THREE.Euler(...r));
function joint(frame,side,kind,bendOnly=false){const p=side<0?'left':'right',arm=kind==='arm',upper=q(frame.rotations[p+(arm?'UpperArm':'UpperLeg')]),lower=upper.clone().multiply(q(frame.rotations[p+(arm?'LowerArm':'LowerLeg')]));const end=new THREE.Vector3(side*(arm?.212:.108),arm?.368:-.025,0).add(new THREE.Vector3(0,arm?-.27:-.425,0).applyQuaternion(upper));if(!bendOnly)end.add(new THREE.Vector3(0,arm?-.245:-.397,0).applyQuaternion(lower));return end.applyQuaternion(q(frame.rotations.pelvis)).add(new THREE.Vector3(0,frame.pelvisY,0));}
function settle(pose,soleHeight=.09){const controller=createMotionController();let frame;for(let i=0;i<180;i++)frame=controller.update(1/60,{...still,pose,soleHeight});return frame;}
const solos=['chin-frame','hair-touch','crossed-arms','leg-pop','kneel','side-sit'];
assert(solos.every(id=>PHOTO_POSES.some(p=>p.id===id)),'all six solo poses are selectable');
assert.equal(PAIR_POSES.length,8);assert.equal(getPairLayout('__proto__'),null);assert.equal(getPairLayout('unknown'),null);assert.equal(getPairLayout(null),null);
const unique=new Set();
for(const pose of [...solos,...PAIR_POSES.map(p=>p.id)]){const frame=settle(pose);for(const rotation of Object.values(frame.rotations))assert(rotation.every(Number.isFinite),pose+' finite joints');unique.add(JSON.stringify(Object.values(frame.rotations).flat().map(v=>Math.round(v*20))));}
assert.equal(unique.size,solos.length+PAIR_POSES.length,'every new pose and legacy duo has a distinct joint silhouette');
for(const sole of [.075,.09,.106])for(const pose of solos){const f=settle(pose,sole),feet=[joint(f,-1,'leg'),joint(f,1,'leg')];assert(feet.every(p=>p.y>=sole-.002),pose+' feet stay above floor');if(pose==='leg-pop'){assert(Math.abs(feet[0].y-sole)<.002,'leg pop keeps left supporting foot planted');assert(feet[1].y>sole+.30,'leg pop visibly folds and lifts the free leg');}else assert(feet.every(p=>Math.abs(p.y-sole)<.003),pose+' both soles supported');if(pose==='kneel'||pose==='side-sit')for(const side of [-1,1]){const knee=joint(f,side,'leg',true);assert(knee.y>.045&&knee.y<sole+.015,pose+' knees rest near floor without penetration');}}
const chin=settle('chin-frame');for(const side of [-1,1]){const hand=joint(chin,side,'arm');assert(hand.y-chin.pelvisY>.36&&hand.y-chin.pelvisY<.43,'chin-frame wrists below jaw');assert(hand.z>.14&&Math.abs(hand.x)<.15,'chin frame holds hands in front of chin');}
const hair=settle('hair-touch');assert(joint(hair,1,'arm').y-hair.pelvisY>.75,'hair-touch reaches the hairline');
const crossed=settle('crossed-arms');assert(joint(crossed,-1,'arm').x>0&&joint(crossed,1,'arm').x<0,'folded wrists cross the torso');
for(const id of ['hug','arm-around','half-heart']){const layout=getPairLayout(id);assert.equal(layout.spacing,.62);assert.equal(layout.mirror,id!=='hug');assert.equal(layout.friendYaw,id==='hug'?Math.PI/2:-.1);}
const untouched=getPairLayout('high-five');untouched.spacing=99;assert.equal(getPairLayout('high-five').spacing,.66,'layout callers cannot mutate catalogue');
// Venue choreography has the original inward alternating arm groove, with its
// own 6.8-radian clock. It must never be replaced by the photo Dance silhouette.
const venue=createMotionController(),venueSignatures=new Set();let venueFrame;
for(let i=0;i<300;i++){
 venueFrame=venue.update(1/60,{...still,dancing:true});if(i<120)continue;
 venueSignatures.add(Math.round(venueFrame.rotations.leftUpperArm[0]*10));
 assert(venueFrame.rotations.leftUpperArm[2]>.20,'original venue left arm folds inward');
 const lowest=Math.min(joint(venueFrame,-1,'leg').y,joint(venueFrame,1,'leg').y);assert(lowest>.084&&lowest<.12,'venue groove keeps its lowest sole near the floor');
}
assert(venueSignatures.size>8,'venue routine stays animated rather than holding a photo pose');
assert(settle('dance').rotations.leftUpperArm[2]<-.9,'photo Dance keeps its separate raised-arm pose');
// Test the actual bones and rendered weighted garment surfaces for both floor poses.
const avatar=load('game/avatar').createAvatar(),look=load('game/fashion').DEFAULT_LOOK;
function meshVertices(mesh,reference){const vertices=[];for(let i=0;i<mesh.geometry.attributes.position.count;i++){const p=new THREE.Vector3();mesh.getVertexPosition(i,p);reference.worldToLocal(mesh.localToWorld(p));vertices.push(p);}return vertices;}
function surfaceAt(vertices,point,axis){let outer=-Infinity;const a1=(axis+1)%3,a2=(axis+2)%3,xyz=['x','y','z'];for(let i=0;i<vertices.length;i+=3){const a=vertices[i],b=vertices[i+1],c=vertices[i+2],u1=xyz[a1],u2=xyz[a2],out=xyz[axis],den=(b[u2]-c[u2])*(a[u1]-c[u1])+(c[u1]-b[u1])*(a[u2]-c[u2]);if(Math.abs(den)<1e-10)continue;const u=((b[u2]-c[u2])*(point[u1]-c[u1])+(c[u1]-b[u1])*(point[u2]-c[u2]))/den,v=((c[u2]-a[u2])*(point[u1]-c[u1])+(a[u1]-c[u1])*(point[u2]-c[u2]))/den,w=1-u-v;if(Math.min(u,v,w)>-1e-5)outer=Math.max(outer,u*a[out]+v*b[out]+w*c[out]);}return outer;}
let samples=0;
for(const bottom of ['gown','wrap','pleated','tennis','denim-skirt','satin-mini'])for(const pose of ['kneel','side-sit']){
 avatar.setLook({...look,bottom});avatar.setPose(pose);for(let i=0;i<180;i++)avatar.update(1/60,still);avatar.group.updateMatrixWorld(true);
 for(const side of ['left','right']){const ankle=avatar.rig.bones[side+'Foot'].getWorldPosition(new THREE.Vector3());assert(Math.abs(ankle.y-.099)<.003,'actual rendered ankle matches heel support height');}
 const skirt=avatar.group.getObjectByName(bottom+' skirt'),surfaces=[];skirt.traverse(n=>{if(n.isSkinnedMesh)surfaces.push(meshVertices(n,avatar.group));});
 for(const vertices of surfaces)for(const point of vertices){assert([point.x,point.y,point.z].every(Number.isFinite),'floor garment finite');assert(point.y>.009,`${bottom}/${pose}: hem stays above ground (${point.y})`);}
 for(const side of [-1,1]){const hip=avatar.rig.bones[side<0?'leftUpperLeg':'rightUpperLeg'],skin=hip.getObjectByName('leg continuous skin'),position=skin.geometry.attributes.position;
  for(let i=0;i<position.count;i++)if(position.getY(i)<-.10&&position.getY(i)>-.20&&position.getZ(i)>.045&&Math.abs(position.getX(i))<.04){const p=new THREE.Vector3();skin.getVertexPosition(i,p);avatar.group.worldToLocal(skin.localToWorld(p));const top=Math.max(...surfaces.map(vertices=>surfaceAt(vertices,p,1)));assert(top>p.y+.001,`${bottom}/${pose}: actual thigh front covered at ${p.toArray()} (cloth ${top})`);samples++;}
 }
}
assert(samples>50,'coverage checks real skinned thigh samples');
// Supporting knees stay almost extended in standing fashion poses. Check the
// actual thigh skin against the clothing surface in thigh coordinates, so a
// visible side slit cannot hide behind a passing top-only lap coverage test.
for(const bottom of ['gown','wrap','pleated','tennis','denim-skirt','satin-mini'])for(const pose of ['hair-touch','crossed-arms','leg-pop']){
 avatar.setLook({...look,bottom});avatar.setPose(pose);for(let i=0;i<180;i++)avatar.update(1/60,still);avatar.group.updateMatrixWorld(true);
 const clothing=avatar.group.getObjectByName('bottom '+bottom),meshes=[];clothing.traverse(n=>{if(n.isMesh)meshes.push(n);});
 for(const side of [-1,1]){const hip=avatar.rig.bones[side<0?'leftUpperLeg':'rightUpperLeg'],skin=hip.getObjectByName('leg continuous skin'),position=skin.geometry.attributes.position,cloth=meshes.map(mesh=>meshVertices(mesh,hip));
  for(let i=0;i<position.count;i++)if(position.getY(i)<-.06&&position.getY(i)>-.20&&position.getZ(i)>.045&&Math.abs(position.getX(i))<.04){const p=new THREE.Vector3();skin.getVertexPosition(i,p);const front=Math.max(...cloth.map(vertices=>surfaceAt(vertices,p,2)));assert(front>p.z+.001,`${bottom}/${pose}: thigh front contained at ${p.toArray()} (cloth ${front})`);}
  const mirrored=cloth.map(vertices=>vertices.map(p=>new THREE.Vector3(p.x*side,p.y,p.z)));
  for(let i=0;i<position.count;i++)if(position.getY(i)<-.06&&position.getY(i)>-.20&&side*position.getX(i)>.065&&Math.abs(position.getZ(i))<.035){const p=new THREE.Vector3();skin.getVertexPosition(i,p);p.x*=side;const outer=Math.max(...mirrored.map(vertices=>surfaceAt(vertices,p,0)));assert(outer>p.x+.001,`${bottom}/${pose}: thigh side contained at ${p.toArray()} (cloth ${outer})`);}
 }
}
// Real resident transforms use the same catalogue and mirror only the first
// co-star. An independently posed second resident keeps the outer composition.
global.document={createElement:()=>({getContext:()=>({beginPath(){},roundRect(){},fill(){},fillText(){}})})};
const residents=load('game/residents').createResidents(1),player=new THREE.Vector3(0,0,0),heading=.73;
const barbie=residents.root.children.find(p=>p.name==='Barbie'),ken=residents.root.children.find(p=>p.name==='Ken');
for(const entry of PAIR_POSES){const layout=getPairLayout(entry.id);residents.setPhotoGroup(['barbie','ken'],'leg-pop',entry.id);for(let i=0;i<120;i++)residents.update(1/60,player,true,1,heading);residents.root.updateMatrixWorld(true);
 assert(Math.abs(barbie.position.x-(-Math.cos(heading)*layout.spacing+Math.sin(heading)*layout.depth))<1e-9,'resident uses rotated layout spacing');assert.equal(barbie.rotation.y,heading+layout.friendYaw);
 const doll=barbie.children.find(child=>child.name==='Dreamland fashion doll');assert.equal(doll.scale.x,layout.mirror?-1:1,'resident mirror follows catalogue');assert.equal(ken.position.x,Math.cos(heading)*.92+Math.sin(heading)*.05,'second co-star keeps independent outer spot');assert.equal(ken.children[0].scale.x,1.05,'second co-star is never pair-mirrored');
}
residents.setPhotoGroup(['ken'],'kneel','unknown');residents.update(1/60,player,true,1);assert.equal(ken.position.x,.92,'unknown saved pair falls back to independent pose');assert(ken.children[0].position.y<-.4,'Ken approximates new kneeling silhouette rather than idling');residents.dispose();
console.log('PASS: six solo + eight duo joint silhouettes, supported soles/knees, gestures, original venue groove, resident layouts/mirrors, six floor-pose skirts and standing thigh front/side containment');
