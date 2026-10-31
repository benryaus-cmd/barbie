const fs=require('node:fs'), assert=require('node:assert/strict'), ts=require('typescript'),THREE=require('three');
function compile(file,mocks={}){const mod={exports:{}};const code=ts.transpileModule(fs.readFileSync('src/game/'+file+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;new Function('require','module','exports',code)(id=>mocks[id]??require(id),mod,mod.exports);return mod.exports;}
const {createCameraRig}=compile('camera');
const camera=new THREE.PerspectiveCamera(58,.6,.1,900), rig=createCameraRig(camera),target=new THREE.Vector3();
rig.update(1/60,target,false,false);
rig.setWalkHeading(Math.PI/2);for(let i=0;i<240;i++)rig.update(1/60,target,false,false);
assert(Math.abs(Math.atan2(Math.sin(rig.getYaw()-1.5*Math.PI),Math.cos(rig.getYaw()-1.5*Math.PI)))<.002,'camera follows behind walking direction');
rig.setWalkHeading(null);rig.rotate(60,-15);const manual=rig.getYaw();for(let i=0;i<240;i++)rig.update(1/60,target,false,false);assert.equal(rig.getYaw(),manual,'stationary orbit does not recenter');rig.rotate(NaN,0);assert.equal(rig.getYaw(),manual,'invalid pointer deltas ignored');
rig.setPresentation('photo');rig.update(1/60,target,false,false);assert(camera.position.z>3,'photo camera faces doll');rig.reset();assert.equal(rig.getYaw(),0);
const group=()=>new THREE.Group(), noop=()=>{};let starts=0,stops=0,stageUpdates=0;const directions=[];
const position=new THREE.Vector3(7,1.4,-13);const fakePhysics={position,grounded:true,step(x,z,s,j,dt){directions.push([x,z]);position.x+=x*s*dt;position.z+=z*s*dt;},teleport(x,y,z){position.set(x,y,z)},free:noop};
global.document={createElement:()=>({width:64,height:64,getContext:()=>({createRadialGradient:()=>({addColorStop:noop}),fillRect:noop})})};
const avatar={group:group(),update:noop,setPose:noop,setLook:noop,setOutfit:noop,setHair:noop,setAccessory:noop,setShoes:noop,celebrate:noop};
const vehicles=Object.fromEntries(['convertible','scooter','buggy'].map(id=>[id,{group:group(),home:new THREE.Vector3(),wheels:[],seatY:.5}]));
const mocks={
'@/game/activity-stage':{createActivityStage:()=>({root:group(),start:()=>starts++,stop:()=>stops++,setInput:noop,setPouring:noop,update:()=>stageUpdates++,active:()=>starts>stops})},
'@/game/residents':{createResidents:()=>({root:group(),nearest:()=>null,update:noop,setPhotoCompanion:noop,dispose:noop})},
'@/game/pet-companion':{createPetCompanion:()=>({root:group(),update:noop,setAction:noop,reset:noop})},
'@/game/avatar':{createAvatar:()=>avatar},'@/game/camera':{createCameraRig},
'@/game/card-pickups':{createCardPickups:()=>({group:group(),update:noop,setCollected:noop,dispose:noop})},
'@/game/particles':{createParticles:()=>({points:group(),burst:noop,sparkle:noop,update:noop,dispose:noop})},
'@/game/palette':{PALETTE:{gold:0xffd200,hotPink:0xff33aa}},'@/game/physics':{createPhysics:()=>fakePhysics,FEET_OFFSET:1},
'@/game/spots':{SPOTS:[],nearestSpot:()=>null,zoneAt:()=>'dreamhouse'},
'@/game/tokens':{createTokens:()=>({group:group(),update:()=>0,reset:noop})},
'@/game/vehicles':{buildVehicles:()=>vehicles},'@/game/world':{buildWorld:()=>({root:group(),colliders:[],bobbers:[],pulses:[],update:noop,setHoverSpot:noop})}};
const {createSandbox}=compile('sandbox',mocks);const box=createSandbox({camera:new THREE.PerspectiveCamera(58,.6,.1,900),tuning:{walkSpeed:5.4,effects:false},emit:noop});
box.api.setMove(1,0);for(let i=0;i<360;i++)box.update(1/60);
for(const [x,z] of directions) {assert(Math.abs(x-1)<1e-7);assert(Math.abs(z)<1e-7,'held lateral stick never curves as camera follows');}
box.api.setMove(0,0);box.api.rotateCamera(70,0);box.update(1/60);const before=position.clone();box.api.setMove(0,1);box.update(1/60);assert(position.distanceTo(before)>0,'movement resumes after manual stationary orbit');
box.api.setMove(NaN,Infinity);box.update(1/60);assert.deepEqual(directions.at(-1),[0,0],'nonfinite input clears to neutral');
box.api.setActivity('surf');box.api.setActivity('surf');box.api.setPresentation('world');box.api.setActivity('surf');assert.equal(starts,1,'same activity remains idempotent across parent rerender');box.update(1/60);assert.equal(stageUpdates,1);box.api.setActivity(null);assert.equal(stops,1);box.api.setPresentation('photo');box.api.setActivity(null);box.update(1/60);assert.equal(avatar.group.rotation.y,0,'inactive null activity does not undo photo presentation');
box.dispose();console.log('PASS camera follow, stationary orbit, invalid deltas, photo/reset framing, held-stick no drift (360 frames), invalid move, activity idempotence, parent effect order');
