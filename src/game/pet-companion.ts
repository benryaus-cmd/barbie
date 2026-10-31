import * as THREE from 'three';
import type { PetAction } from '@/game/lifestyle-types';

/** One small, jointed puppy. Actions animate actual toys and the puppy together. */
export function createPetCompanion() {
  const root=new THREE.Group();root.name='Puppy companion';
  const dog=new THREE.Group();dog.scale.setScalar(1.15);root.add(dog);
  const sphere=new THREE.SphereGeometry(1,10,7);
  const fur=new THREE.MeshStandardMaterial({color:0xffe4bd,roughness:.85});
  const caramel=new THREE.MeshStandardMaterial({color:0xc98958,roughness:.85});
  const dark=new THREE.MeshStandardMaterial({color:0x332331,roughness:.7});
  const pink=new THREE.MeshStandardMaterial({color:0xff66ae,roughness:.55});
  function oval(parent:THREE.Object3D,material:THREE.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number) {
    const mesh=new THREE.Mesh(sphere,material);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);parent.add(mesh);return mesh;
  }
  const body=new THREE.Group();dog.add(body);
  oval(body,fur,0,.39,0,.24,.23,.39);
  const head=new THREE.Group();head.position.set(0,.58,.32);body.add(head);
  oval(head,fur,0,0,0,.22,.23,.21);oval(head,fur,0,-.07,.17,.14,.09,.12);
  oval(head,dark,0,-.035,.258,.055,.038,.033);
  const ears=[-1,1].map(side=>oval(head,caramel,side*.19,-.04,-.025,.075,.21,.095));
  const eyes:THREE.Mesh[]=[],eyeShine:THREE.Mesh[]=[];
  for(const side of [-1,1]) {eyes.push(oval(head,dark,side*.083,.055,.181,.027,.035,.015));eyeShine.push(oval(head,new THREE.MeshBasicMaterial({color:0xffffff}),side*.09,.069,.194,.009,.01,.005));}
  const collar=new THREE.Mesh(new THREE.TorusGeometry(.145,.028,5,14),pink);collar.rotation.x=Math.PI/2;collar.position.set(0,.48,.25);body.add(collar);
  oval(body,new THREE.MeshStandardMaterial({color:0xffcc56,metalness:.4,roughness:.4}),0,.4,.39,.037,.048,.018);
  const tail=new THREE.Group();tail.position.set(0,.47,-.31);body.add(tail);oval(tail,caramel,0,.11,-.12,.055,.08,.2);tail.rotation.x=-.6;
  const legs=[[-.15,.24], [.15,.24], [-.15,-.24], [.15,-.24]].map(([x,z])=> {
    const pivot=new THREE.Group();pivot.position.set(x,.25,z);body.add(pivot);oval(pivot,fur,0,-.1,0,.066,.15,.07);oval(pivot,fur,0,-.22,.03,.08,.055,.105);return pivot;
  });
  const ball=new THREE.Mesh(new THREE.SphereGeometry(.14,10,8),new THREE.MeshStandardMaterial({color:0xff66b1,emissive:0x5b123b,roughness:.4}));root.add(ball);
  const frisbee=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,.035,16),new THREE.MeshStandardMaterial({color:0x6de8ee,metalness:.15,roughness:.35}));root.add(frisbee);
  const treat=new THREE.Group();oval(treat,caramel,0,0,0,.16,.045,.045);for(const side of[-1,1]){oval(treat,caramel,side*.14,.035,0,.055,.055,.04);oval(treat,caramel,side*.14,-.035,0,.055,.055,.04);}root.add(treat);
  ball.visible=frisbee.visible=treat.visible=false;
  // Cushion surface matches the Puppy Bed in world/stations.ts.
  const bed=new THREE.Vector3(4.5,.42,-34.5);
  dog.position.copy(bed);dog.rotation.y=.55;
  let action:PetAction='idle',mode:'bed'|'follow'='bed',elapsed=0,clock=0,presentingNow=false,sleep=1;
  const destination=new THREE.Vector3(),besidePlayer=new THREE.Vector3(),toyEnd=new THREE.Vector3(),origin=new THREE.Vector3();
  const old=new THREE.Vector3();
  root.traverse(object=>{object.castShadow=false;object.receiveShadow=false;});
  return {
    root,
    setAction(next:PetAction) {
      if(next==='follow'||next==='whistle'||next==='bed') {
        mode=next==='bed'?'bed':'follow';action='idle';
      } else action=next;
      elapsed=0;origin.copy(dog.position);
      toyEnd.copy(dog.position).add(new THREE.Vector3(presentingNow?-.4:2.5,0,presentingNow?-1:2.2));
    },
    update(dt:number,player:THREE.Vector3,facing:number,presenting:boolean,photo:boolean,photoOffset=-.82) {
      elapsed+=dt;clock+=dt;presentingNow=presenting;
      if(elapsed>5.3)action='idle';
      besidePlayer.set(player.x+(presenting?(photo?photoOffset:-.82):Math.cos(facing)*.9),player.y+.02,player.z+(presenting?.18:-Math.sin(facing)*.9+.5));
      // A photo is a temporary invitation. Leaving it resumes the chosen mode.
      destination.copy(mode==='follow'||photo?besidePlayer:bed);
      const fetch=action==='ball'||action==='frisbee';
      const toy=action==='frisbee'?frisbee:ball;
      ball.visible=action==='ball'&&elapsed<5.2;frisbee.visible=action==='frisbee'&&elapsed<5.2;
      treat.visible=action==='treat'&&elapsed<2.1;
      if(fetch && elapsed<2.4) destination.copy(toyEnd);
      old.copy(dog.position);
      const distance=dog.position.distanceTo(destination);
      // Cap travel speed so a distant whistle or bed command is a visible run.
      if(distance>.001)dog.position.lerp(destination,Math.min(1-Math.exp(-dt*6),dt*(fetch?7:photo?14:8.4)/distance));
      const walking=old.distanceTo(dog.position)>.002;
      const sleeping=mode==='bed'&&!photo&&action==='idle'&&dog.position.distanceTo(bed)<.12;
      sleep=THREE.MathUtils.damp(sleep,sleeping?1:0,7,dt);
      if(presenting&&(mode==='follow'||photo)&&!fetch&&!walking)dog.rotation.y=0;
      else if(walking) {
        const heading=Math.atan2(destination.x-dog.position.x,destination.z-dog.position.z);
        dog.rotation.y+=Math.atan2(Math.sin(heading-dog.rotation.y),Math.cos(heading-dog.rotation.y))*(1-Math.exp(-dt*10));
      }
      const pat=action==='pat'&&elapsed<2.5,eating=action==='treat'&&elapsed<2.4;
      const hop=pat?Math.abs(Math.sin(elapsed*5))*.09:fetch?Math.abs(Math.sin(clock*15))*.035:0;
      body.position.y=hop-.19*sleep;
      body.scale.y=1+Math.sin(clock*1.7)*.025*sleep;
      body.rotation.x=eating?.17:pat?-.13:0;
      head.position.y=.58-.13*sleep;
      head.rotation.z=pat?Math.sin(elapsed*5)*.18:photo?-.1:.12*sleep;
      head.rotation.x=(eating?.23+Math.sin(elapsed*18)*.06:Math.sin(clock*2)*.025)+sleep*.3;
      eyes.forEach(eye=>eye.scale.y=.035-.031*sleep);
      eyeShine.forEach(shine=>shine.visible=sleep<.7);
      tail.rotation.y=Math.sin(clock*(action==='idle'?7:16))*(action==='idle'?.4:.85)*(1-sleep);
      ears.forEach((ear,index)=>ear.rotation.z=Math.sin(clock*7+index)*.08*(1-sleep)+(index?-.15:.15));
      legs.forEach((leg,index)=>{leg.rotation.x=(walking?Math.sin(clock*13+index*Math.PI)*.55:0)-sleep*1.25;});
      if(fetch&&elapsed<5.2) {
        if(elapsed<.85){const t=Math.min(1,elapsed/.85);toy.position.lerpVectors(origin,toyEnd,t);toy.position.y+=.65+Math.sin(t*Math.PI)*1.2;}
        else if(elapsed<2.4)toy.position.copy(toyEnd).add(new THREE.Vector3(0,.17,0));
        else {toy.position.copy(dog.position);toy.position.x+=Math.sin(dog.rotation.y)*.48;toy.position.z+=Math.cos(dog.rotation.y)*.48;toy.position.y+=.52;}
        toy.rotation.y+=dt*9;if(action==='frisbee')toy.rotation.z=Math.sin(elapsed*4)*.2;
      }
      if(treat.visible)treat.position.copy(dog.position).add(new THREE.Vector3(0,.18,.57));
    },
    reset(){mode='bed';action='idle';elapsed=0;sleep=1;dog.position.copy(bed);dog.rotation.y=.55;ball.visible=frisbee.visible=treat.visible=false;},
  };
}
