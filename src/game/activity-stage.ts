import * as THREE from 'three';
import type { Avatar } from '@/game/avatar';
import type { GameEvent } from '@/game/types';
import type { ActivityKind, ActivityState } from '@/game/lifestyle-types';
import { SurfSession, PourSession, normalizedInput, SURF_DURATION } from './activity-model';

type Material = THREE.Material;
const material = (color: number, roughness = .45, metalness = 0) => new THREE.MeshStandardMaterial({color, roughness, metalness});
function mesh(parent:THREE.Object3D, geometry:THREE.BufferGeometry, mat:Material, x=0,y=0,z=0) {
 const object=new THREE.Mesh(geometry,mat);object.position.set(x,y,z);object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;
}
function sphere(parent:THREE.Object3D,mat:Material,x:number,y:number,z:number,sx:number,sy:number,sz:number){
 const object=mesh(parent,new THREE.SphereGeometry(1,18,10),mat,x,y,z);object.scale.set(sx,sy,sz);return object;
}
function tube(parent:THREE.Object3D,mat:Material,points:THREE.Vector3[],radius:number){return mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),32,radius,7,false),mat);}
const waveHeight = (x:number,z:number,t:number) => Math.sin(z*.54+t*2.3)*.18+Math.sin(x*.64+z*.18-t*1.5)*.12;

