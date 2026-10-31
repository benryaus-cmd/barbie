import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizePreferences,loadPreferences,savePreferences} from '../src/game/preferences.ts';
test('quality and accessibility settings roundtrip and reject malformed values',()=>{
 const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
 const p={quality:'low',music:false,effects:false,sparkles:false,sensitivity:.7,reducedMotion:true};savePreferences(p);assert.deepEqual(loadPreferences(),p);
 assert.equal(sanitizePreferences({quality:'ultra',sensitivity:Infinity}).quality,'balanced');
 assert.equal(sanitizePreferences({sensitivity:-1}).sensitivity,.5);
 assert.equal(sanitizePreferences({sensitivity:200}).sensitivity,1.5);
});
