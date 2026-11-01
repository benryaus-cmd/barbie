const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ts=require('typescript'),THREE=require('three'),root=path.resolve(__dirname,'..'),cache={};
function load(name){name=name.replace(/\.tsx?$/,'');name=name.replace(/\.ts$/,'');if(cache[name])return cache[name];const mod={exports:{}};cache[name]=mod.exports;new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path.join(root,'src',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(id=>id.startsWith('@/')?load(id.slice(2)):id.startsWith('.')?load(path.posix.join(path.posix.dirname(name),id)):require(id),mod,mod.exports);return cache[name]=mod.exports;}
const avatar=load('game/avatar').createAvatar(),{DEFAULT_LOOK}=load('game/fashion');
const nodes=name=>{const out=[];avatar.group.traverse(n=>{if(n.name===name)out.push(n)});assert(out.length,name);return out;};
const materials=group=>{const out=new Set();group.traverse(n=>{if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material])out.add(m)});return [...out];};
const accessoryNames={tiara:'tiara',sunglasses:'sunglasses',earrings:'earring',necklace:'heart necklace',bow:'silk hair bow','round-shades':'round sun lenses','star-shades':'starlet shades',sunhat:'Riviera sunhat',beret:'Parisian beret',headband:'pearl headband',choker:'velvet choker',bracelets:'rainbow bangles'};
const original=new Map();avatar.group.traverse(n=>{if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material])original.set(m,m.color.getHexString());});
const colors=Object.fromEntries(Object.keys(accessoryNames).map((id,i)=>[id,'#'+(0x3058b1+i*0x080400).toString(16).padStart(6,'0')]));
avatar.setLook({...DEFAULT_LOOK,accessories:Object.keys(accessoryNames),accessoryColors:colors});
const owned=new Set();
for(const [id,name] of Object.entries(accessoryNames)){
 const changed=[...new Set(nodes(name).flatMap(materials))].filter(m=>m.color.getHexString()===colors[id].slice(1));
 assert(changed.length,id+' receives its own visible colour');
 for(const m of changed){assert(!owned.has(m),id+' has no material shared with another accessory');owned.add(m);}
}
const unrelated=materials(nodes('top glam')[0]);assert(unrelated.every(m=>!owned.has(m)),'accessories never share torso material');
for(const name of ['sunglasses','round sun lenses','starlet shades'])assert(materials(nodes(name)[0]).some(m=>m.color.getHexString()===original.get(m)),name+' lenses keep their original colour');
avatar.setLook({...DEFAULT_LOOK});for(const [m,color] of original)assert.equal(m.color.getHexString(),color,'legacy look restores every accessory original');
function shader(material){const s={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(s,{});return s;}
const motion={moving:false,speed:0,grounded:true,dancing:false,sitting:false};
for(const bottom of ['gown','shorts','palazzo']){
 avatar.setLook({...DEFAULT_LOOK,bottom,topColor:'#9346a2',bottomColor:'#2965b1',topFinish:'satin',bottomFinish:'metallic',topPattern:'stars',bottomPattern:'floral',topAccent:'#fff3cb',bottomAccent:'#f2b8d3'});
 const group=nodes(bottom==='gown'?'bottom gown':bottom+' fitted trouser rig')[0];
 const cloth=materials(group).find(m=>m.color.getHexString()==='2965b1');assert(cloth,bottom+' actual fabric gets selected colour');assert(cloth.metalness>.7,bottom+' actual fabric gets metallic finish');assert(cloth.bumpMap,bottom+' preserves microtexture');
 group.traverse(n=>{if(n.isMesh&&n.material===cloth)assert.equal(n.geometry.getAttribute('stylePosition').count,n.geometry.getAttribute('position').count,'fabric authored coordinates survive weighting/subdivision');});
 const s=shader(cloth);assert(s.vertexShader.includes('stylePosition'),'authored coordinates supplied to shader');assert(s.fragmentShader.includes('fashionPattern'),'real fragment shader applies patterns');assert.equal(s.uniforms.fashionPattern.value,5);assert.equal(s.uniforms.fashionAccent.value.getHexString(),'f2b8d3');
 const version=cloth.version,uniform=s.uniforms.fashionPattern;
 avatar.setLook({...DEFAULT_LOOK,bottom,bottomFinish:'glitter',bottomPattern:'dots'});assert.equal(uniform.value,2,'uniform updates without shader replacement');assert.equal(cloth.version,version,'style edits do not recompile material');assert(shader(cloth).uniforms.fashionGlitter.value>0,'glitter changes real shader');
 const meshes=[];group.traverse(n=>{if(n.isMesh)meshes.push([n,n.geometry])});avatar.update(1/60,motion);assert(meshes.every(([n,g])=>n.geometry===g),'style update never rebuilds geometry per frame');
 avatar.setLook({...DEFAULT_LOOK,bottom});assert.equal(cloth.metalness,0,'legacy finish resets metalness');assert.equal(shader(cloth).uniforms.fashionPattern.value,0,'legacy resets print');
}
const top=materials(nodes('top glam')[0]).find(m=>m.color.getHexString()===DEFAULT_LOOK.topColor.slice(1));
assert(top,'actual selected top fabric');
for(const [finish,roughness,metalness] of [['matte',.94,0],['satin',.3,.16],['gloss',.13,.14],['metallic',.23,.84],['glitter',.34,.5]]){
 avatar.setLook({...DEFAULT_LOOK,topFinish:finish});assert.equal(top.roughness,roughness);assert.equal(top.metalness,metalness);
}
for(const [index,pattern] of ['solid','stripes','dots','gingham','stars','floral'].entries()){
 avatar.setLook({...DEFAULT_LOOK,topPattern:pattern});assert.equal(shader(top).uniforms.fashionPattern.value,index);
}
const other=load('game/avatar').createAvatar();let otherEarring;other.group.traverse(n=>{if(n.name==='earring')otherEarring=n;});
const untouched=materials(otherEarring).map(m=>m.color.getHexString());avatar.setLook({...DEFAULT_LOOK,accessoryColors:{earrings:'#12cbef'}});
assert.deepEqual(materials(otherEarring).map(m=>m.color.getHexString()),untouched,'resident/avatar material instances stay isolated');
for(const style of ['blonde','pink','updo','bob','curls','braids','pixie','twin-buns','straight']){
 avatar.setHair(style);const hair=nodes('hair '+style)[0];
 for(const blend of ['streaks','ombre','split']){
  avatar.setLook({...DEFAULT_LOOK,hairColor:'#341b59',hairSecondaryColor:'#47e8dd',hairBlend:blend});
  const dyed=materials(hair).filter(m=>m.name!=='accessory');assert(dyed.length>=2);
  for(const m of dyed.filter(m=>m.name.includes('hair'))){const s=shader(m);assert.equal(s.uniforms.fashionHairEnabled.value,1);assert.equal(s.uniforms.fashionHairSecondary.value.getHexString(),'47e8dd');assert(s.fragmentShader.includes('fashionHairBlend'));}
  hair.traverse(n=>{if(n.isMesh&&n.material.name.includes('hair')){const coordinates=n.geometry.getAttribute('stylePosition');assert(coordinates,style+' crown and locks retain authored dye coordinates');assert.equal(coordinates.count,n.geometry.getAttribute('position').count,style+' dye coordinates survive spring rig conversion');}});
 }
 avatar.setLook({...DEFAULT_LOOK});for(const m of materials(hair).filter(m=>m.name.includes('hair')))assert.equal(shader(m).uniforms.fashionHairEnabled.value,0,'legacy restores natural highlights');
}
console.log('PASS: independent accessory colours, live procedural fabric finishes/patterns, all hair dye styles and legacy material resets');
