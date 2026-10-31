import * as THREE from 'three';
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { createAvatar } from '../src/game/avatar';
import { BOTTOMS, DEFAULT_LOOK, TOPS, EXTRAS } from '../src/game/fashion';
import type { PoseId, Look } from '../src/game/lifestyle-types';
import { WardrobeSheet } from '../src/ui/WardrobeSheet';
import '../src/index.css';
const motion={moving:false,speed:0,grounded:true,dancing:false,sitting:false};
const poses:PoseId[]=['idle','wave','peace','heart','kiss','spin','dance','pet','surf'];
const scene=new THREE.Scene();scene.background=new THREE.Color('#f4e5ed');
scene.add(new THREE.HemisphereLight(0xffffff,0x8e678e,2));const key=new THREE.DirectionalLight(0xfff3dc,3);key.position.set(-3,5,6);scene.add(key);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1200,900);renderer.setPixelRatio(1);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.domElement.style.cssText='position:fixed;inset:0';document.body.append(renderer.domElement);
const cam=new THREE.OrthographicCamera(-4.5,4.5,3.45,-3.45,.1,30);cam.position.set(0,3.3,12);cam.lookAt(0,3.3,0);
const jointStates:any={};
for(let i=0;i<poses.length;i++) {
 const avatar=createAvatar();avatar.group.position.set((i%3-1)*3.0, (1-Math.floor(i/3))*2.3+2.4,0);scene.add(avatar.group);
 avatar.setHair((['blonde','pink','updo','bob','curls'] as const)[i%5]);avatar.setShoes((['heels','sneakers','boots','sandals','platforms'] as const)[i%5]);
 avatar.setLook({...DEFAULT_LOOK,top:TOPS[i%8].id,bottom:BOTTOMS[i%8].id,topColor:TOPS[i%8].color!,bottomColor:BOTTOMS[i%8].color!,accessories:EXTRAS.map(e=>e.id)});avatar.setPose(poses[i]);
 for(let frame=0;frame<100;frame++)avatar.update(1/60,motion);
 const joints:any={};avatar.group.traverse(node=>{if(node.type==='Group')joints[node.name]=[node.rotation.x,node.rotation.y,node.rotation.z]});jointStates[poses[i]]=joints;
 const label=document.createElement('div');label.style.cssText=`position:absolute;left:${(i%3)*400+175}px;top:${Math.floor(i/3)*300+275}px;font:600 16px sans-serif;color:#57324d;`;label.textContent=poses[i];document.body.append(label);
}
renderer.render(scene,cam);
const checker=createAvatar();let combinations=0;
for(const top of TOPS)for(const bottom of BOTTOMS){checker.setLook({top:top.id,bottom:bottom.id,topColor:'#98d7ad',bottomColor:'#ff9878',accessories:EXTRAS.map(e=>e.id)});for(const pose of poses){checker.setPose(pose);checker.update(1/30,motion);checker.group.updateMatrixWorld(true);checker.group.traverse(n=>{if(!n.matrixWorld.elements.every(Number.isFinite))throw Error('Nonfinite joint');});}combinations++;}
(checker as any).setHair('bob');(checker as any).setHair('curls');(checker as any).setShoes('sandals');(checker as any).setShoes('platforms');
(window as any).fashionResult={combinations,jointStates,drawCalls:renderer.info.render.calls};
function Demo(){const[look,setLook]=useState<Look>({...DEFAULT_LOOK});return <WardrobeSheet title="Your wardrobe" outfit="glam" hair="blonde" accessory="none" shoes="heels" unlocked={['glam','beach']} points={100} notice={null} onOutfit={()=>{}} onHair={()=>{}} onAccessory={()=>{}} onShoes={()=>{}} onClose={()=>{}} look={look} ownedFashion={[]} followers={0} onFashion={(slot,id)=>setLook(s=>slot==='accessory'?{...s,accessories:s.accessories.includes(id as any)?s.accessories.filter(a=>a!==id):[...s.accessories,id as any]}:{...s,[slot]:id})} onColor={(slot,color)=>setLook(s=>({...s,[`${slot}Color`]:color}))}/>}
if(location.search.includes('ui')) {renderer.domElement.remove();document.querySelectorAll('body>div:not(#root)').forEach(n=>n.remove());document.body.style.cssText='margin:0;background:#d7c2d5';createRoot(document.getElementById('root')!).render(<Demo/>);}
