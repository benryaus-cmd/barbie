import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeProfile, loadProfile, saveProfile, PROFILE_KEY } from '../src/game/profile.ts';

test('malformed saves never produce invalid currency or inaccessible outfit', () => {
 const p=sanitizeProfile({points: Infinity,earned:-20, outfit:'popstar',unlocked:['garbage'],hair:'bad',accessory:'bad',shoes:'bad'});
 assert.deepEqual(p,{points:0,earned:0,outfit:'glam',unlocked:['glam','beach'],hair:'blonde',accessory:'none',shoes:'heels'});
 assert.equal(sanitizeProfile({points:200,earned:50}).points,50);
 assert.equal(sanitizeProfile([]).outfit,'glam');
});
test('wallet and purchased look survive save/reload without touching card progress', () => {
 const memory=new Map([['barbie-ultimate-dreamland:collector-cards','[1,3]']]);
 globalThis.localStorage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
 const profile={points:40,earned:80,outfit:'popstar',hair:'pink',accessory:'tiara',shoes:'boots',unlocked:['glam','beach','popstar']};
 saveProfile(profile);
 assert.deepEqual(loadProfile(),profile);
 assert.equal(memory.get('barbie-ultimate-dreamland:collector-cards'),'[1,3]');
 memory.set(PROFILE_KEY,'broken json');
 assert.equal(loadProfile().points,0);
});
test('disabled storage still allows a playable session',()=> {
 globalThis.localStorage={getItem(){throw Error('blocked')},setItem(){throw Error('quota')}};
 assert.equal(loadProfile().outfit,'glam');
 assert.doesNotThrow(()=>saveProfile(sanitizeProfile(null)));
});
