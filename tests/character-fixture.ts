import * as THREE from 'three';
import { createAvatar, type AvatarMotion } from '../src/game/avatar';
import { buildVehicles } from '../src/game/vehicles';
import { DEFAULT_LOOK } from '../src/game/fashion';
import { RIDING } from '../src/game/character/riding';
import type { HairId, VehicleId } from '../src/game/types';
import type { Look, PoseId } from '../src/game/lifestyle-types';

type View = 'face'|'hair'|'full'|'vehicle';
const scene = new THREE.Scene();scene.background = new THREE.Color('#d9e7ed');
scene.add(new THREE.HemisphereLight(0xf2f7ff, 0x9b8792, 1.5));
const key = new THREE.DirectionalLight(0xfff3e4, 2.15);key.position.set(-3, 6, 5);scene.add(key);
const fill = new THREE.DirectionalLight(0xdcecff, .65);fill.position.set(4,3,-3);scene.add(fill);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0xc7d6d4,roughness:.95}));floor.rotation.x=-Math.PI/2;floor.position.y=.045;scene.add(floor);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(700,800);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;document.body.prepend(renderer.domElement);
const camera=new THREE.PerspectiveCamera(35,700/800,.01,100);
const avatar=createAvatar();scene.add(avatar.group);
const vehicles=buildVehicles();for(const rig of Object.values(vehicles)){rig.group.position.set(0,0,0);rig.group.rotation.set(0,0,0);rig.group.visible=false;scene.add(rig.group);}
let look:Look={...DEFAULT_LOOK,accessories:[]},hair:HairId='blonde',pose:PoseId='idle',vehicle:VehicleId|null=null,view:View='full',yaw=.14,elevation=.1,label='Character visual QA';
let motion:AvatarMotion={moving:false,speed:0,grounded:true,dancing:false,sitting:false,vehicle:null};
function setCamera(){const target = view==='face'?new THREE.Vector3(0,1.665,0):view==='hair'?new THREE.Vector3(0,1.57,0):view==='vehicle'?new THREE.Vector3(0,1.05,0):new THREE.Vector3(0,1.02,0);const distance=view==='face'?.95:view==='hair'?1.55:view==='vehicle'?(vehicle==='scooter'?4.7:7):3.65;camera.position.copy(target).add(new THREE.Vector3(Math.sin(yaw)*Math.cos(elevation),Math.sin(elevation),Math.cos(yaw)*Math.cos(elevation)).multiplyScalar(distance));camera.lookAt(target);}
function render(){setCamera();scene.updateMatrixWorld(true);renderer.render(scene,camera);document.getElementById('caption')!.textContent=label;}
function advance(frames=90,dt=1/60){for(let frame=0;frame<frames;frame++)avatar.update(dt,motion);render();}
function configure(next:{look?:Partial<Look>;hair?:HairId;pose?:PoseId;vehicle?:VehicleId|null;view?:View;yaw?:number;elevation?:number;label?:string;motion?:Partial<AvatarMotion>;frames?:number}){
 if(next.look){look={...look,...next.look};avatar.setLook(look);}if(next.hair){hair=next.hair;avatar.setHair(hair);}if(next.pose){pose=next.pose;avatar.setPose(pose);}if('vehicle' in next){vehicle=next.vehicle??null;for(const rig of Object.values(vehicles))rig.group.visible=rig.id===vehicle;avatar.group.position.set(0,vehicle?RIDING[vehicle].rootY:0,vehicle?RIDING[vehicle].rootZ:0);motion={...motion,sitting:!!vehicle,vehicle};}
 if(next.motion)motion={...motion,...next.motion};view=next.view??view;yaw=next.yaw??yaw;elevation=next.elevation??elevation;label=next.label??label;advance(next.frames??90);return inspect();
}
function inspect(){
 const issues:string[]=[];let vertices=0,skinnedMeshes=0,meshes=0;const point=new THREE.Vector3();
 avatar.group.updateMatrixWorld(true);avatar.group.traverseVisible(node=>{if(!node.matrixWorld.elements.every(Number.isFinite))issues.push(`matrix:${node.name}`);if(node instanceof THREE.Mesh){meshes++;if(node instanceof THREE.SkinnedMesh){skinnedMeshes++;node.skeleton.update();}const positions=node.geometry.getAttribute('position');for(let i=0;i<positions.count;i++){node.getVertexPosition(i,point);point.applyMatrix4(node.matrixWorld);if(![point.x,point.y,point.z].every(Number.isFinite)){issues.push(`vertex:${node.name}:${i}`);break;}vertices++;}}});
 const visible=Object.values(vehicles).map(r=>r.group.visible);floor.visible=false;Object.values(vehicles).forEach(r=>r.group.visible=false);renderer.render(scene,camera);const avatarDrawCalls=renderer.info.render.calls,avatarTriangles=renderer.info.render.triangles;floor.visible=true;Object.values(vehicles).forEach((r,i)=>r.group.visible=visible[i]);render();
 return {look:{...look},hair,pose,vehicle,view,vertices,meshes,skinnedMeshes,avatarDrawCalls,avatarTriangles,sceneDrawCalls:renderer.info.render.calls,issues,glError:renderer.getContext().getError()};
}
Object.assign(window,{characterQA:{configure,advance,inspect,orbit:(angle:number,pitch=elevation)=>{yaw=angle;elevation=pitch;render();},setLook:(value:Partial<Look>)=>configure({look:value}),setHair:(value:HairId)=>configure({hair:value}),setPose:(value:PoseId)=>configure({pose:value}),setVehicle:(value:VehicleId|null)=>configure({vehicle:value})}});
avatar.setLook(look);advance();Object.assign(window,{characterReady:true});
