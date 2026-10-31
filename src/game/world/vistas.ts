import * as THREE from 'three';
import type { Builder } from '@/game/builder';
import { gloss, neonMaterial } from '@/game/palette';
import { surface, signTexture } from '@/game/world/materials';

type Blossom = [number, number, number, number];

/** Petal and leaf instances keep the gardens colourful in two draw calls. */
function blossoms(b: Builder, centers: Blossom[]) {
  const petals=new THREE.InstancedMesh(new THREE.SphereGeometry(.16,5,3),gloss(0xffffff,{roughness:.82}),centers.length*5);
  const leaves=new THREE.InstancedMesh(new THREE.SphereGeometry(.17,5,3),gloss(0x25876b,{roughness:.9}),centers.length*2);
  const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),color=new THREE.Color();
  centers.forEach(([x,y,z,size],i)=>{
    for(let k=0;k<5;k++) {
      const a=k*Math.PI*2/5+i*.7;
      matrix.compose(new THREE.Vector3(x+Math.cos(a)*.13*size,y+Math.sin(a)*.13*size,z),rotation,new THREE.Vector3(size,.75*size,.48*size));
      petals.setMatrixAt(i*5+k,matrix);
      petals.setColorAt(i*5+k,color.setHex([0xee3b91,0xff8eb5,0xffd0c3,0xb45bcd][i%4]));
    }
    for(let k=0;k<2;k++) {
      rotation.setFromAxisAngle(new THREE.Vector3(0,0,1),k===0?-.7:.7);
      matrix.compose(new THREE.Vector3(x+(k-.5)*.32*size,y-.18*size,z+.08),rotation,new THREE.Vector3(size*1.25,size*.58,size*.3));
      leaves.setMatrixAt(i*2+k,matrix);
    }
    rotation.identity();
  });
  b.group.add(petals,leaves);
}

function textSign(b: Builder,text: string,x: number,y: number,z: number,w: number,h: number,background='#246e78') {
  if(typeof document==='undefined') return;
  const sign=b.add(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:signTexture(text,'#fff4e4',background),roughness:.7,side:THREE.DoubleSide}),x,y,z);
  sign.rotation.y=Math.PI;
}

export function buildPhotoGarden(b: Builder) {
  const gold=gloss(0xf4c875,{metalness:.55,roughness:.3});
  const teal=surface(0x266e77,'wood',{roughness:.8});
  const rose=surface(0xffb1cc,'fabric',{roughness:.85});
  const x=-46,z=17.86;
  // Dark teal lattice and a flower-wrapped heart create a usable portrait backdrop.
  b.solid(5.9,3.35,.15,teal,x,1.73,z+.25).name='Flower garden portrait backdrop';
  for(let i=0;i<9;i++) b.box(.04,3.05,.07,gold,x-2.65+i*.66,1.8,z+.14);
  for(let i=0;i<5;i++) b.box(5.5,.035,.07,gold,x, .45+i*.63,z+.12);
  const points=[new THREE.Vector3(0,.75,0),new THREE.Vector3(-1.35,1.75,0),new THREE.Vector3(-2.2,2.9,0),new THREE.Vector3(-2.15,3.95,0),new THREE.Vector3(-1.2,4.35,0),new THREE.Vector3(0,3.55,0),new THREE.Vector3(1.2,4.35,0),new THREE.Vector3(2.15,3.95,0),new THREE.Vector3(2.2,2.9,0),new THREE.Vector3(1.35,1.75,0)];
  const curve=new THREE.CatmullRomCurve3(points,true,'catmullrom',.35);
  b.add(new THREE.TubeGeometry(curve,72,.095,6,true),gold,x,0,z-.16);
  const centers: Blossom[]=[];
  for(let i=0;i<46;i++){const p=curve.getPoint(i/46);centers.push([x+p.x,p.y,z-.25,.85+(i%3)*.15]);}
  for(const side of [-1,1]) {
    b.solid(.6,.6,.75,gloss(0xf4e3d6,{roughness:.8}),x+side*2.7,.33,z-.3);
    for(let i=0;i<14;i++) centers.push([x+side*(2.55+Math.sin(i*1.7)*.24),.75+i*.22,z-.12,1.1]);
  }
  blossoms(b,centers);
  // The bench is behind the activity position and leaves the portrait entrance open.
  b.solid(2.6,.18,.72,rose,x,.65,z-.8);
  b.box(2.6,.7,.12,rose,x,1.06,z-.49);
  for(const side of [-1,1]) {b.box(.13,.6,.75,gold,x+side*1.3,.94,z-.8);b.box(.12,.52,.12,gold,x+side*1.06,.3,z-.8);}
  textSign(b,'LOVE IN BLOOM',x,3.03,z-.29,2.45,.46,'#267079');
}

