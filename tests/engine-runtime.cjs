const fs=require('node:fs'), assert=require('node:assert/strict'), ts=require('typescript'),THREE=require('three');
function compile(file,mocks={}){const mod={exports:{}};const code=ts.transpileModule(fs.readFileSync('src/game/'+file+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;new Function('require','module','exports',code)(id=>mocks[id]??(id.startsWith('@/game/')?compile(id.slice(7),mocks):require(id)),mod,mod.exports);return mod.exports;}
const {createCameraRig}=compile('camera');
const camera=new THREE.PerspectiveCamera(58,.6,.1,900), rig=createCameraRig(camera),target=new THREE.Vector3();
rig.update(1/60,target,false,false);
rig.setWalkHeading(Math.PI/2);for(let i=0;i<480;i++){target.x+=5.4/60;rig.update(1/60,target,false,false);}
assert(Math.abs(Math.atan2(Math.sin(rig.getYaw()-1.5*Math.PI),Math.cos(rig.getYaw()-1.5*Math.PI)))<.22,'camera follows behind sustained walking direction');
rig.setWalkHeading(null);rig.rotate(60,-15);const manual=rig.getYaw();for(let i=0;i<240;i++)rig.update(1/60,target,false,false);assert.equal(rig.getYaw(),manual,'stationary orbit does not recenter');rig.rotate(NaN,0);assert.equal(rig.getYaw(),manual,'invalid pointer deltas ignored');
rig.setPresentation('photo');rig.update(1/60,target,false,false);assert(camera.position.z>3,'photo camera faces doll');rig.reset();assert.equal(rig.getYaw(),0);
const group=()=>new THREE.Group(), noop=()=>{};let starts=0,stops=0,stageUpdates=0,stageDisposals=0;const directions=[];
const position=new THREE.Vector3(7,1.4,-13);const fakePhysics={position,grounded:true,step(x,z,s,j,dt){directions.push([x,z]);position.x+=x*s*dt;position.z+=z*s*dt;},teleport(x,y,z){position.set(x,y,z)},free:noop};
global.document={createElement:()=>({width:64,height:64,getContext:()=>({createRadialGradient:()=>({addColorStop:noop}),fillRect:noop})})};
const avatar={group:group(),update:noop,setPose:noop,setLook:noop,setOutfit:noop,setHair:noop,setAccessory:noop,setShoes:noop,celebrate:noop};
const vehicles=Object.fromEntries(['convertible','scooter','buggy'].map(id=>[id,{group:group(),home:new THREE.Vector3(),wheels:[],seatY:.5}]));
const scenery=group();let distantRaycasts=0;const distantMesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial());distantMesh.position.set(800,1,800);distantMesh.raycast=()=>distantRaycasts++;scenery.add(distantMesh);
const mocks={
'@/game/movement':compile('movement'),
'@/game/activity-stage':{createActivityStage:()=>({root:group(),start:()=>starts++,stop:()=>stops++,setInput:noop,setPouring:noop,update:()=>stageUpdates++,active:()=>starts>stops,dispose:()=>stageDisposals++})},
'@/game/residents':{createResidents:()=>({root:group(),nearest:()=>null,update:noop,setPhotoCompanion:noop,setPhotoGroup:noop,dispose:noop})},
'@/game/pet-companion':{createPetCompanion:()=>({root:group(),update:noop,setAction:noop,reset:noop})},
'@/game/avatar':{createAvatar:()=>avatar},'@/game/camera':{createCameraRig},
'@/game/card-pickups':{createCardPickups:()=>({group:group(),update:noop,setCollected:noop,dispose:noop})},
'@/game/particles':{createParticles:()=>({points:group(),burst:noop,sparkle:noop,update:noop,dispose:noop})},
'@/game/palette':{PALETTE:{gold:0xffd200,hotPink:0xff33aa}},'@/game/physics':{createPhysics:()=>fakePhysics,FEET_OFFSET:1},
'@/game/spots':{SPOTS:[],nearestSpot:()=>null,zoneAt:()=>'dreamhouse'},
'@/game/tokens':{createTokens:()=>({group:group(),update:()=>0,reset:noop})},
'@/game/vehicles':{buildVehicles:()=>vehicles},'@/game/world':{buildWorld:()=>({root:scenery,colliders:[],bobbers:[],pulses:[],update:noop,setHoverSpot:noop})}};
const {createSandbox}=compile('sandbox',mocks);const box=createSandbox({camera:new THREE.PerspectiveCamera(58,.6,.1,900),tuning:{walkSpeed:5.4,effects:false},emit:noop});
box.api.setMove(1,0);for(let i=0;i<360;i++)box.update(1/60);
for(const [x,z] of directions) {assert(Math.abs(x-1)<1e-7);assert(Math.abs(z)<1e-7,'held lateral stick never curves as camera follows');}
box.api.setMove(0,1);box.update(1/60);const reanchor=directions.at(-1);assert(reanchor[0]>.9,'moving stick up after lateral follow reanchors to screen forward');
box.api.setMove(0,0);box.api.rotateCamera(70,0);box.update(1/60);const before=position.clone();box.api.setMove(0,1);box.update(1/60);assert(position.distanceTo(before)>0,'movement resumes after manual stationary orbit');
box.api.setMove(NaN,Infinity);box.update(1/60);assert.deepEqual(directions.at(-1),[0,0],'nonfinite input clears to neutral');
box.api.setActivity('surf');box.api.setActivity('surf');box.api.setPresentation('world');box.api.setActivity('surf');assert.equal(starts,1,'same activity remains idempotent across parent rerender');box.update(1/60);assert.equal(stageUpdates,1);box.api.setActivity(null);assert.equal(stops,1);
const facingBeforePhoto=avatar.group.rotation.y;
const wall=new THREE.Mesh(new THREE.BoxGeometry(6,5,.2),new THREE.MeshBasicMaterial());
wall.position.set(position.x+Math.sin(facingBeforePhoto)*2,position.y+.5,position.z+Math.cos(facingBeforePhoto)*2);wall.rotation.y=facingBeforePhoto;scenery.add(wall);
const enclosingWall=new THREE.Mesh(new THREE.BoxGeometry(6,5,1),new THREE.MeshBasicMaterial());
enclosingWall.position.set(position.x+Math.sin(facingBeforePhoto)*4,position.y+.5,position.z+Math.cos(facingBeforePhoto)*4);enclosingWall.rotation.y=facingBeforePhoto;scenery.add(enclosingWall);
box.api.setPresentation('photo');box.api.setActivity(null);box.update(1/60);assert.equal(avatar.group.rotation.y,facingBeforePhoto,'opening photo preserves exploration facing');box.api.rotateCamera(500,100);box.update(1/60);assert.equal(avatar.group.rotation.y,facingBeforePhoto,'photo orbit changes camera without rotating doll');box.api.setPresentation('style');box.update(1/60);assert.equal(avatar.group.rotation.y,facingBeforePhoto,'switching presentation retains the captured facing');
assert.equal(wall.visible,false,'presentation removes actual rendered walls between the camera and doll');
assert.equal(enclosingWall.visible,false,'presentation removes an occluder containing the camera lens');
assert.equal(distantRaycasts,0,'cutaway broadphase never raycasts distant scenery');
const matrixUpdate=scenery.updateMatrixWorld;let wholeWorldMatrixUpdates=0;scenery.updateMatrixWorld=function(...args){wholeWorldMatrixUpdates++;return matrixUpdate.apply(this,args)};
box.update(1/60);box.update(1/60);assert.equal(wholeWorldMatrixUpdates,0,'static cutaway does not recompute the full world matrices each frame');
box.api.setPresentation('world');assert.equal(wall.visible,true,'closing presentation immediately restores world walls');assert.equal(enclosingWall.visible,true);
box.dispose();assert.equal(stageDisposals,1,'sandbox disposes owned activity stage');console.log('PASS camera follow, stationary orbit, invalid deltas, photo/reset framing, held-stick no drift (360 frames), invalid move, activity idempotence, parent effect order');
