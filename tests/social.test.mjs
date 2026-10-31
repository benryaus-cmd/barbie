import test from 'node:test';
import assert from 'node:assert/strict';
import { addPhoto, captionPhoto, deletePhoto, followerTier, loadSocial, MAX_PHOTOS, MAX_SIGNATURES, photoSignature, publishPhoto, sanitizeSocial, saveSocial, SOCIAL_KEY, togglePhotoLike } from '../src/game/social.ts';
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


test('group composition, independent co-star poses and paired poses have stable reward identities', () => {
  const group = {...input, companionId:'ken', companionName:'Ken & Barbie', groupIds:['ken','barbie'], groupNames:['Ken','Barbie'], companionPose:'wave', pair:null};
  assert.equal(photoSignature(group),photoSignature({...group,groupIds:['barbie','ken']}),'selection order does not create a new reward');
  assert.notEqual(photoSignature(group),photoSignature({...group,groupIds:['ken']}));
  assert.notEqual(photoSignature(group),photoSignature({...group,companionPose:'peace'}));
  assert.notEqual(photoSignature(group),photoSignature({...group,pair:'hug'}));
  assert.notEqual(photoSignature({...group,pair:'hug'}),photoSignature({...group,groupIds:['barbie','ken'],pair:'hug'}),'the paired partner is part of the composition');
  let state=addPhoto(empty(),group,1);state=publishPhoto(state,state.photos[0].id).state;
  const reloaded=sanitizeSocial(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(reloaded.photos[0].groupIds,['ken','barbie']);
  assert.equal(reloaded.photos[0].companionPose,'wave');
  let next=addPhoto(reloaded,{...group,pair:'half-heart'},2);
  assert(publishPhoto(next,next.photos[0].id).gained>0);
  next=addPhoto(reloaded,{...group,groupIds:['barbie','ken']},3);
  assert.equal(publishPhoto(next,next.photos[0].id).gained,0);
});
test('legacy single-companion saves retain their original signature and reward ledger', () => {
  const legacy={...input,id:'old',createdAt:1,caption:'Old memory',companionId:'ken',companionName:'Ken'};
  const signature=JSON.stringify([look.top,look.bottom,[...look.accessories].sort(),look.topColor,look.bottomColor,'peace','beach','ken']);
  const state=sanitizeSocial({followers:12,photos:[legacy],rewardedSignatures:[signature]});
  assert.deepEqual(state.photos[0].groupIds,['ken']);assert.equal(state.photos[0].companionPose,'wave');
  assert.equal(state.photos[0].signature,signature);assert.equal(publishPhoto(state,'old').gained,0);
  assert.equal(addPhoto(empty(),{...input,groupIds:['ken','barbie','pet']},2).photos[0].groupIds.length,2);
});
test('follower tiers show a capped activity point multiplier and clear next milestones', () => {
  assert.deepEqual([0,39,40,100,250,500,10000].map(value=>followerTier(value).multiplier),[1,1,1.1,1.2,1.35,1.5,1.5]);
  assert.equal(followerTier(39).next,40);assert.equal(followerTier(500).next,null);
});

test('extended accessories, hair colour and makeup survive photo saves and affect creative identity', () => {
  const styled={...input,look:{...look,accessories:['round-shades','sunhat','bracelets'],hairColor:'#bb6633',makeup:'rose'}};
  const state=addPhoto(empty(),styled,20);const reloaded=sanitizeSocial(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(reloaded.photos[0].look,styled.look);
  assert.notEqual(photoSignature(styled),photoSignature({...styled,look:{...styled.look,makeup:'bold'}}));
  assert.equal(photoSignature(input),photoSignature({...input,look:{...look,makeup:'fresh'}}));
});
