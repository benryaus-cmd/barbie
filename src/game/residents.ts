import * as THREE from 'three';
import { createAvatar } from '@/game/avatar';
import type { HairId, OutfitId } from '@/game/types';
import type { Look } from '@/game/lifestyle-types';
import { RESIDENTS } from '@/game/resident-data';

const HOMES = [
  { x: -2.8, y: .91, z: -25.8, pool: true },
  { x: 17.2, y: .18, z: -29.4, pool: false },
  { x: 2.1, y: .91, z: -27.7, pool: true },
  { x: -43.3, y: .06, z: 10.6, pool: false },
  { x: 43.7, y: .02, z: 29.3, pool: false },
  { x: -45.4, y: .03, z: 24.4, pool: false },
];
const SKINS = [0xffd4b9, 0x8f4f32, 0xdba17d, 0x754731, 0xcc997b, 0xf1c3ac];
const HAIR = [0xf0ce73, 0x302026, 0x493024, 0x271d28, 0x262329, 0xe381ac];

export function createResidents() {
  const root = new THREE.Group(); root.name = 'Dreamland residents';
  const sphere = new THREE.SphereGeometry(1, 10, 7);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 8);
  const textures: THREE.Texture[] = [];
  const ink = new THREE.MeshStandardMaterial({ color: 0x2a2134, roughness: .75 });
  const white = new THREE.MeshStandardMaterial({ color: 0xfff9ef, roughness: .65 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffd472, roughness: .35, metalness: .25 });
  const make = (parent: THREE.Object3D, material: THREE.Material, geo: THREE.BufferGeometry, x:number,y:number,z:number,sx:number,sy:number,sz:number) => {
    const mesh = new THREE.Mesh(geo, material); mesh.position.set(x,y,z); mesh.scale.set(sx,sy,sz); parent.add(mesh); return mesh;
  };
  const people = RESIDENTS.map((info, index) => {
    const home = HOMES[index];
    const group = new THREE.Group(); group.name = info.name; root.add(group);
    const body = new THREE.Group(); group.add(body);
    const skin = new THREE.MeshStandardMaterial({color:SKINS[index],roughness:.7});
    const fabric = new THREE.MeshStandardMaterial({color:info.color,roughness:.65});
    const hair = new THREE.MeshStandardMaterial({color:HAIR[index],roughness:.8});
    make(body, fabric, cylinder, 0,1.13,0,.21,.48,.14);
    make(body, fabric, sphere, 0,.92,0,.24,.17,.17);
    make(body, skin, cylinder, 0,1.43,0,.065,.15,.065);
    make(body, skin, sphere, 0,1.65,0,.188,.235,.167);
    make(body, hair, sphere, 0,1.72,-.075,.209,.229,.125);
    // Hair silhouette remains visible at the inexpensive distance level.
    make(body, hair, sphere, 0,1.48,-.12,.21,index === 0 ? .39 : .24,.105);
    if (index === 1 || index === 3) for (const side of [-1,1]) make(body,hair,sphere,side*.17,1.68,-.03,.115,.23,.12);
    if (index === 4) make(body,hair,sphere,0,1.96,-.04,.13,.1,.12);
    const details = new THREE.Group(); body.add(details);
    for (const side of [-1,1]) {
      make(details,white,sphere,side*.071,1.677,.148,.043,.025,.012);
      make(details,ink,sphere,side*.071,1.677,.159,.014,.020,.006);
      make(details,gold,sphere,side*.199,1.584,.025,.018,.032,.013);
    }
    make(details,new THREE.MeshStandardMaterial({color:0xd64d7d}),sphere,0,1.554,.153,.044,.011,.009);
    const arms = [-1,1].map(side => {
      const pivot = new THREE.Group(); pivot.position.set(side*.239,1.31,0);body.add(pivot);
      make(pivot,skin,cylinder,0,-.24,0,.046,.48,.045);
      make(pivot,skin,sphere,0,-.51,0,.049,.068,.032);
      return pivot;
    });
    const legs: THREE.Group[] = [];
    for (const side of [-1,1]) {
      const leg = new THREE.Group();leg.position.set(side*.107,.91,0);body.add(leg);
      make(leg,skin,cylinder,0,-.4,0,.061,.8,.058);
      make(leg,white,sphere,0,-.83,.045,.072,.045,.13);
      if (home.pool) leg.rotation.x = -1.25;
      legs.push(leg);
    }
    if (!home.pool && index !== 4) make(body,fabric,new THREE.ConeGeometry(.33,.4,10,1,true),0,.81,0,1,1,.78);
    let float: THREE.Mesh | null = null;
    const floatDecor = new THREE.Group();group.add(floatDecor);
    if (home.pool) {
      float = new THREE.Mesh(new THREE.TorusGeometry(.64,.18,8,24),fabric);float.rotation.x=Math.PI/2;float.position.y=.08;floatDecor.add(float);
      body.position.y=-.82;
      for (let i=0;i<4;i++) {
        const patch=make(floatDecor,white,sphere,Math.cos(i*Math.PI/2)*.64,.1,Math.sin(i*Math.PI/2)*.64,.15,.18,.16);patch.rotation.y=i*Math.PI/2;
      }
    }
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
    const context=canvas.getContext('2d');
    if(context) {
      context.fillStyle='rgba(51,27,63,.88)';context.beginPath();context.roundRect(4,5,248,54,22);context.fill();
      context.fillStyle='#fff4fa';context.font='bold 25px sans-serif';context.textAlign='center';context.fillText(info.name+'  •',128,41);
    }
    const texture=new THREE.CanvasTexture(canvas);textures.push(texture);
    const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));label.scale.set(1.8,.45,1);label.position.y=home.pool?1.58:2.23;group.add(label);
    group.traverse(object=>{object.castShadow=false;object.receiveShadow=false;});
    return {info,home,group,body,arms,legs,details,label,float,floatDecor};
  });
  // Three reusable full doll rigs provide close-up detail without six expensive
  // characters updating offscreen. Everyone else retains the simple silhouette.
  function createDetailSlot() {
    const avatar = createAvatar();
    const skinMaterials: THREE.MeshStandardMaterial[] = [];
    const shadeMaterials: THREE.MeshStandardMaterial[] = [];
    const seen = new Set<THREE.Material>();
    avatar.group.traverse(object => {
      object.castShadow = false; object.receiveShadow = false;
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (seen.has(material)) continue;
        seen.add(material);
        if (!(material instanceof THREE.MeshStandardMaterial)) continue;
        if (material.color.getHex() === 0xffd4b9) skinMaterials.push(material);
        if (material.color.getHex() === 0xeaa88f) shadeMaterials.push(material);
      }
    });
    return {avatar, skinMaterials, shadeMaterials, id: ''};
  }
  const slots = [createDetailSlot()];
  let clock=0;
  let companion: string|null=null;
  function update(dt:number, player:THREE.Vector3, photo:boolean, detailedBudget = 3) {
    clock+=dt;
    const ranked=[...people].sort((a,b)=>Math.hypot(a.home.x-player.x,a.home.z-player.z)-Math.hypot(b.home.x-player.x,b.home.z-player.z));
    if (photo && companion) {
      const index = ranked.findIndex(person => person.info.id === companion);
      if (index > 0) ranked.unshift(...ranked.splice(index, 1));
    }
    const count = detailedBudget === 1 ? 1 : 3;
    while(slots.length < count) slots.push(createDetailSlot());
    const detailed=new Set(ranked.slice(0,count));
    for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
      const slot = slots[slotIndex], person = ranked[slotIndex];
      if(slotIndex >= count) {slot.avatar.group.visible = false;continue;}
      const index = people.indexOf(person), chosen = photo && companion === person.info.id;
      if (slot.id !== person.info.id) {
        slot.id = person.info.id;
        person.group.add(slot.avatar.group);
        slot.avatar.setOutfit((person.home.pool || index === 4 ? 'beach' : index === 3 ? 'casual' : 'popstar') as OutfitId);
        slot.avatar.setHair((['blonde', 'updo', 'blonde', 'updo', 'updo', 'pink'][index]) as HairId);
        slot.avatar.setAccessory(index === 3 ? 'sunglasses' : 'none');
        slot.avatar.setShoes('sneakers');
        const extended = slot.avatar as typeof slot.avatar & {setLook?(look: Look):void};
        extended.setLook?.({top:person.home.pool || index === 4 ? 'beach' : index === 3 ? 'casual':'popstar',bottom:person.home.pool || index === 4?'wrap':index===3?'shorts':'pleated',accessories:index===3?['sunglasses']:[],topColor:person.info.color,bottomColor:index===4?'#effaff':person.info.color});
        slot.skinMaterials.forEach(material => material.color.setHex(SKINS[index]));
        slot.shadeMaterials.forEach(material => material.color.setHex(SKINS[index]).multiplyScalar(.83));
      }
      slot.avatar.group.visible = true;
      slot.avatar.group.position.set(0, person.home.pool && !chosen ? -.82 : 0, 0);
      const extended = slot.avatar as typeof slot.avatar & {setPose?(pose: 'wave' | 'idle'):void};
      extended.setPose?.(chosen ? 'wave' : 'idle');
      slot.avatar.update(dt, {moving:false,speed:0,grounded:true,dancing:index===1&&!photo,sitting:person.home.pool&&!chosen});
    }
    for (let i=0;i<people.length;i++) {
      const person=people[i], chosen=photo && companion===person.info.id;
      const {group,home}=person;
      group.position.set(chosen?player.x+1.0:home.x,chosen?player.y:home.y,chosen?player.z+.05:home.z);
      group.rotation.y=chosen?-.1:home.pool?Math.sin(clock*.25+i)*.2:Math.atan2(player.x-home.x,player.z-home.z);
      const distance=group.position.distanceTo(player);
      group.visible=chosen || distance<45;
      person.body.visible=!detailed.has(person);
      person.details.visible=false;
      person.label.visible=!photo && distance<15;
      if (!group.visible) continue;
      // A photo companion stands beside the doll even if normally floating.
      person.body.position.y=chosen?0:home.pool?-.82:Math.sin(clock*1.5+i)*.012;
      person.floatDecor.visible=!chosen;
      person.legs.forEach(leg=>{leg.rotation.x=home.pool&&!chosen?-1.25:0;});
      if(home.pool && !chosen) {group.position.y+=Math.sin(clock*1.3+i)*.07;group.rotation.z=Math.sin(clock*.9+i)*.035;}
      else group.rotation.z=0;
      person.arms[0].rotation.z=.1+Math.sin(clock*1.6+i)*.04;
      person.arms[1].rotation.z=chosen?-.8:-.1-Math.sin(clock*1.6+i)*.04;
      person.arms[1].rotation.x=chosen?-1.2:home.pool?-.5:0;
    }
  }
  return {
    root, update,
    setPhotoCompanion(id:string|null) {companion=RESIDENTS.some(person=>person.id===id)?id:null;},
    nearest(x:number,y:number,z:number) {
      let best:typeof people[number]|null=null, distance=2.7;
      for(const person of people) {
        if(Math.abs(person.home.y-y)>2) continue;
        const d=Math.hypot(x-person.home.x,z-person.home.z);
        if(d<distance){best=person;distance=d;}
      }
      return best?.info ?? null;
    },
    dispose(){textures.forEach(texture=>texture.dispose());},
  };
}
