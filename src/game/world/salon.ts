import * as THREE from 'three';
import type { Builder } from '@/game/builder';
import { PALETTE, gloss, glassMaterial, neonMaterial } from '@/game/palette';
import { surface, signTexture } from '@/game/world/materials';

/** Open-front salon: the entrance, styling chair and wash station are walkable. */
export function buildSalon(b: Builder) {
  const wall=surface(0xffd3e6,'plaster',{roughness:.68});
  const white=gloss(0xfff5ec,{roughness:.3});
  const rose=surface(0xd94383,'fabric',{roughness:.78});
  const brass=gloss(PALETTE.gold,{metalness:.72,roughness:.26});
  b.solid(10,.16,8,white,-29,.08,18);
  b.solid(10,4.6,.3,wall,-29,2.3,14);
  b.solid(.3,4.6,8,wall,-34,2.3,18);
  b.solid(.3,4.6,8,wall,-24,2.3,18);
  b.box(10.6,.3,8.6,gloss(0xe76d9d),-29,4.7,18);
  // Recessed luminous marquee and striped curved-edge awning.
  b.box(10.1,.75,.3,brass,-29,4.05,22.2);
  if(typeof document!=='undefined') b.add(new THREE.PlaneGeometry(8.7,.65),new THREE.MeshStandardMaterial({map:signTexture('GLOSS • HAIR SALON','#fff5e8','#ab2869'),roughness:.5}),-29,4.05,22.37);
  for(let i=0;i<10;i++) {
    b.box(1.02,.16,1.3,i%2?white:rose,-33.6+i*1.02,3.55,22.35);
    b.add(new THREE.SphereGeometry(.51,10,6,0,Math.PI*2,0,Math.PI/2),i%2?white:rose,-33.6+i*1.02,3.4,22.8).scale.set(1,.45,.25);
  }
  // Twin styling stations with mirrors, counters, brushes and hair bottles.
  for(const x of [-31.7,-27.1]) {
    b.box(2.5,2.5,.18,brass,x,2.75,14.24);
    b.box(2.25,2.25,.2,glassMaterial(0xb3d8df,.85),x,2.75,14.35);
    b.solid(2.8,.18,.85,white,x,1.17,14.7);
    b.solid(.24,1.1,.7,rose,x-1.15,.6,14.7);
    b.solid(.24,1.1,.7,rose,x+1.15,.6,14.7);
    b.cyl(.48,.55,.12,16,brass,x,.15,17.1);
    b.cyl(.1,.13,.5,10,brass,x,.43,17.1);
    b.box(1.25,.25,1.15,rose,x,.79,17.1);
    b.box(1.25,1.05,.26,rose,x,1.3,17.65);
    for(const side of [-.65,.65]) b.box(.12,.15,.9,brass,x+side,1.14,17.1);
    b.collider(x,.8,17.2,.68,.8,.65);
    const foot=b.box(.75,.08,.3,brass,x,.35,16.3);foot.rotation.x=.3;
    for(let i=0;i<3;i++) {
      b.cyl(.07,.08,.28,8,gloss([0xf5aacf,0x86d9cb,0xcb9fed][i]),x-.8+i*.24,1.42,14.6);
      b.cyl(.045,.045,.07,8,brass,x-.8+i*.24,1.59,14.6);
    }
    for(const side of [-1.14,1.14])for(let i=0;i<4;i++)b.sphere(.065,neonMaterial(0xffedcc,.7),x+side,1.85+i*.58,14.49);
  }
  // Wash basin with visible curved porcelain bowl and a gold faucet.
  b.cyl(.55,.38,.65,16,white,-25.5,.49,19.1);
  const basin=b.add(new THREE.SphereGeometry(.59,16,10,0,Math.PI*2,Math.PI/2,Math.PI/2),white,-25.5,1.08,19.1);basin.scale.y=.55;white.side=THREE.DoubleSide;
  b.cyl(.04,.04,.5,8,brass,-25.5,1.1,19.55);
  b.box(.32,.07,.07,brass,-25.37,1.33,19.55);
  b.collider(-25.5,.55,19.1,.6,.65,.6);
  b.box(1.5,.6,1.3,rose,-25.5,.4,20.6);
  // Slim product shelf, framed beauty print and two outdoor planters.
  for(let row=0;row<3;row++) {
    b.box(.6,.08,2.1,brass,-33.7,1.2+row*.7,18.5);
    for(let i=0;i<4;i++)b.cyl(.08,.08,.3,8,gloss(i%2?0x9cd6c9:0xf9b0ce),-33.55,1.4+row*.7,17.75+i*.5);
  }
  for(const x of [-34.4,-23.6]) {
    b.cyl(.5,.38,.65,12,white,x,.34,22.4);
    for(let i=0;i<5;i++){const leaf=b.add(new THREE.SphereGeometry(.3,7,5),gloss(0x399d70,{roughness:.8}),x+Math.sin(i*2.4)*.23,.95+i*.09,22.4+Math.cos(i*2.4)*.23);leaf.scale.set(.45,1.8,.5);leaf.rotation.z=Math.sin(i)*.65;}
  }
}
