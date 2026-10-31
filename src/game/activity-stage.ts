import * as THREE from 'three';
import type { Avatar } from '@/game/avatar';
import type { GameEvent } from '@/game/types';
import type { ActivityKind, ActivityState } from '@/game/lifestyle-types';
import { SurfSession, PourSession, NetballSession, VolleySession, VOLLEY_DURATION, VOLLEY_NET_HEIGHT, NETBALL_HOOP, NETBALL_CHARGE_TARGET, NETBALL_BALL_RADIUS, NETBALL_RING_RADIUS, netballTrajectory, normalizedInput, SURF_DURATION } from './activity-model';

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
 const surfRoot=new THREE.Group(),barRoot=new THREE.Group(),courtRoot=new THREE.Group();root.add(surfRoot,barRoot,courtRoot);
 // Activity cameras keep the resort's golden-hour horizon instead of a flat void.
 const skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,vertexShader:'varying vec3 d;void main(){d=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`varying vec3 d;void main(){vec3 n=normalize(d);float h=n.y;vec3 c=mix(vec3(.94,.54,.36),vec3(.52,.30,.58),smoothstep(-.03,.5,h));c=mix(c,vec3(.13,.16,.32),smoothstep(.4,1.0,h));float glow=pow(max(0.0,dot(n,normalize(vec3(-.65,.08,-1.0)))),22.0);c+=vec3(.3,.12,.015)*glow;gl_FragColor=vec4(c,1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
 const stageSky=new THREE.Mesh(new THREE.SphereGeometry(390,20,12),skyMaterial);stageSky.name='Golden hour activity horizon';stageSky.renderOrder=-1000;root.add(stageSky);

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

 // Regulation-height netball ring: an open post and hanging net, with no backboard.
 courtRoot.name='Five shot netball half court';
 mesh(courtRoot,new THREE.BoxGeometry(14,.12,17),material(0xd9a78b),0,-.09,0);
 mesh(courtRoot,new THREE.BoxGeometry(12,.035,14),material(0x64b6ac),0,-.012,-.5);
 for(const x of [-6,6])mesh(courtRoot,new THREE.BoxGeometry(.055,.012,14),ivory,x,.015,-.5);
 for(const z of [-7.5,6.5])mesh(courtRoot,new THREE.BoxGeometry(12,.012,.055),ivory,0,.015,z);
 mesh(courtRoot,new THREE.BoxGeometry(12,.012,.055),ivory,0,.015,4.1);
 const shootingArc=[];
 for(let i=0;i<=64;i++){const a=i/64*Math.PI;shootingArc.push(new THREE.Vector3(Math.cos(a)*4.9,.02,-7.5+Math.sin(a)*4.9));}
 tube(courtRoot,ivory,shootingArc,.025);
 mesh(courtRoot,new THREE.CylinderGeometry(.065,.085,3.05,14),ivory,0,1.525,-5.02);
 tube(courtRoot,ivory,[new THREE.Vector3(0,3.05,-5.02),new THREE.Vector3(0,3.05,-4.5)],.045);
 const hoop=mesh(courtRoot,new THREE.TorusGeometry(NETBALL_RING_RADIUS,.035,10,40),coral,NETBALL_HOOP.x,NETBALL_HOOP.y,NETBALL_HOOP.z);hoop.name='Open netball ring';hoop.rotation.x=Math.PI/2;
 const netRoot=new THREE.Group();netRoot.position.set(0,3.05,-4.5);courtRoot.add(netRoot);
 const netMat=material(0xfffaf1,.8);
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6,b=a+Math.PI/6;
  tube(netRoot,netMat,[new THREE.Vector3(Math.cos(a)*.33,0,Math.sin(a)*.33),new THREE.Vector3(Math.cos(b)*.25,-.29,Math.sin(b)*.25),new THREE.Vector3(Math.cos(a)*.20,-.58,Math.sin(a)*.20)],.009);
 }
 for(const [y,r] of [[-.28,.25],[-.57,.20]]){const ring=mesh(netRoot,new THREE.TorusGeometry(r,.008,5,24),netMat,0,y,0);ring.rotation.x=Math.PI/2;}
 const ballRoot=new THREE.Group();ballRoot.name='Playable netball';courtRoot.add(ballRoot);
 sphere(ballRoot,ivory,0,0,0,NETBALL_BALL_RADIUS,NETBALL_BALL_RADIUS,NETBALL_BALL_RADIUS);
 for(let i=0;i<3;i++){const seam=mesh(ballRoot,new THREE.TorusGeometry(NETBALL_BALL_RADIUS+.001,.004,5,32),pink);seam.rotation.set(i*Math.PI/3,i*Math.PI/2,0);}
 const aimPoints=Array.from({length:30},()=>new THREE.Vector3());
 const aimGeometry=new THREE.BufferGeometry().setFromPoints(aimPoints);
 const aimLine=new THREE.Line(aimGeometry,new THREE.LineDashedMaterial({color:0xffe6a5,dashSize:.17,gapSize:.09,transparent:true,opacity:.9}));aimLine.name='Live shot aim arc';courtRoot.add(aimLine);
 const aimMarker=mesh(courtRoot,new THREE.TorusGeometry(.35,.024,8,32),gold,0,.025,-4.5);aimMarker.rotation.x=Math.PI/2;
 for(const x of [-7.3,7.3]){
  mesh(courtRoot,new THREE.BoxGeometry(.3,.4,14),ivory,x,.16,-.5);
  for(let i=0;i<5;i++)sphere(courtRoot,material(i%2?0xe991ad:0x7ccaa9),x,.55,-6+i*2.7,.48,.55,.48);
 }
 // The volleyball court shares the sandbox scene and its sunlight, avatar and renderer.
 const volleyRoot=new THREE.Group();volleyRoot.name='Playable 3D volleyball court';root.add(volleyRoot);
 const beachSand=material(0xf6dfb3,.9),lagoon=material(0x3abac2,.28,.12);
 const volleyballSea=mesh(volleyRoot,new THREE.PlaneGeometry(120,130),lagoon,0,-.23,-53);volleyballSea.rotation.x=-Math.PI/2;volleyballSea.castShadow=false;
 mesh(volleyRoot,new THREE.BoxGeometry(42,.14,18),beachSand,0,-.1,3);
 const shoreFoam=new THREE.MeshStandardMaterial({color:0xfff8e5,roughness:.8,transparent:true,opacity:.7});
 for(let row=0;row<4;row++){
  const points=Array.from({length:25},(_,i)=>new THREE.Vector3(-24+i*2,-.11-row*.025,-6.15-row*4+Math.sin(i*.7+row)*.25));
  tube(volleyRoot,shoreFoam,points,row===0?.09:.035);
 }
 // Framing stays outside the play lines: a little resort beach around a real court.
 const palmTrunk=material(0xb8946c,.9),palmLeaf=material(0x438f79,.8),leafLight=material(0x71b798,.8);
 for(const [x,z] of [[-6.5,-5.4],[6.8,-5.8]]){
  const palm=new THREE.Group();palm.position.set(x,0,z);volleyRoot.add(palm);
  const trunk=mesh(palm,new THREE.CylinderGeometry(.1,.17,3,8),palmTrunk,0,1.45,0);trunk.rotation.z=x>0?-.12:.12;
  for(let i=0;i<6;i++){const angle=i*Math.PI/3;const leaf=sphere(palm,i%2?palmLeaf:leafLight,Math.cos(angle)*.68,2.91,Math.sin(angle)*.68,.25,.11,1.13);leaf.rotation.set(Math.sin(angle)*.2,-angle+Math.PI/2,.15);}
 }
 for(const [x,z] of [[-4.9,-4.4],[5.1,-4.2]]){
  mesh(volleyRoot,new THREE.CylinderGeometry(.032,.04,2.2,8),ivory,x,1.08,z);
  const canopy=new THREE.Group();canopy.position.set(x,2.15,z);volleyRoot.add(canopy);
  for(let i=0;i<8;i++){mesh(canopy,new THREE.ConeGeometry(1.05,.48,3,1,true,Math.PI/4*i,Math.PI/4),i%2?ivory:coral);}
  sphere(volleyRoot,gold,x,2.4,z,.065,.065,.065);
  const chair=mesh(volleyRoot,new THREE.BoxGeometry(.65,.12,1.25),teal,x,.25,z+.55);chair.rotation.x=-.14;
  mesh(volleyRoot,new THREE.BoxGeometry(.65,.65,.1),ivory,x,.58,z+.04).rotation.x=-.3;
 }
 for(const x of [-4.55,4.55])mesh(volleyRoot,new THREE.CylinderGeometry(.035,.045,2.75,8),ivory,x,1.35,-5.3);
 const buntingPoints=Array.from({length:17},(_,i)=>{const x=-4.55+i*9.1/16;return new THREE.Vector3(x,2.7-.38*(1-(x/4.55)**2),-5.3);});
 tube(volleyRoot,gold,buntingPoints,.012);
 for(let i=0;i<11;i++){
  const x=-4.2+i*.84,y=2.7-.38*(1-(x/4.55)**2);
  const flag=new THREE.Shape();flag.moveTo(-.14,0);flag.lineTo(.14,0);flag.lineTo(0,-.28);flag.closePath();
  mesh(volleyRoot,new THREE.ShapeGeometry(flag),new THREE.MeshStandardMaterial({color:[0xf387a7,0xfff8e5,0x3e9b99][i%3],side:THREE.DoubleSide}),x,y-.03,-5.3);
 }
 for(const [x,z] of [[-17,-29],[20,-34]]){sphere(volleyRoot,beachSand,x,-.3,z,9,.6,3.4);sphere(volleyRoot,palmLeaf,x,.25,z,6.5,.7,2.6);}
 mesh(volleyRoot,new THREE.BoxGeometry(7,.018,9),material(0xeed099,.92),0,-.015,0);
 for(const x of [-3.5,3.5])mesh(volleyRoot,new THREE.BoxGeometry(.055,.016,9),ivory,x,.009,0);
 for(const z of [-4.5,4.5])mesh(volleyRoot,new THREE.BoxGeometry(7,.016,.055),ivory,0,.009,z);
 for(const x of [-3.7,3.7]){
  mesh(volleyRoot,new THREE.CylinderGeometry(.065,.085,2.05,12),coral,x,1,0);
  sphere(volleyRoot,gold,x,2.06,0,.11,.11,.11);
  tube(volleyRoot,ivory,[new THREE.Vector3(x,1.8,0),new THREE.Vector3(x*1.25,.02,.7)],.013);
 }
 const volleyNet=new THREE.Group();volleyNet.name='Volleyball net';volleyRoot.add(volleyNet);
 for(const y of [.75,VOLLEY_NET_HEIGHT])mesh(volleyNet,new THREE.BoxGeometry(7.4,.055,.045),ivory,0,y,0);
 for(let x=-3.6;x<=3.6;x+=.3)mesh(volleyNet,new THREE.BoxGeometry(.012,VOLLEY_NET_HEIGHT-.75,.012),ivory,x,(VOLLEY_NET_HEIGHT+.75)/2,0);
 for(let y=.9;y<VOLLEY_NET_HEIGHT;y+=.15)mesh(volleyNet,new THREE.BoxGeometry(7.3,.012,.012),ivory,0,y,0);
 const volleyball=new THREE.Group();volleyball.name='Playable volleyball';volleyRoot.add(volleyball);
 sphere(volleyball,ivory,0,0,0,.16,.16,.16);
 for(let i=0;i<3;i++){const stripe=mesh(volleyball,new THREE.TorusGeometry(.159,.019,6,28),i%2?gold:teal);stripe.rotation.set(i*Math.PI/3,i*Math.PI/2,0);}
 const volleyShadow=mesh(volleyRoot,new THREE.CircleGeometry(.2,24),new THREE.MeshBasicMaterial({color:0x765440,transparent:true,opacity:.2,depthWrite:false}),0,.022,0);volleyShadow.rotation.x=-Math.PI/2;
 const receiveMarker=mesh(volleyRoot,new THREE.TorusGeometry(.55,.035,6,32),gold,0,.03,3.05);receiveMarker.name='Volleyball receive marker';receiveMarker.rotation.x=-Math.PI/2;
 // Coco is a little articulated doll, rather than a flat billboard opponent.
 const coco=new THREE.Group();coco.name='Coco volleyball opponent';volleyRoot.add(coco);
 const skin=material(0xb87959,.65),hair=material(0x493031,.6),jersey=material(0xf387a7,.6),shorts=material(0x377f88,.7);
 sphere(coco,jersey,0,1.02,0,.28,.4,.18);
 mesh(coco,new THREE.CylinderGeometry(.2,.26,.3,12),shorts,0,.64,0);
 const cocoLegs=[-1,1].map(side=>{const leg=new THREE.Group();leg.position.set(side*.13,.56,0);coco.add(leg);mesh(leg,new THREE.CapsuleGeometry(.075,.37,4,8),skin,0,-.22,0);sphere(leg,ivory,0,-.48,.07,.1,.075,.17);return leg;});
 const cocoArms=[-1,1].map(side=>{const arm=new THREE.Group();arm.position.set(side*.26,1.2,0);coco.add(arm);mesh(arm,new THREE.CapsuleGeometry(.065,.36,4,8),skin,0,-.21,0);sphere(arm,skin,0,-.45,0,.075,.09,.065);return arm;});
 sphere(coco,skin,0,1.61,0,.24,.29,.23);sphere(coco,hair,0,1.77,-.035,.255,.19,.24);sphere(coco,hair,.22,1.83,-.15,.13,.17,.13);
 for(const x of [-.09,.09]){sphere(coco,hair,x,1.64,.21,.025,.034,.018);sphere(coco,coral,x*1.4,1.54,.205,.045,.026,.013);}
 tube(coco,coral,[new THREE.Vector3(-.04,1.51,.218),new THREE.Vector3(0,1.495,.225),new THREE.Vector3(.04,1.51,.218)],.009);
 const headband=mesh(coco,new THREE.TorusGeometry(.235,.022,6,28),gold,0,1.75,0);headband.rotation.x=Math.PI/2;

 let kind:ActivityKind|null=null,surf=new SurfSession(),pour=new PourSession(),netball=new NetballSession(),volley=new VolleySession(),input=0,clock=0,eventTimer=0;
 let saved:{avatarPosition:THREE.Vector3;avatarQuaternion:THREE.Quaternion;cameraPosition:THREE.Vector3;cameraQuaternion:THREE.Quaternion;cameraFov:number}|null=null;
 function state():ActivityState{
  if(kind==='surf')return {kind,progress:surf.elapsed/SURF_DURATION,score:surf.score,combo:surf.combo,timeLeft:Math.max(0,SURF_DURATION-surf.elapsed),feedback:surf.feedback,finished:surf.finished};
  if(kind==='volley')return {kind,progress:volley.finished?1:volley.elapsed/VOLLEY_DURATION,score:volley.score,combo:volley.combo,timeLeft:volley.timeLeft,feedback:volley.feedback,finished:volley.finished,playerPoints:volley.playerPoints,opponentScore:volley.opponentScore,fill:volley.charge};
  if(kind==='netball')return {kind,progress:netball.finished?1:(netball.round-1)/5,score:netball.score,combo:netball.combo,timeLeft:netball.timeLeft,feedback:netball.feedback,finished:netball.finished,round:netball.round,fill:netball.charge,target:NETBALL_CHARGE_TARGET};
  return {kind:'pour',progress:pour.finished?1:(pour.round-1)/3,score:pour.score,combo:pour.combo,timeLeft:pour.timeLeft,feedback:pour.feedback,finished:pour.finished,round:pour.round,fill:pour.fill,target:pour.target};
 }
 function sendState(){emit({type:'activity',state:state()} as unknown as GameEvent);}
 function pose(value:'idle'|'surf'|'jump'){
  // Optional at runtime for old preview harnesses; v2 Avatar provides setPose.
  (avatar as Avatar & {setPose?:(id:'idle'|'surf'|'jump')=>void}).setPose?.(value);
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
 function renderNetball(dt:number){
  const pos=netball.ballPosition;ballRoot.position.set(pos.x,pos.y,pos.z);ballRoot.rotation.x+=netball.phase==='flight'?dt*5:0;
  avatar.group.position.set(netball.playerX,0,3.5);avatar.group.rotation.set(0,Math.atan2(-netball.playerX,-7.7),0);pose('idle');avatar.update(dt,{moving:false,speed:0,grounded:true,dancing:false,sitting:false});
  aimLine.visible=netball.phase==='aim'&&!netball.finished;aimMarker.visible=aimLine.visible;
  const shotEndX=netball.aim*3,charge=netball.charging?netball.charge:NETBALL_CHARGE_TARGET;
  const positions=aimGeometry.getAttribute('position');
  for(let i=0;i<30;i++){const point=netballTrajectory(netball.playerX,netball.aim,charge,i/29*1.1);positions.setXYZ(i,point.x,point.y,point.z);}
  positions.needsUpdate=true;aimLine.computeLineDistances();aimMarker.position.x=shotEndX;
  netRoot.scale.y=netball.lastScored&&netball.phase==='flight'?1+Math.sin(netball.shotTime*28)*.12:1;
  hoop.material=netball.lastScored?gold:coral;
  camera.position.set(netball.playerX*.12,5,14);camera.lookAt(0,-1.3,-1);
 }
 function renderVolley(dt:number){
  const ball=volley.ballPosition;volleyball.position.set(ball.x,ball.y,ball.z);volleyball.rotation.x+=dt*ball.vz*2;volleyball.rotation.z-=dt*ball.vx*2;
  volleyShadow.position.set(ball.x,.022,ball.z);volleyShadow.scale.setScalar(1+ball.y*.12);
  const landingTime=(ball.vy+Math.sqrt(ball.vy*ball.vy+2*7.2*Math.max(0,ball.y-.16)))/7.2;
  receiveMarker.visible=volley.phase==='rally'&&ball.vz>0&&!volley.finished;
  receiveMarker.position.x=Math.max(-3.5,Math.min(3.5,ball.x+ball.vx*landingTime));
  receiveMarker.position.z=Math.max(2.4,Math.min(4.4,ball.z+ball.vz*landingTime));
  receiveMarker.material=volley.swing>0?coral:gold;
  const jump=volley.jump>0?Math.sin(volley.jump/.62*Math.PI)*.55:0;
  avatar.group.position.set(volley.playerX,jump,3.05);avatar.group.rotation.set(0,Math.PI,0);pose(volley.jump>0?'jump':volley.charging?'surf':'idle');
  avatar.update(dt,{moving:Math.abs(input)>.05,speed:Math.abs(input)*3,grounded:jump<.03,dancing:false,sitting:false});
  coco.position.set(volley.npcX,0,-3.05);coco.rotation.y=0;
  const reach=volley.phase==='rally'&&ball.vz<0&&ball.z< -1.6;
  cocoArms.forEach((arm,i)=>{arm.rotation.x=reach?-2.2:-.2;arm.rotation.z=(i===0?1:-1)*(reach?.15:.3);});
  cocoLegs.forEach((leg,i)=>{leg.rotation.x=Math.sin(clock*10+i*Math.PI)*Math.min(.25,Math.abs(ball.x-volley.npcX)*.15);});
  camera.position.set(0,7.2,13);camera.lookAt(0,-2.5,-.4);
 }
 function stop(){
  kind=null;root.visible=false;input=0;pour.setPouring(false);netball.cancelCharge();volley.cancelCharge();pose('idle');
  if(saved){avatar.group.position.copy(saved.avatarPosition);avatar.group.quaternion.copy(saved.avatarQuaternion);camera.position.copy(saved.cameraPosition);camera.quaternion.copy(saved.cameraQuaternion);camera.fov=saved.cameraFov;camera.updateProjectionMatrix();saved=null;}
 }
 return {
  root,
  start(next:ActivityKind){
   if(kind)stop();
   saved={avatarPosition:avatar.group.position.clone(),avatarQuaternion:avatar.group.quaternion.clone(),cameraPosition:camera.position.clone(),cameraQuaternion:camera.quaternion.clone(),cameraFov:camera.fov};
   kind=next;clock=0;eventTimer=0;input=0;surf=new SurfSession();pour=new PourSession();netball=new NetballSession();volley=new VolleySession();buildCourse(surf);
   root.visible=true;surfRoot.visible=next==='surf';barRoot.visible=next==='pour';courtRoot.visible=next==='netball';volleyRoot.visible=next==='volley';
   camera.fov=next==='surf'?57:next==='netball'?49:next==='volley'?51:43;camera.updateProjectionMatrix();
   if(next==='surf')renderSurf(0);else if(next==='netball')renderNetball(0);else if(next==='volley')renderVolley(0);else renderPour(0);sendState();
  },
  stop,
  setInput(value:number){input=normalizedInput(value);},
  setPouring(on:boolean){if(kind==='pour')pour.setPouring(on);else if(kind==='netball')netball.setCharging(on);else if(kind==='volley')volley.setCharging(on);},
  update(dt:number){
   if(!kind)return;dt=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));clock+=dt;
   if(kind==='surf'){surf.update(dt,input);renderSurf(dt);}else if(kind==='netball'){netball.update(dt,input);renderNetball(dt);}else if(kind==='volley'){volley.update(dt,input);renderVolley(dt);}else {pour.update(dt);renderPour(dt);}
   eventTimer+=dt;if(eventTimer>=.1-1e-8){eventTimer=Math.max(0,eventTimer-.1);sendState();}
  },
  active(){return kind!==null;},
  dispose(){
   stop();const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
   root.traverse(object=>{const item=object as THREE.Mesh;if(item.geometry)geometries.add(item.geometry);if(item.material){for(const mat of Array.isArray(item.material)?item.material:[item.material])materials.add(mat);}});
   geometries.forEach(geometry=>geometry.dispose());materials.forEach(mat=>mat.dispose());root.removeFromParent();
  },
 };
}
