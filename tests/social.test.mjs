import test from 'node:test';
import assert from 'node:assert/strict';
import { addPhoto, captionPhoto, deletePhoto, loadSocial, MAX_PHOTOS, MAX_SIGNATURES, photoSignature, publishPhoto, sanitizeSocial, saveSocial, SOCIAL_KEY, togglePhotoLike } from '../src/game/social.ts';
const look = {top:'glam',bottom:'gown',accessories:['tiara','earrings'],topColor:'#ff66aa',bottomColor:'#ffffff'};
const input = {image:'data:image/jpeg;base64,/9j/AA==',pose:'peace',companionId:null,companionName:null,zone:'Beach',look};
const empty = () => sanitizeSocial(null);

test('photos are bounded and real JPEG scene captures are required', () => {
  let state=empty();
  assert.equal(addPhoto(state,{...input,image:'https://example.com/fake.png'}),state);
  for(let i=0;i<20;i++) state=addPhoto(state,input,100+i);
  assert.equal(state.photos.length,MAX_PHOTOS);
  assert.equal(state.photos[0].createdAt,119);
  assert.equal(state.photos.at(-1).createdAt,108);
});
test('publish awards followers once per complete creative signature, including after deletion',()=>{
  let state=addPhoto(empty(),input,100);
  let result=publishPhoto(state,state.photos[0].id);
  assert(result.gained>0); state=result.state;
  assert.equal(publishPhoto(state,state.photos[0].id).gained,0,'same post cannot award twice');
  const firstFollowers=state.followers;
  state=deletePhoto(state,state.photos[0].id);
  state=addPhoto(state,{...input,look:{...look,accessories:['earrings','tiara']}},101);
  state=captionPhoto(state,state.photos[0].id,'A new caption does not change the shot');
  result=publishPhoto(state,state.photos[0].id);
  assert.equal(result.gained,0,'same outfit with reordered extras and a new caption is still the same shot');
  assert.equal(result.state.followers,firstFollowers);
  for(const variant of [{pose:'wave'},{zone:'Runway'},{companionId:'pet',companionName:'Pip'},{look:{...look,top:'beach'}}]) {
    state=addPhoto(result.state,{...input,...variant},102+Math.random());
    result=publishPhoto(state,state.photos[0].id);
    assert(result.gained>0,'a fresh pose, place, companion or look earns followers');
  }
  const liked=togglePhotoLike(result.state,result.state.photos[0].id);
  assert.equal(liked.followers,result.state.followers,'likes cannot farm followers');
  assert.equal(liked.photos[0].post.likes,result.state.photos[0].post.likes+1);
});
test('save and reload retain album, captions, fictional posts and reward history',()=>{
  const memory=new Map();
  const storage={getItem:key=>memory.get(key),setItem:(key,value)=>memory.set(key,value)};
  let state=addPhoto(empty(),input,100);
  state=publishPhoto(state,state.photos[0].id,['Skye','Cleo'],200).state;
  state=captionPhoto(state,state.photos[0].id,'Hello Dreamland!');
  const saved=saveSocial(state,storage);
  assert(saved.persisted);
  assert.deepEqual(loadSocial(storage),state);
  assert.equal(loadSocial(storage).photos[0].post.comments.length,2);
  memory.set(SOCIAL_KEY,'{bad');assert.deepEqual(loadSocial(storage),empty());
  assert.deepEqual(loadSocial({getItem(){throw Error('blocked')}}),empty());
});
test('quota failure keeps latest capture, retries with fewer old photos and handles total failure',()=>{
  let state=empty();for(let i=0;i<4;i++)state=addPhoto(state,input,100+i);
  const saved=saveSocial(state,{setItem(_key,raw){if(JSON.parse(raw).photos.length>1)throw Error('quota')}});
  assert(saved.persisted);assert(saved.trimmed);assert.equal(saved.state.photos.length,1);assert.equal(saved.state.photos[0].createdAt,103);
  const blocked=saveSocial(state,{setItem(){throw Error('blocked')}});
  assert.equal(blocked.persisted,false);assert.equal(blocked.state.photos.length,4);
});
test('malformed local data and signature history stay bounded without reopening rewards',()=>{
  const state=sanitizeSocial({followers:Infinity,photos:[{...input,id:'bad',pose:'illegal'}],rewardedSignatures:Array.from({length:800},(_,i)=>'signature-'+i)});
  assert.equal(state.followers,0);assert.equal(state.photos.length,0);assert.equal(state.rewardedSignatures.length,MAX_SIGNATURES);
  const next=addPhoto(state,input,100);
  assert.equal(publishPhoto(next,next.photos[0].id).gained,0,'full reward ledger cannot drop old identities and reopen farming');
  assert.equal(photoSignature({...input,look:{...look,accessories:['earrings','tiara']}}),photoSignature(input));
});
