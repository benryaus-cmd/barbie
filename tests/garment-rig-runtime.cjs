const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const repo=process.env.DREAMLAND_REPO||path.resolve(__dirname,'..');
const localRequire=createRequire(repo+'/package.json'),THREE=localRequire('three'),ts=localRequire('typescript');
const cache={};function load(name){name=name.replace(/\.tsx?$/,'');if(cache[name])return cache[name];const file=repo+'/src/'+name+'.ts',mod={exports:{}};cache[name]=mod.exports;new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(id=>id.startsWith('@/')?load(id.slice(2)):(id.startsWith('./')||id.startsWith('../'))?load(path.posix.join(path.posix.dirname(name),id)):localRequire(id),mod,mod.exports);return cache[name]=mod.exports;}
const filename=repo+'/src/game/character/garment-rig.ts';
assert(fs.existsSync(filename),'weighted garment rig module must exist');
const {createGarmentRig}=load('game/character/garment-rig');
assert.equal(typeof createGarmentRig,'function');
const silhouettes={gown:[[.39,-.88],[.405,-.87],[.25,-.38],[.19,-.12],[.169,.05]],wrap:[[.264,-.35],[.219,-.17],[.18,.035]],pleated:[[.28,-.315],[.20,-.1],[.168,.045]],tennis:[[.28,-.255],[.20,-.1],[.168,.045]],denim:[[.204,-.39],[.20,-.1],[.17,.04]],mini:[[.213,-.245],[.20,-.09],[.167,.045]]};
const still={sitting:false,moving:false,speed:0,dancing:false,pose:'idle',phase:0};
const seated={...still,sitting:true,vehicle:'scooter'};
function positions(mesh){const out=[];for(let i=0;i<mesh.geometry.attributes.position.count;i++){const p=new THREE.Vector3();mesh.getVertexPosition(i,p);out.push(p);}return out;}
function topAt(mesh,vertices,x,z){let top=-Infinity;const indices=mesh.geometry.index;const count=indices?indices.count:vertices.length;for(let i=0;i<count;i+=3){const a=vertices[indices?indices.getX(i):i],b=vertices[indices?indices.getX(i+1):i+1],c=vertices[indices?indices.getX(i+2):i+2];const den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(den)<1e-10)continue;const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den,w=1-u-v;if(Math.min(u,v,w)>-1e-5)top=Math.max(top,u*a.y+v*b.y+w*c.y);}return top;}
for(const [name,profile] of Object.entries(silhouettes)){
 const skirt=new THREE.Group();skirt.name=name+' skirt';
 const fabric=new THREE.MeshStandardMaterial(),trim=new THREE.MeshStandardMaterial({color:0xffd700});
 const cloth=new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),28),fabric);cloth.scale.z=['wrap','denim','mini'].includes(name)?.8:.82;if(name==='wrap')cloth.rotation.z=-.12;skirt.add(cloth);
 const decoration=new THREE.Mesh(new THREE.TorusGeometry(profile[0][0],.005,5,28),trim);decoration.rotation.x=Math.PI/2;decoration.scale.y=.82;decoration.position.y=profile[0][1];skirt.add(decoration);
 const originalCount=cloth.geometry.attributes.position.count;
 const rig=createGarmentRig(skirt),meshes=[];skirt.traverse(o=>{if(o.isMesh)meshes.push(o);});
 assert.equal(meshes.length,2,`${name}: all fabric and trims retained`);
 for(const mesh of meshes){assert(mesh.isSkinnedMesh,`${name}: decorations and fabric use real SkinnedMesh`);assert(mesh.skeleton.bones.every(b=>b.isBone));assert(mesh.geometry.attributes.skinIndex);assert(mesh.geometry.attributes.skinWeight);assert([fabric,trim].includes(mesh.material),'original fabric/trim material object preserved');assert(mesh.geometry.attributes.normal.array.every(Number.isFinite),'weighted lighting normals remain finite');}
 const surface=meshes.find(m=>m.material===fabric);assert(surface.geometry.attributes.position.count>originalCount*2,`${name}: sparse rows receive bend subdivisions`);
 const baseline=positions(surface);for(let i=0;i<120;i++)rig.update(1/60,seated);
 skirt.updateMatrixWorld(true);const sitting=positions(surface);
 assert(sitting.some((p,i)=>p.distanceTo(baseline[i])>.12),`${name}: actual skinned surface bends over thighs`);
 for(let i=0;i<baseline.length;i++)if(baseline[i].y>=.04)assert(sitting[i].distanceTo(baseline[i])<1e-6,`${name}: waist anchors remain fixed`);
 // Points begin beyond the waist opening (the separate pelvis garment covers it).
 for(const x of [-.108,.108])for(const z of [.12,.17,.21]){
  const clothTop=topAt(surface,sitting,x,z),thighTop=-.025-z/Math.tan(1.4)+.077;
  assert(Number.isFinite(clothTop),`${name}: fabric covers thigh at ${x},${z}`);
  assert(clothTop>thighTop+.008,`${name}: seated cloth ${clothTop} clears thigh ${thighTop} at ${x},${z}`);
 }
 if(name==='gown')assert(Math.min(...sitting.map(p=>p.y))<-.46,'long gown retains a downward draping hem beyond knee');
 else for(let i=0;i<baseline.length;i++)if(baseline[i].y<profile[0][1]+.035&&baseline[i].z>.12)assert(sitting[i].y<.075,`${name}: front hem lies on lap below the upper waist instead of forming raised fins`);
 for(const dt of [Infinity,NaN,-1,1e9])rig.update(dt,{...seated,moving:true,speed:Infinity,phase:NaN});
 skirt.updateMatrixWorld(true);for(const mesh of meshes)for(const p of positions(mesh))assert([p.x,p.y,p.z].every(Number.isFinite),`${name}: adversarial dt and phase remain finite`);
 for(let i=0;i<240;i++)rig.update(1/60,still);
 skirt.updateMatrixWorld(true);positions(surface).forEach((p,i)=>assert(p.distanceTo(baseline[i])<1e-6,`${name}: standing restores exact baseline`));
 rig.update(1/60,{...still,moving:true,speed:4,phase:1});skirt.updateMatrixWorld(true);
 assert(positions(surface).some((p,i)=>p.distanceTo(baseline[i])>1e-5),`${name}: weighted hem responds to movement`);
 rig.update(0,seated,true);skirt.updateMatrixWorld(true);assert(positions(surface).some((p,i)=>p.distanceTo(baseline[i])>.12),'newly selected mounted garment snaps to current seated pose');
 rig.update(0,still,true);skirt.updateMatrixWorld(true);positions(surface).forEach((p,i)=>assert(p.distanceTo(baseline[i])<1e-6,'reselected standing garment clears stale riding deformation immediately'));
}
// Integration regression: use the same IK and weighted skin rendered by the game.
// A top-only lap test misses the exposed outer-hip wedge seen in scooter QA.
function sideAt(mesh,vertices,y,z,side){let outer=-Infinity;const index=mesh.geometry.index,count=index?index.count:vertices.length;for(let i=0;i<count;i+=3){const a=vertices[index?index.getX(i):i],b=vertices[index?index.getX(i+1):i+1],c=vertices[index?index.getX(i+2):i+2];const den=(b.z-c.z)*(a.y-c.y)+(c.y-b.y)*(a.z-c.z);if(Math.abs(den)<1e-10)continue;const u=((b.z-c.z)*(y-c.y)+(c.y-b.y)*(z-c.z))/den,v=((c.z-a.z)*(y-c.y)+(a.y-c.y)*(z-c.z))/den,w=1-u-v;if(Math.min(u,v,w)>-1e-5)outer=Math.max(outer,side*(u*a.x+v*b.x+w*c.x));}return outer;}
const avatar=load('game/avatar').createAvatar(),look=load('game/fashion').DEFAULT_LOOK;
for(const bottom of ['gown','wrap','pleated','tennis','denim-skirt','satin-mini'])for(const mode of ['scooter','convertible','buggy','pet','surf']){
 avatar.setLook({...look,bottom});avatar.setPose(mode==='pet'||mode==='surf'?mode:'idle');
 for(let frame=0;frame<150;frame++)avatar.update(1/60,{...still,grounded:true,sitting:!['pet','surf'].includes(mode),vehicle:mode});
 avatar.group.updateMatrixWorld(true);
 const skirt=avatar.group.getObjectByName(bottom+' skirt'),surfaces=[];skirt.traverse(n=>{if(n.isSkinnedMesh)surfaces.push({mesh:n,vertices:positions(n)});});
 for(const side of [-1,1]){
  const hip=avatar.group.getObjectByName(side<0?'hip.L':'hip.R'),skin=hip.children.find(n=>n.name==='leg continuous skin'),source=skin.geometry.attributes.position;
  let samples=0;
  for(let i=0;i<source.count;i++)if(source.getY(i)<-.095&&source.getY(i)>-.19&&side*source.getX(i)>.065){
   const vertex=new THREE.Vector3();skin.getVertexPosition(i,vertex);skirt.worldToLocal(skin.localToWorld(vertex));
   const outer=Math.max(...surfaces.map(({mesh,vertices})=>sideAt(mesh,vertices,vertex.y,vertex.z,side)));
   assert(outer>side*vertex.x+.003,`${bottom}/${mode}: actual ${side<0?'left':'right'} thigh side covered at ${vertex.toArray()} (cloth ${outer})`);samples++;
  }
  for(let i=0;i<source.count;i++)if(!['pet','surf'].includes(mode)&&source.getY(i)<-.095&&source.getY(i)>-.19&&source.getZ(i)>.04&&Math.abs(source.getX(i))<.055){
   const vertex=new THREE.Vector3();skin.getVertexPosition(i,vertex);skirt.worldToLocal(skin.localToWorld(vertex));
   const top=Math.max(...surfaces.map(({mesh,vertices})=>topAt(mesh,vertices,vertex.x,vertex.z)));
   assert(top>vertex.y+.003,`${bottom}/${mode}: actual thigh top covered at ${vertex.toArray()} (cloth ${top})`);
  }
  assert(samples>0,'real thigh sampled');
 }
}
const second=load('game/avatar').createAvatar();
avatar.setLook({...look,bottom:'gown'});avatar.setPose('idle');
for(let frame=0;frame<90;frame++)avatar.update(1/60,{...still,moving:true,speed:4.5,grounded:true});
let walkingSamples=0;
for(let frame=0;frame<120;frame++){
 avatar.update(1/60,{...still,moving:true,speed:4.5,grounded:true});
 if(frame%15)continue;avatar.group.updateMatrixWorld(true);
 const skirt=avatar.group.getObjectByName('gown skirt'),surfaces=[];skirt.traverse(n=>{if(n.isSkinnedMesh)surfaces.push({mesh:n,vertices:positions(n).map(p=>new THREE.Vector3(p.x,p.z,p.y))});});
 for(const side of [-1,1]){
  const hip=avatar.group.getObjectByName(side<0?'hip.L':'hip.R');if(hip.rotation.x>-.3)continue;
  const skin=hip.children.find(n=>n.name==='leg continuous skin'),source=skin.geometry.attributes.position;
  for(let i=0;i<source.count;i++)if(source.getY(i)<-.12&&source.getY(i)>-.40&&source.getZ(i)>.04&&Math.abs(source.getX(i))<.04){
   const vertex=new THREE.Vector3();skin.getVertexPosition(i,vertex);skirt.worldToLocal(skin.localToWorld(vertex));
   const front=Math.max(...surfaces.map(({mesh,vertices})=>topAt(mesh,vertices,vertex.x,vertex.y)));
   assert(front>vertex.z+.003,`walking gown: forward thigh covered at ${vertex.toArray()} (cloth ${front})`);walkingSamples++;
  }
 }
}
assert(walkingSamples>20,'walking coverage checks actual forward-thigh vertices over gait phases');
const skirtMesh=character=>{let found;character.group.getObjectByName('gown skirt').traverse(n=>{if(n.isSkinnedMesh&&!found)found=n;});return found;};
const firstMesh=skirtMesh(avatar),secondMesh=skirtMesh(second),firstArray=firstMesh.geometry.morphAttributes.position[0].array,secondArray=secondMesh.geometry.morphAttributes.position[0].array;
assert.notEqual(firstArray,secondArray,'reused authoring cache clones mutable geometry data for each avatar');
const before=secondArray[0];firstArray[0]+=1;assert.equal(secondArray[0],before,'editing one avatar cannot modify another cached garment');
console.log('PASS: six weighted skirt silhouettes, all trims skinned, fixed waists, actual vertex bending, seated thigh clearance, real rider/crouch side containment, gown drape, bounded dt and exact standing recovery');