/** Mounted in the existing sandbox. No scene, renderer, canvas, world or physics ownership. */
export function createActivityStage(camera:THREE.PerspectiveCamera,avatar:Avatar,emit:(event:GameEvent)=>void){
 const root=new THREE.Group();root.name='Playable activity stages';root.visible=false;
 const surfRoot=new THREE.Group(),barRoot=new THREE.Group();root.add(surfRoot,barRoot);
 const pink=material(0xf44b94,.3,.15),ivory=material(0xfffaf1),gold=material(0xf8c56e,.25,.55),teal=material(0x078b99,.35),coral=material(0xff796e);
 const sea=new THREE.MeshStandardMaterial({color:0x2abcc7,roughness:.24,metalness:.16,side:THREE.DoubleSide});
 const oceanGeometry=new THREE.PlaneGeometry(94,150,72,104);oceanGeometry.rotateX(-Math.PI/2);
 const ocean=mesh(surfRoot,oceanGeometry,sea,0,-.08,-25);ocean.castShadow=false;
 const oceanPositions=oceanGeometry.getAttribute('position');const oceanBase=new Float32Array(oceanPositions.array);
 const deep=mesh(surfRoot,new THREE.PlaneGeometry(700,700),material(0x48cad1,.25),0,-.75,0);deep.rotation.x=-Math.PI/2;deep.castShadow=false;
 // A broad, moving breaker is geometry, not a background card.
 const breakerGeometry=new THREE.PlaneGeometry(36,8,64,22);breakerGeometry.rotateX(-Math.PI/2);
 const breaker=mesh(surfRoot,breakerGeometry,material(0x20b4c2,.3),0,0,-16);breaker.castShadow=false;
 const breakerPositions=breakerGeometry.getAttribute('position'),breakerBase=new Float32Array(breakerPositions.array);
 const foamMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.8,transparent:true,opacity:.87});
 const crestFoam=Array.from({length:65},(_,i)=>sphere(surfRoot,foamMat,(i-32)*.55,2.1,-16,.42,.1,.23));
 const wake=Array.from({length:28},(_,i)=>sphere(surfRoot,foamMat,0,0,0,.06,.025,.15));
 const board=new THREE.Group();board.name='Steerable striped surfboard';surfRoot.add(board);
 sphere(board,pink,0,0,0,.49,.085,1.28);
 sphere(board,ivory,0,.052,0,.41,.035,1.17);
 for(const side of [-1,1]) {const stripe=mesh(board,new THREE.BoxGeometry(.065,.015,1.78),side<0?gold:teal,side*.2,.086,.08);stripe.rotation.y=side*.035;}
 const fin=new THREE.Shape();fin.moveTo(0,0);fin.lineTo(.34,0);fin.lineTo(.06,-.31);fin.closePath();
 const finMesh=mesh(board,new THREE.ExtrudeGeometry(fin,{depth:.035,bevelEnabled:false}),teal,-.017,-.04,.6);finMesh.rotation.y=Math.PI/2;
 const courseRoot=new THREE.Group();surfRoot.add(courseRoot);
 const courseMeshes:Array<THREE.Group>=[];
 function buildCourse(model:SurfSession){
  // Reuse all geometry across starts; only deterministic course transforms reset.
  if(courseMeshes.length)return;
  model.items.forEach(item=>{
   const holder=new THREE.Group();holder.name=item.kind==='ring'?'Golden pearl ring':'Coral obstacle buoy';courseRoot.add(holder);courseMeshes.push(holder);
   if(item.kind==='ring'){
    mesh(holder,new THREE.TorusGeometry(.85,.075,8,32),gold,0,.95,0);
    sphere(holder,new THREE.MeshStandardMaterial({color:0xfff8e7,emissive:0xc59033,emissiveIntensity:.45,roughness:.2}),0,.95,0,.17,.17,.17);
    for(let j=0;j<3;j++) sphere(holder,ivory,Math.cos(j*2.1)*.85,.95+Math.sin(j*2.1)*.85,0,.095,.095,.095);
   }else{
    sphere(holder,coral,0,.32,0,.65,.43,.65);
    mesh(holder,new THREE.CylinderGeometry(.08,.12,.8,8),ivory,0,.72,0);
    const flag=mesh(holder,new THREE.ConeGeometry(.3,.5,3),pink,.12,1.05,0);flag.rotation.z=-Math.PI/2;
    const buoyRing=mesh(holder,new THREE.TorusGeometry(.59,.075,6,20),ivory,0,.24,0);buoyRing.rotation.x=Math.PI/2;
   }
  });
 }
 // Tropical horizon: islands sit behind the actual moving course.
 for(const side of [-1,1]){
  sphere(surfRoot,material(0xf6dfae),side*30,-.7,-45,16,2.2,9);
  for(let i=0;i<3;i++){
   const palm=new THREE.Group();palm.position.set(side*(24+i*5),0,-40-i*4);surfRoot.add(palm);
   const trunk=mesh(palm,new THREE.CylinderGeometry(.16,.24,4.8,8),material(0xc39b76),0,2.1,0);trunk.rotation.z=side*.13;
   for(let leaf=0;leaf<6;leaf++){
    const blade=sphere(palm,material(leaf%2?0x65bfa3:0x369e88),Math.cos(leaf*Math.PI/3)*1.05,4.35,Math.sin(leaf*Math.PI/3)*1.05,.4,.16,1.5);
    blade.rotation.y=-leaf*Math.PI/3+Math.PI/2;blade.rotation.z=.2;
   }
  }
 }
 // Sculptural open-air juice bar. The real glass is large enough to read on a phone.
 const floor=mesh(barRoot,new THREE.CylinderGeometry(7,7,.18,64),material(0xf6d6c3),0,-.18,0);
 floor.receiveShadow=true;
 const back=mesh(barRoot,new THREE.BoxGeometry(10,6,.2),material(0xc4e4db),0,2.7,-3.6);
 back.receiveShadow=true;
 mesh(barRoot,new THREE.BoxGeometry(7.2,.22,1.8),ivory,0,1.1,0);
 mesh(barRoot,new THREE.BoxGeometry(6.9,.95,1.55),material(0xf29d94),0,.55,0);
 for(let i=0;i<17;i++)mesh(barRoot,new THREE.BoxGeometry(.045,.87,.035),material(0xe07b79),-3.2+i*.4,.55,.8);
 for(const y of [2.4,3.7]){
  mesh(barRoot,new THREE.BoxGeometry(5.2,.11,.5),gold,-.5,y,-3.2);
  for(let i=0;i<6;i++){
   const color=[0xf2c468,0xf08286,0x80cfc2][i%3];const x=-2.6+i*.85;
   mesh(barRoot,new THREE.CylinderGeometry(.13,.13,.6,12),material(color,.3),x,y+.35,-3.2);
   mesh(barRoot,new THREE.CylinderGeometry(.065,.065,.2,10),gold,x,y+.75,-3.2);
  }
 }
 const arch=mesh(barRoot,new THREE.TorusGeometry(1.4,.045,8,64,Math.PI),gold,2.1,3.5,-3.4);
 arch.rotation.z=.12;
 for(const side of [-1,1]){
  mesh(barRoot,new THREE.CylinderGeometry(.22,.17,.5,14),ivory,side*3.8,.15,-1.6);
  for(let leaf=0;leaf<7;leaf++){
   const blade=sphere(barRoot,teal,side*3.8+Math.sin(leaf*2)*.3,.8+leaf*.13,-1.6+Math.cos(leaf*2)*.18,.14,.65,.1);blade.rotation.z=Math.sin(leaf*2)*.6;
  }
 }
 // Glass has separate transparent walls, a readable rim, base, fill volume and meniscus.
 const glassRoot=new THREE.Group();glassRoot.position.set(.5,1.23,.22);barRoot.add(glassRoot);
 const glassMat=new THREE.MeshPhysicalMaterial({color:0xe3ffff,transparent:true,opacity:.2,roughness:.09,metalness:.05,side:THREE.DoubleSide,depthWrite:false});
 const wall=mesh(glassRoot,new THREE.CylinderGeometry(.52,.38,1.6,40,1,true),glassMat,0,.8,0);wall.renderOrder=5;
 const rimMat=new THREE.MeshStandardMaterial({color:0xeaffff,transparent:true,opacity:.75,roughness:.16,metalness:.2});
 for(const [y,radius] of [[0,.38],[1.6,.52]]){const rim=mesh(glassRoot,new THREE.TorusGeometry(radius,.027,8,40),rimMat,0,y,0);rim.rotation.x=Math.PI/2;rim.renderOrder=6;}
 mesh(glassRoot,new THREE.CylinderGeometry(.38,.38,.055,32),glassMat,0,.015,0);
 const drinkMat=new THREE.MeshStandardMaterial({color:0xf8a55e,transparent:true,opacity:.86,roughness:.2,metalness:.08});
 const liquid=mesh(glassRoot,new THREE.CylinderGeometry(1,1,1,40),drinkMat);liquid.renderOrder=2;
 const liquidPositions=liquid.geometry.getAttribute('position'),liquidBase=new Float32Array(liquidPositions.array);
 const surface=mesh(glassRoot,new THREE.CircleGeometry(1,40),material(0xffcf8e,.3));surface.rotation.x=-Math.PI/2;surface.renderOrder=3;
 const bandMat=new THREE.MeshStandardMaterial({color:0xf8cb69,emissive:0xd88c25,emissiveIntensity:.35,transparent:true,opacity:.36,side:THREE.DoubleSide,depthWrite:false});
 const targetBand=mesh(glassRoot,new THREE.CylinderGeometry(.515,.505,.13,40,1,true),bandMat);targetBand.renderOrder=7;
 const targetLine=mesh(glassRoot,new THREE.TorusGeometry(.5,.018,7,40),gold);targetLine.rotation.x=Math.PI/2;targetLine.renderOrder=8;
 // Dispenser + visible liquid stream directly above the glass.
 mesh(barRoot,new THREE.CylinderGeometry(.14,.2,2,16),teal,2.15,2.23,-.55);
 tube(barRoot,gold,[new THREE.Vector3(2.15,3.2,-.55),new THREE.Vector3(2.12,3.62,-.55),new THREE.Vector3(.5,3.62,.22),new THREE.Vector3(.5,3.27,.22)],.095);
 mesh(barRoot,new THREE.CylinderGeometry(.14,.14,.23,14),teal,.5,3.26,.22);
 const stream=mesh(barRoot,new THREE.CylinderGeometry(.035,.045,1,12),drinkMat,.5,2.7,.22);stream.castShadow=false;
 const drops=Array.from({length:8},()=>sphere(glassRoot,drinkMat,0,1,0,.03,.05,.03));
 const citrus=mesh(barRoot,new THREE.CylinderGeometry(.33,.33,.08,24),material(0xffb753),1.6,1.28,.55);citrus.rotation.x=Math.PI/2;
 const citrusCenter=mesh(barRoot,new THREE.CylinderGeometry(.27,.27,.085,24),material(0xffe3a1),1.6,1.28,.55);citrusCenter.rotation.x=Math.PI/2;

 let kind:ActivityKind|null=null,surf=new SurfSession(),pour=new PourSession(),input=0,clock=0,eventTimer=0;
 let saved:{avatarPosition:THREE.Vector3;avatarQuaternion:THREE.Quaternion;cameraPosition:THREE.Vector3;cameraQuaternion:THREE.Quaternion;cameraFov:number}|null=null;
 function state():ActivityState{
  if(kind==='surf')return {kind,progress:surf.elapsed/SURF_DURATION,score:surf.score,combo:surf.combo,timeLeft:Math.max(0,SURF_DURATION-surf.elapsed),feedback:surf.feedback,finished:surf.finished};
  return {kind:'pour',progress:pour.finished?1:(pour.round-1)/3,score:pour.score,combo:pour.combo,timeLeft:pour.timeLeft,feedback:pour.feedback,finished:pour.finished,round:pour.round,fill:pour.fill,target:pour.target};
 }
 function sendState(){emit({type:'activity',state:state()} as unknown as GameEvent);}
 function pose(value:'idle'|'surf'){
  // Optional at runtime for old preview harnesses; v2 Avatar provides setPose.
  (avatar as Avatar & {setPose?:(id:'idle'|'surf')=>void}).setPose?.(value);
 }
 function renderSurf(dt:number){
  const t=clock,positions=oceanPositions;
  for(let i=0;i<positions.count;i++){const x=oceanBase[i*3],z=oceanBase[i*3+2];positions.setY(i,waveHeight(x,z-25,t));}
  positions.needsUpdate=true;
  if(Math.floor(clock*12)!==Math.floor((clock-dt)*12))oceanGeometry.computeVertexNormals();
  for(let i=0;i<breakerPositions.count;i++){
   const x=breakerBase[i*3],z=breakerBase[i*3+2];
   breakerPositions.setY(i,Math.exp(-Math.pow(z*.5,2))*(1.8+Math.sin(x*.35+t)*.3)+waveHeight(x,z-16,t));
  }
  breakerPositions.needsUpdate=true;
  if(Math.floor(clock*10)!==Math.floor((clock-dt)*10))breakerGeometry.computeVertexNormals();
  crestFoam.forEach((foam,i)=>{const x=(i-32)*.55;foam.position.set(x,1.92+Math.sin(x*.35+t)*.3,-16);foam.scale.y=.08+Math.sin(i+t*4)*.025;});
  const y=waveHeight(surf.x,0,t)+.16;
  board.position.set(surf.x,y,0);board.rotation.set(Math.sin(t*2.3)*.035,-surf.heading,-surf.heading*.5);
  const tumble=surf.wipeout>0?Math.sin(surf.wipeout/1.25*Math.PI):0;
  avatar.group.position.set(surf.x,y+.13-tumble*.4,0);avatar.group.rotation.set(tumble*.7,Math.PI-surf.heading,-surf.heading*.22+tumble*.8);
  pose('surf');avatar.update(dt,{moving:false,speed:0,grounded:true,dancing:false,sitting:false});
  wake.forEach((foam,i)=>{const z=.9+(i%14)*.25,x=surf.x+(i<14?-1:1)*(.24+z*.18);foam.position.set(x,waveHeight(x,z,t)+.02,z);const pulse=.7+(Math.sin(t*8+i)+1)*.2;foam.scale.set(.06*pulse,.025*pulse,.15*pulse);});
  surf.items.forEach((item,i)=>{const holder=courseMeshes[i];holder.visible=!item.passed;holder.position.set(item.x,waveHeight(item.x,surf.distance-item.distance,t),surf.distance-item.distance);if(item.kind==='ring')holder.rotation.z=Math.sin(t+i)*.055;});
  // Camera follows a fraction of lateral motion, keeping the next rings visible.
  camera.position.set(surf.x*.8+1.6,3.9,8);camera.lookAt(surf.x*.8+.3,.8,-3);
 }
 function renderPour(dt:number){
  const fill=Math.max(.002,Math.min(1.03,pour.fill)),height=fill*1.49,radius=.365+fill*.126;
  for(let i=0;i<liquidPositions.count;i++){const localY=liquidBase[i*3+1],r=.365+(localY+.5)*fill*.126;liquidPositions.setXYZ(i,liquidBase[i*3]*r,localY,liquidBase[i*3+2]*r);}
  liquidPositions.needsUpdate=true;liquid.scale.set(1,height,1);liquid.position.y=.055+height/2;
  surface.scale.set(radius,radius,1);surface.position.y=.055+height;
  surface.rotation.x=-Math.PI/2+(pour.pouring?Math.sin(clock*15)*.018:0);
  const targetY=.055+pour.target*1.49,targetRadius=.365+pour.target*.126;
  targetBand.position.y=targetY;targetBand.scale.setScalar(targetRadius/.51);targetLine.position.y=targetY;targetLine.scale.setScalar(targetRadius/.5);
  const streamBottom=1.23+.055+height,streamTop=3.14;
  stream.visible=pour.pouring&&!pour.finished;stream.scale.y=Math.max(.04,streamTop-streamBottom);stream.position.y=(streamTop+streamBottom)/2;
  drops.forEach((drop,i)=>{drop.visible=pour.pouring;const a=i*2.4+clock*4;drop.position.set(Math.sin(a)*.16,.055+height+Math.abs(Math.sin(clock*8+i))*.13,Math.cos(a)*.16);});
  const colors=[0xf8a55e,0xec769f,0x76c8a2];drinkMat.color.setHex(colors[pour.round-1]);
  avatar.group.position.set(-.45,0,1.6);avatar.group.rotation.set(0,.38,0);pose('idle');avatar.update(dt,{moving:false,speed:0,grounded:true,dancing:false,sitting:false});
  camera.position.set(2.8,4,9.5);camera.lookAt(0,1.9,.2);
 }
 function stop(){
  kind=null;root.visible=false;input=0;pour.setPouring(false);pose('idle');
  if(saved){avatar.group.position.copy(saved.avatarPosition);avatar.group.quaternion.copy(saved.avatarQuaternion);camera.position.copy(saved.cameraPosition);camera.quaternion.copy(saved.cameraQuaternion);camera.fov=saved.cameraFov;camera.updateProjectionMatrix();saved=null;}
 }
 return {
  root,
  start(next:ActivityKind){
   if(kind)stop();
   saved={avatarPosition:avatar.group.position.clone(),avatarQuaternion:avatar.group.quaternion.clone(),cameraPosition:camera.position.clone(),cameraQuaternion:camera.quaternion.clone(),cameraFov:camera.fov};
   kind=next;clock=0;eventTimer=0;input=0;surf=new SurfSession();pour=new PourSession();buildCourse(surf);
   root.visible=true;surfRoot.visible=next==='surf';barRoot.visible=next==='pour';
   camera.fov=next==='surf'?57:43;camera.updateProjectionMatrix();
   if(next==='surf')renderSurf(0);else renderPour(0);sendState();
  },
  stop,
  setInput(value:number){input=normalizedInput(value);},
  setPouring(on:boolean){if(kind==='pour')pour.setPouring(on);},
  update(dt:number){
   if(!kind)return;dt=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));clock+=dt;
   if(kind==='surf'){surf.update(dt,input);renderSurf(dt);}else {pour.update(dt);renderPour(dt);}
   eventTimer+=dt;if(eventTimer>=.1-1e-8){eventTimer=Math.max(0,eventTimer-.1);sendState();}
  },
  active(){return kind!==null;},
 };
}
