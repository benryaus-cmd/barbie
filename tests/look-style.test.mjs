import test from 'node:test';
import assert from 'node:assert/strict';
import {migrateLifestyle} from '../src/game/lifestyle-save.ts';
import {sanitizeProfile} from '../src/game/profile.ts';
import {addPhoto,sanitizeSocial,photoSignature} from '../src/game/social.ts';
const profile=sanitizeProfile({points:500,unlocked:['glam','casual'],outfit:'glam'});
const look={top:'glam',bottom:'gown',topColor:'#ec4899',bottomColor:'#ec4899',accessories:['earrings'],topFinish:'glitter',bottomFinish:'satin',topPattern:'stripes',bottomPattern:'stars',topAccent:'#fffaf3',bottomAccent:'#53dbe4',accessoryColors:{earrings:'#fffaf3',choker:'#53dbe4'},hairColor:'#412a39',hairSecondaryColor:'#f378b7',hairBlend:'split'};
test('new material, accessory and two-tone hair choices survive active look, personal sets and photos',()=>{
 const save=migrateLifestyle(profile,{look,savedLooks:[{id:'mix',name:'New mix',look,hair:'bob',shoes:'boots'}]});
 for(const k of ['topFinish','bottomFinish','topPattern','bottomPattern','topAccent','bottomAccent','accessoryColors','hairSecondaryColor','hairBlend']){assert.deepEqual(save.look[k],look[k]);assert.deepEqual(save.savedLooks[0].look[k],look[k]);}
 const photo={image:'data:image/jpeg;base64,/9j/AA==',pose:'peace',zone:'Beach',look,companionId:null,companionName:null};
 const album=sanitizeSocial(JSON.parse(JSON.stringify(addPhoto(sanitizeSocial(null),photo,1))));
 assert.deepEqual(album.photos[0].look,look);
});
test('bad optional styles are rejected and old photo identities stay unchanged',()=>{
 const raw={...look,topFinish:'bad',bottomPattern:'url(evil)',hairBlend:'bad',hairSecondaryColor:'nope',accessoryColors:{earrings:'#ffffff',bad:'#ffffff',choker:'red'}};
 const save=migrateLifestyle(profile,{look:raw});assert.equal(save.look.topFinish,undefined);assert.equal(save.look.bottomPattern,undefined);assert.equal(save.look.hairSecondaryColor,undefined);assert.equal(save.look.hairBlend,undefined);assert.deepEqual(save.look.accessoryColors,{earrings:'#ffffff'});
 const old={top:'glam',bottom:'gown',accessories:[],topColor:'#ec4899',bottomColor:'#ec4899'};
 const photo={pose:'peace',zone:'Beach',look:old,companionId:null};
 assert.equal(photoSignature(photo),JSON.stringify(['glam','gown',[],'#ec4899','#ec4899','peace','beach','solo']));
 assert.equal(photoSignature(photo),photoSignature({...photo,look:{...old,topPattern:'solid',topFinish:'original',topAccent:'#ffffff'}}));
 assert.notEqual(photoSignature(photo),photoSignature({...photo,look:{...old,topPattern:'stripes',topAccent:'#ffffff'}}));
 assert.notEqual(photoSignature({...photo,look}),photoSignature({...photo,look:{...look,accessoryColors:{earrings:'#53dbe4'}}}));
});
