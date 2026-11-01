const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript'),THREE=require('three');
const root=path.resolve(__dirname,'..'),cache={};
function load(name){name=name.replace(/\.tsx?$/,'');if(cache[name])return cache[name];const mod={exports:{}};cache[name]=mod.exports;new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path.join(root,'src',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(id=>id.startsWith('@/')?load(id.slice(2)):(id.startsWith('./')||id.startsWith('../'))?load(path.posix.join(path.posix.dirname(name),id)):require(id),mod,mod.exports);return cache[name]=mod.exports;}
function outerAt(mesh,vertices,x,y){let outer=-Infinity;const index=mesh.geometry.index,count=index?index.count:vertices.length;for(let i=0;i<count;i+=3){const a=vertices[index?index.getX(i):i],b=vertices[index?index.getX(i+1):i+1],c=vertices[index?index.getX(i+2):i+2],den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(den)<1e-10)continue;const u=((b.y-c.y)*(x-c.x)+(c.x-b.x)*(y-c.y))/den,v=((c.y-a.y)*(x-c.x)+(a.x-c.x)*(y-c.y))/den,w=1-u-v;if(Math.min(u,v,w)>-1e-5)outer=Math.max(outer,u*a.z+v*b.z+w*c.z);}return outer;}
const avatar=load('game/avatar').createAvatar(),look=load('game/fashion').DEFAULT_LOOK,motion={moving:true,speed:4.5,grounded:true,dancing:false,sitting:false};
const depth={gown:.40,wrap:.22,pleated:.22,tennis:.15,'denim-skirt':.33,'satin-mini':.15};let checked=0;const failures=[];
for(const bottom of Object.keys(depth)){
 avatar.setLook({...look,bottom});avatar.setPose('idle');for(let i=0;i<80;i++)avatar.update(1/60,motion);
 for(let phase=0;phase<12;phase++){
  for(let i=0;i<4;i++)avatar.update(1/60,motion);avatar.group.updateMatrixWorld(true);
  const skirt=avatar.group.getObjectByName(bottom+' skirt'),cloth=skirt.children.filter(n=>n.isSkinnedMesh).sort((a,b)=>b.geometry.attributes.position.count-a.geometry.attributes.position.count)[0];
  const surfaces={};for(const direction of [-1,1]){const vertices=[];for(let i=0;i<cloth.geometry.attributes.position.count;i++){const v=new THREE.Vector3();cloth.getVertexPosition(i,v);vertices.push(new THREE.Vector3(v.x,v.y,v.z*direction));}surfaces[direction]=vertices;}
  for(const side of [-1,1]){
   const hip=avatar.group.getObjectByName(side<0?'hip.L':'hip.R'),skin=hip.children.find(n=>n.name==='leg continuous skin'),source=skin.geometry.attributes.position;
   for(const direction of [-1,1]){
    if((direction<0&&hip.rotation.x<.28)||(direction>0&&hip.rotation.x>-.28))continue;
    for(let i=0;i<source.count;i++)if(source.getY(i)<-.12&&source.getY(i)>-depth[bottom]&&direction*source.getZ(i)>.02&&Math.abs(source.getX(i))<.073){
     const vertex=new THREE.Vector3();skin.getVertexPosition(i,vertex);skirt.worldToLocal(skin.localToWorld(vertex));
     const outer=outerAt(cloth,surfaces[direction],vertex.x,vertex.y);checked++;
     if(outer<direction*vertex.z+.002&&failures.filter(f=>f.bottom===bottom&&f.direction===direction).length<1)failures.push({bottom,direction,phase,skin:vertex.toArray(),cloth:outer});
    }
   }
  }
 }
}
assert(checked>100,'sample real forward and rear thighs across skirt silhouettes');assert.deepEqual(failures,[],'opaque fabric covers both gait directions above its hem');console.log('PASS: front/rear thigh coverage across all six skirts and twelve gait phases ('+checked+' samples)');