export function buildCoastalLookout(b: Builder) {
  const x=55,z=46;
  const wood=surface(0xe6ad82,'wood',{roughness:.86});
  const aqua=surface(0x65c9cc,'wood',{roughness:.78});
  const pink=gloss(0xf8a9c6,{roughness:.6});
  const cream=gloss(0xfff2df,{roughness:.7});
  b.box(4.6,.22,4.2,wood,x,2.12,z).name='Pastel lifeguard lookout';
  // One support volume overlaps the final riser, avoiding a coplanar seam
  // that can catch Rapier capsules between a thin deck and the stair landing.
  b.collider(x,1.115,z-.2,2.3,1.115,2.3);
  for(const dx of [-1.9,1.9]) for(const dz of [-1.7,1.7]) {
    b.cyl(.13,.17,2.1,7,cream,x+dx,1.05,z+dz);b.collider(x+dx,1.05,z+dz,.16,1.05,.16);
  }
  b.solid(3.4,2.5,.17,aqua,x,3.47,z+1.1);
  for(const dx of [-1.65,1.65]) b.solid(.15,2.5,2.5,aqua,x+dx,3.47,z-.05);
  b.box(3.8,.2,3.4,pink,x,4.85,z);
  b.box(4.1,.13,3.7,cream,x,5.02,z);
  // Front glazing, white cross, striped rescue ring and roof flag are recognizable details.
  for(const side of [-1,1]) b.solid(.9,.7,.12,aqua,x+side*1.15,2.65,z-1.2);
  for(const dx of [-1.65,1.65]) b.box(.12,2.45,.12,cream,x+dx,3.5,z-1.25);
  b.box(3.5,.12,.12,cream,x,4.1,z-1.25);
  b.box(.16,.65,.08,cream,x,3.01,z-1.29);b.box(.65,.16,.08,cream,x,3.01,z-1.29);
  const ring=b.add(new THREE.TorusGeometry(.38,.11,7,20),pink,x+1.75,3.23,z-1.34);ring.rotation.y=.13;
  b.box(.09,1.65,.09,cream,x+1.2,5.8,z+.5);
  b.add(new THREE.PlaneGeometry(.85,.5),new THREE.MeshStandardMaterial({color:0xef649d,side:THREE.DoubleSide}),x+1.64,6.32,z+.5);
  // Actual stair colliders make the raised lookout reachable from the beach.
  for(let i=0;i<12;i++) {const h=(i+1)*2.23/12;b.solid(1.35,h,.28,wood,x,h/2,z-5.4+i*.28);}
  b.box(1.35,2.23,.9,wood,x,1.115,z-2);
  for(const dx of [-2.2,2.2]) {
    b.box(.09,.09,3.7,cream,x+dx,3.1,z);b.collider(x+dx,2.65,z,.08,.55,1.85);
  }
  textSign(b,'GLAM BEACH',x,4.46,z-1.28,2.7,.42,'#e68ba8');
  // Three flattened longboards lean in a solid rack beside the tower.
  b.solid(2.8,.16,.65,wood,60,.2,45.3);
  b.box(2.8,.13,.13,wood,60,1.45,45.65);
  for(let i=0;i<3;i++) {
    const px=59+i*.95;
    const board=b.add(new THREE.CapsuleGeometry(.32,2.35,4,10),gloss([0xf9a3be,0x51c7ce,0xffd27c][i],{roughness:.3}),px,1.7,45.4);board.scale.z=.21;board.rotation.z=(i-1)*.08;
    b.box(.07,2.65,.035,cream,px,1.7,45.31);
  }
  b.collider(60,1.5,45.45,1.55,1.5,.4);
}

