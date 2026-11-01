import test from 'node:test';
import assert from 'node:assert/strict';
import {migrateLifestyle,saveLifestyle,loadLifestyle} from '../src/game/lifestyle-save.ts';
const legacy={points:90,earned:200,outfit:'popstar',hair:'pink',accessory:'tiara',shoes:'boots',unlocked:['glam','beach','popstar']};
test('old purchased looks and selected accessory migrate into separated wardrobe without losing currency',()=>{const p=migrateLifestyle(legacy);assert.equal(p.look.top,'popstar');assert.equal(p.look.bottom,'pleated');assert(p.ownedFashion.includes('top:popstar'));assert.deepEqual(p.look.accessories,['tiara']);assert.equal(legacy.points,90)});
test('stacked extras and mixed outfit persist, malformed/unowned items are discarded',()=>{const p=migrateLifestyle(legacy,{ownedFashion:['top:denim','bottom:palazzo','accessory:bow','top:fake'],look:{top:'denim',bottom:'palazzo',accessories:['tiara','sunglasses','bow','bad','tiara'],topColor:'#cc1133',bottomColor:'bad'},petBond:Infinity,toys:['ball','ball','bad']});assert.deepEqual(p.look.accessories,['tiara','sunglasses','bow']);assert.equal(p.look.top,'denim');assert.equal(p.look.bottom,'palazzo');assert.equal(p.look.bottomColor,'#b898f0');assert.equal(p.petBond,0);assert.deepEqual(p.toys,['ball']);const memory=new Map();globalThis.localStorage={setItem:(k,v)=>memory.set(k,v),getItem:k=>memory.get(k)};assert(saveLifestyle(p));assert.deepEqual(loadLifestyle(legacy),p)});
test('blocked storage keeps legacy ownership and a playable starter look',()=>{globalThis.localStorage={getItem(){throw Error('blocked')},setItem(){throw Error('full')}};assert.equal(loadLifestyle(legacy).look.top,'popstar');assert.equal(saveLifestyle(migrateLifestyle(legacy)),false)});
test('saved looks retain beauty, hair and shoes with bounded sanitized names and duplicate ids',()=>{
 const look={top:'glam',bottom:'gown',topColor:'#ec4899',bottomColor:'#fffaf3',accessories:['sunhat'],hairColor:'#388c94',makeup:'bold'};
 const sets=Array.from({length:12},(_,index)=>({id:`look-${index}`,name:'Dream night '.repeat(5),look,hair:'twin-buns',shoes:'platforms'}));
 const state=migrateLifestyle(legacy,{ownedFashion:['accessory:sunhat'],savedLooks:sets});
 assert.equal(state.savedLooks.length,8);assert.equal(state.savedLooks[0].name.length,32);assert.equal(state.savedLooks[0].hair,'twin-buns');assert.equal(state.savedLooks[0].shoes,'platforms');assert.equal(state.savedLooks[0].look.hairColor,'#388c94');assert.equal(state.savedLooks[0].look.makeup,'bold');assert.deepEqual(state.savedLooks[0].look.accessories,['sunhat']);
 const malformed=migrateLifestyle(legacy,{savedLooks:[null,{id:'bad id',name:'Bad'},{id:'valid',name:'\u0000  Night  ',look:{...look,makeup:'unknown',hairColor:'red'},hair:'bad',shoes:'bad'},{id:'valid',name:'Duplicate'}]});
 assert.equal(malformed.savedLooks.length,1);assert.equal(malformed.savedLooks[0].name,'Night');assert.equal(malformed.savedLooks[0].hair,'pink');assert.equal(malformed.savedLooks[0].shoes,'boots');assert.equal(malformed.savedLooks[0].look.makeup,undefined);assert.equal(malformed.savedLooks[0].look.hairColor,undefined);
});
test('existing ten colors migrate free while premium palette ownership persists and gates saved colors',()=>{
 const original=migrateLifestyle(legacy);assert.equal(original.ownedColors.length,18);assert.deepEqual(original.savedLooks,[]);
 const look={top:'glam',bottom:'gown',topColor:'#e8c77b',bottomColor:'#4058ef',accessories:[]};
 const locked=migrateLifestyle(legacy,{look});assert.equal(locked.look.topColor,'#fffaf3');assert.equal(locked.look.bottomColor,'#b898f0');
 const unlocked=migrateLifestyle(legacy,{look,ownedColors:['#E8C77B','#4058ef','#e8c77b','not-a-color']});
 assert.equal(unlocked.ownedColors.length,20);assert.equal(unlocked.look.topColor,'#e8c77b');assert.equal(unlocked.look.bottomColor,'#4058ef');
 const memory=new Map();globalThis.localStorage={setItem:(k,v)=>memory.set(k,v),getItem:k=>memory.get(k)};assert(saveLifestyle(unlocked));assert.deepEqual(loadLifestyle(legacy),unlocked);
});
test('face features survive active and saved looks, with unknown options discarded',()=>{
 const face={eyeStyle:'almond',mouthStyle:'full',eyeColor:'#765438'};
 const look={top:'glam',bottom:'gown',topColor:'#ec4899',bottomColor:'#ec4899',accessories:[],...face};
 const state=migrateLifestyle(legacy,{look,savedLooks:[{id:'face',name:'My face',look,hair:'straight',shoes:'heels'}]});
 for(const [key,value] of Object.entries(face)){assert.equal(state.look[key],value);assert.equal(state.savedLooks[0].look[key],value);}
 const bad=migrateLifestyle(legacy,{look:{...look,eyeStyle:'fake',mouthStyle:'fake',eyeColor:'url(x)'}});
 assert.equal(bad.look.eyeStyle,undefined);assert.equal(bad.look.mouthStyle,undefined);assert.equal(bad.look.eyeColor,undefined);
});
test('complete outfit presets preserve personal facial features and beauty choices',async()=>{
 const {presetLook}=await import('../src/game/fashion.ts');
 const current={top:'glam',bottom:'gown',topColor:'#ec4899',bottomColor:'#ec4899',accessories:[],eyeStyle:'wide',mouthStyle:'full',eyeColor:'#765438',hairColor:'#388c94',makeup:'bold'};
 const next=presetLook('beach',current);assert.equal(next.top,'beach');assert.equal(next.bottom,'wrap');
 for(const key of ['eyeStyle','mouthStyle','eyeColor','hairColor','makeup'])assert.equal(next[key],current[key]);
});