export function buildSunsetPier(b: Builder) {
  const wood=surface(0xba765f,'wood',{roughness:.84});
  const pale=surface(0xe9ba8f,'wood',{roughness:.85});
  const teal=gloss(0x3a919d,{roughness:.8});
  const rope=gloss(0xf4d5ae,{roughness:.9});
  const glow=neonMaterial(0xffdc93,.8);
  // A continuous L-shaped deck joins the boardwalk to a supported viewing platform.
  b.solid(18,.2,3,wood,39,.17,50.2).name='Sunset viewing pier';
  b.solid(5,.2,13,wood,48,.17,56.2);
  b.solid(8,.2,5.5,wood,48,.17,61.2);
  for(let i=0;i<32;i++) b.box(4.9,.025,.065,pale,48,.284,50+i*.43);
  for(let i=0;i<12;i++) b.box(.06,.025,2.85,pale,31+i*1.4,.284,50.2);
  for(const dx of [-3.65,3.65]) {
    for(const dz of [58.8,61.2,63.5]) {b.cyl(.09,.13,1.12,7,teal,48+dx,.83,dz);b.collider(48+dx,.83,dz,.13,.57,.13);}
    b.box(.05,.06,4.7,rope,48+dx,1.18,61.2);b.collider(48+dx,.82,61.2,.05,.48,2.35);
  }
  b.box(7.4,.06,.06,rope,48,1.18,63.5);b.collider(48,.82,63.5,3.7,.48,.05);
  for(const x of [44.4,51.6]) {b.cyl(.08,.12,3.6,7,teal,x,1.95,59.4);b.collider(x,1.95,59.4,.12,1.8,.12);}
  const cable=new THREE.CatmullRomCurve3([new THREE.Vector3(44.4,3.75,59.4),new THREE.Vector3(48,3.18,59.4),new THREE.Vector3(51.6,3.75,59.4)]);
  b.add(new THREE.TubeGeometry(cable,18,.02,4,false),rope);
  for(let i=0;i<11;i++) {const p=cable.getPoint(i/10);b.box(.025,.15,.025,teal,p.x,p.y-.075,p.z);b.sphere(.095,glow,p.x,p.y-.2,p.z);}
  // A rose loveseat looks out over the ocean, away from the entry path.
  b.solid(2.8,.18,.85,gloss(0xf1a3c1,{roughness:.8}),48,.72,62.1);
  b.box(2.8,.65,.14,teal,48,1.13,62.48);
  for(const x of [46.8,49.2]) b.box(.13,.6,.8,teal,x,.43,62.1);
  textSign(b,'SUNSET CLUB',48,2.92,59.36,2.9,.48);
}

export function buildClimbingFlowers(b: Builder) {
  const centers: Blossom[]=[];
  // Bougainvillea climbs the avenue facades and frames the salon entrance.
  for(const z of [-4.5,8.5,21.5]) for(let i=0;i<17;i++) centers.push([-53.15+Math.sin(i*1.4)*.18,.8+i*.3,z+Math.sin(i*.7)*.35,.9+(i%3)*.18]);
  for(const x of [-11.0,11.0]) for(let i=0;i<15;i++) centers.push([x+Math.sin(i)*.23,.7+i*.25,-39.1+Math.cos(i*.7)*.13,1.2]);
  blossoms(b,centers);
}
