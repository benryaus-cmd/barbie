import * as THREE from 'three';
import { createAvatar } from '@/game/avatar';
import type { HairId, OutfitId } from '@/game/types';
import type { Look, PoseId } from '@/game/lifestyle-types';
import { RESIDENTS } from '@/game/resident-data';

const HOMES = [
  { x: -2.8, y: .91, z: -25.8, pool: true },
  { x: 17.2, y: .18, z: -29.4, pool: false },
  { x: 2.1, y: .91, z: -27.7, pool: true },
  { x: -43.3, y: .06, z: 10.6, pool: false },
  { x: 43.7, y: .02, z: 29.3, pool: false },
  { x: -38.6, y: .04, z: 20, pool: false },
  { x: 37.6, y: .04, z: 24.4, pool: false },
];
// Short pedestrian loops stay outside the pool coping, shop walls, raised
// runway stage, beach furniture and both sports courts. Pool residents stay put.
const WALK_ROUTES: Record<string, readonly (readonly [number, number])[]> = {
  brooklyn: [[17.2,-29.4],[17.2,-24],[19.8,-24],[19.8,-29.4]],
  nikki: [[-43.3,10.6],[-43.3,13],[-40,13],[-40,10.6]],
  daisy: [[-38.6,20],[-38.6,27.8],[-36.5,27.8],[-36.5,20]],
  ken: [[37.6,24.4],[35.5,24.4],[35.5,29.4],[36.9,29.4],[36.9,24.4]],
};
const SKINS = [0xffd4b9, 0x8f4f32, 0xdba17d, 0x754731, 0xcc997b, 0xf1c3ac, 0xe9b38d];
const HAIR = [0xf0ce73, 0x302026, 0x493024, 0x271d28, 0x262329, 0xe381ac, 0xb68646];

export function createResidents() {
  const root = new THREE.Group(); root.name = 'Dreamland residents';
  const sphere = new THREE.SphereGeometry(1, 10, 7);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 8);
  const smoothSphere = new THREE.SphereGeometry(1, 22, 16);
  const smoothCylinder = new THREE.CylinderGeometry(1, 1, 1, 16);
  // The male shirt narrows at the waist, opens through the chest and rounds
  // toward the neck; the elliptic cross-section avoids a barrel-shaped torso.
  const tailoredShirt = new THREE.LatheGeometry([new THREE.Vector2(.79,-.5),new THREE.Vector2(.82,-.34),new THREE.Vector2(.94,.02),new THREE.Vector2(1,.27),new THREE.Vector2(.97,.4),new THREE.Vector2(.64,.5)],24);
  const stitch = (parent:THREE.Object3D, material:THREE.Material, points:number[][], radius=.004) => {
    const curve=new THREE.CatmullRomCurve3(points.map(point=>new THREE.Vector3(...point as [number,number,number])));
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(6,points.length*3),radius,5,false),material);parent.add(mesh);return mesh;
  };
  const lapel = (parent:THREE.Object3D,material:THREE.Material,side:number) => {
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute([side*.072,1.405,.082, side*.149,1.351,.137, side*.071,1.285,.171],3));
    geometry.setIndex(side<0?[0,1,2]:[0,2,1]);geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,material);mesh.name='Ken shirt collar';parent.add(mesh);
  };
  const textures: THREE.Texture[] = [];
  const ink = new THREE.MeshStandardMaterial({ color: 0x2a2134, roughness: .75 });
  const white = new THREE.MeshStandardMaterial({ color: 0xfff9ef, roughness: .65 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffd472, roughness: .35, metalness: .25 });
  const make = (parent: THREE.Object3D, material: THREE.Material, geo: THREE.BufferGeometry, x:number,y:number,z:number,sx:number,sy:number,sz:number) => {
    const mesh = new THREE.Mesh(geo, material); mesh.position.set(x,y,z); mesh.scale.set(sx,sy,sz); parent.add(mesh); return mesh;
  };
  const people = RESIDENTS.map((info, index) => {
    const home = HOMES[index];
    const male = info.id === 'ken';
    const group = new THREE.Group(); group.name = info.name; root.add(group);
    const body = new THREE.Group(); group.add(body);
    const skin = new THREE.MeshStandardMaterial({color:SKINS[index],roughness:.7});
    const rounded = male ? smoothSphere : sphere;
    const limb = male ? smoothCylinder : cylinder;
    const fabric = new THREE.MeshStandardMaterial({color:info.color,roughness:.65});
    const hair = new THREE.MeshStandardMaterial({color:HAIR[index],roughness:.8});
    const shirt=make(body, fabric, male ? tailoredShirt : cylinder, 0,1.13,0,male ? .29 : .21,.48,male ? .18 : .14);
    if(male) shirt.name='Ken tailored shirt';
    const shorts = male ? new THREE.MeshStandardMaterial({color:0x285675,roughness:.74}) : fabric;
    make(body, shorts, rounded, 0,male ? .895 : .92,0,.24,male ? .11 : .17,.17);
    make(body, skin, limb, 0,1.43,0,male ? .084 : .065,.15,male ? .077 : .065);
    const head=make(body, skin, rounded, 0,1.65,0,.188,.235,.167);if(male)head.name='Ken sculpted face';
    make(body, hair, rounded, 0,male ? 1.83 : 1.72,-.075,.209,male ? .105 : .229,.165);
    if (male) {
      const shade=new THREE.MeshStandardMaterial({color:0xc18768,roughness:.8});
      const highlight=new THREE.MeshStandardMaterial({color:0xd2aa66,roughness:.62});
      const collar=new THREE.MeshStandardMaterial({color:0xc6eff1,roughness:.7,side:THREE.DoubleSide});
      make(body, skin, rounded, 0,1.529,.018,.165,.086,.14);
      make(body, skin, rounded, 0,1.505,.076,.10,.049,.087);
      for(const side of [-1,1]) {
        make(body,skin,rounded,side*.183,1.639,-.003,.034,.059,.035);
        make(body,shade,rounded,side*.201,1.639,.018,.010,.032,.012);
        make(body,skin,rounded,side*.089,1.603,.125,.072,.048,.043);
        const temple=make(body,hair,rounded,side*.177,1.763,-.064,.032,.102,.105);temple.rotation.z=-side*.13;
      }
      make(body,skin,rounded,0,1.654,.152,.026,.069,.035);
      make(body,skin,rounded,0,1.614,.186,.037,.025,.029);
      for(const side of [-1,1])make(body,shade,rounded,side*.023,1.602,.192,.007,.004,.007);
      const quiff=make(body,hair,rounded,-.045,1.895,.045,.16,.085,.13);quiff.rotation.z=-.22;
      for(let strand=0;strand<8;strand++) {
        const x=-.158+strand*.043;
        const sweep=stitch(body,strand%3===0?highlight:hair,[[x,1.785,.108],[x-.018,1.868,.14],[x-.057,1.938,.042],[x-.085,1.903,-.084]],strand%3===0?.009:.014);sweep.name='Ken swept hair strand';
      }
      lapel(body,collar,-1);lapel(body,collar,1);
      stitch(body,collar,[[0,1.31,.172],[0,1.16,.177],[0,.925,.151]],.009).name='Ken shirt placket';
      for(let button=0;button<4;button++) make(body,white,rounded,.003,1.275-button*.087,.184,.008,.008,.004);
      stitch(body,collar,[[.088,1.246,.169],[.169,1.238,.148],[.171,1.179,.151],[.127,1.159,.17],[.087,1.181,.174],[.088,1.246,.169]],.003);
      for(const side of [-1,1])stitch(body,collar,[[side*.219,.95,.074],[side*.243,1.12,.085],[side*.256,1.26,.059]],.003);
      const waistband=make(body,shorts,limb,0,.918,0,.236,.043,.17);waistband.name='Ken shorts waistband';
      stitch(body,white,[[-.035,.925,.171],[0,.927,.178],[.035,.925,.171]],.005);
      for(const side of [-1,1])stitch(body,white,[[side*.012,.924,.175],[side*.021,.884,.18],[side*.037,.872,.178]],.004);
    }
    // Hair silhouette remains visible at the inexpensive distance level.
    if (!male) make(body, hair, sphere, 0,1.48,-.12,.21,index === 0 ? .39 : .24,.105);
    if (index === 1 || index === 3) for (const side of [-1,1]) make(body,hair,sphere,side*.17,1.68,-.03,.115,.23,.12);
    if (index === 4) make(body,hair,sphere,0,1.96,-.04,.13,.1,.12);
    const details = new THREE.Group(); body.add(details);
    for (const side of [-1,1]) {
      make(details,white,rounded,side*.071,1.677,.148,male ? .048 : .043,male ? .022 : .025,.012);
      if(male)make(details,new THREE.MeshStandardMaterial({color:0x397a96}),rounded,side*.071,1.677,.16,.018,.019,.006);
      make(details,ink,rounded,side*.071,1.677,male ? .165 : .159,male ? .009 : .014,male ? .014 : .020,.006);
      if(male)make(details,white,rounded,side*.067,1.683,.171,.005,.006,.003);
      if (!male) make(details,gold,sphere,side*.199,1.584,.025,.018,.032,.013);
      else {stitch(details,hair,[[side*.032,1.722,.16],[side*.063,1.735,.16],[side*.099,1.728,.149],[side*.12,1.716,.139]],.008);}
    }
    const lip=new THREE.MeshStandardMaterial({color:male ? 0xb37868 : 0xd64d7d});
    make(details,lip,rounded,0,1.554,.153,male ? .047 : .044,male ? .008 : .011,.009);
    if(male) {stitch(details,ink,[[-.037,1.555,.16],[0,1.55,.166],[.037,1.555,.16]],.002);make(details,skin,rounded,0,1.53,.145,.045,.017,.015);}
    const arms = [-1,1].map(side => {
      const pivot = new THREE.Group(); pivot.position.set(side*(male ? .292 : .239),1.31,0);body.add(pivot);
      make(pivot,skin,limb,0,-.24,0,male ? .069 : .046,.48,male ? .066 : .045);
      if(male) {
        make(pivot,fabric,rounded,0,-.025,0,.09,.10,.09);
        make(pivot,fabric,limb,0,-.09,0,.085,.14,.083);
        const cuff=make(pivot,white,limb,0,-.16,0,.086,.018,.085);cuff.name='Ken sleeve cuff';
        make(pivot,skin,rounded,0,-.31,0,.071,.074,.066);
        make(pivot,skin,rounded,0,-.49,.012,.048,.062,.037);
        make(pivot,skin,rounded,-side*.046,-.483,.022,.024,.039,.025);
      }
      make(pivot,skin,rounded,0,-.51,0,.049,.068,.032);
      return pivot;
    });
    const legs: THREE.Group[] = [];
    for (const side of [-1,1]) {
      const leg = new THREE.Group();leg.position.set(side*.107,.91,0);body.add(leg);
      make(leg,skin,limb,0,-.4,0,male ? .076 : .061,.8,male ? .073 : .058);
      if (male) {
        make(leg,shorts,limb,0,-.13,0,.107,.29,.10);
        const hem=make(leg,white,limb,0,-.272,0,.108,.017,.102);hem.name='Ken shorts hem';
        stitch(leg,white,[[side*.087,-.018,.047],[side*.098,-.13,.049],[side*.098,-.25,.049]],.003);
        make(leg,skin,rounded,0,-.46,.009,.074,.081,.072);
      }
      make(leg,white,rounded,0,-.83,.045,male ? .083 : .072,.045,male ? .145 : .13);
      if (home.pool) leg.rotation.x = -1.25;
      legs.push(leg);
    }
    if (!male && !home.pool && index !== 4) make(body,fabric,new THREE.ConeGeometry(.33,.4,10,1,true),0,.81,0,1,1,.78);
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
    if (male) body.scale.set(1.05,1.08,1.05);
    group.position.set(home.x, home.y, home.z);
    return {info,home,group,body,arms,legs,details,label,float,floatDecor,male,
      position:new THREE.Vector3(home.x,home.y,home.z), route:WALK_ROUTES[info.id],
      waypoint:1, wait:0, heading:0, speed:0, stride:0, nearby:false};
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
  let photoIds: string[]=[];
  let photoPose: PoseId = 'wave';
  let pair: string | null = null;
  function update(dt:number, player:THREE.Vector3, photo:boolean, detailedBudget = 3, presentationFacing = 0) {
    const step = Math.min(Math.max(dt,0),.1);
    clock+=step;
    for (let i=0;i<people.length;i++) {
      const person=people[i];
      const distance=Math.hypot(person.position.x-player.x,person.position.z-player.z);
      person.nearby=distance<3.3 && Math.abs(person.position.y-player.y)<2;
      person.speed=0;
      // Keep the route cursor and its position while invited to talk or pose.
      // Removing the invitation resumes the same leg, without walking home.
      if (photoIds.includes(person.info.id)) continue;
      if (person.nearby) {
        person.heading=Math.atan2(player.x-person.position.x,player.z-person.position.z);
        continue;
      }
      if (!person.route) continue;
      if (person.wait>0) {person.wait=Math.max(0,person.wait-step);continue;}
      const target=person.route[person.waypoint];
      const dx=target[0]-person.position.x, dz=target[1]-person.position.z;
      const remaining=Math.hypot(dx,dz), speed=person.male?1.25:1.05+i*.035;
      const travel=Math.min(remaining,speed*step);
      if (remaining>.001 && step>0) {
        person.position.x+=dx/remaining*travel;person.position.z+=dz/remaining*travel;
        person.speed=travel/step;person.stride+=travel*5.7;
        const heading=Math.atan2(dx,dz);
        person.heading+=Math.atan2(Math.sin(heading-person.heading),Math.cos(heading-person.heading))*(1-Math.exp(-step*10));
      }
      if (remaining<=travel+.001) {
        person.waypoint=(person.waypoint+1)%person.route.length;
        person.wait=1.2+(i%3)*.55;
      }
    }
    const ranked=people.filter(person => !person.male).sort((a,b)=> {
      const selectedA=photo && photoIds.includes(a.info.id), selectedB=photo && photoIds.includes(b.info.id);
      return Number(selectedB)-Number(selectedA) || Math.hypot(a.position.x-player.x,a.position.z-player.z)-Math.hypot(b.position.x-player.x,b.position.z-player.z);
    });
    const count = Math.max(detailedBudget === 1 ? 1 : 3, photo ? photoIds.filter(id => id !== 'pet' && id !== 'ken').length : 0);
    while(slots.length < count) slots.push(createDetailSlot());
    const detailed=new Set(ranked.slice(0,count));
    for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
      const slot = slots[slotIndex], person = ranked[slotIndex];
      if(slotIndex >= count) {slot.avatar.group.visible = false;continue;}
      const index = people.indexOf(person), chosen = photo && photoIds.includes(person.info.id);
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
      const paired = chosen && !!pair && photoIds.find(id=>id!=='pet')===person.info.id;
      slot.avatar.group.scale.x = paired && pair !== 'hug' ? -1 : 1;
      slot.avatar.group.position.set(0, person.home.pool && !chosen ? -.82 : 0, 0);
      slot.avatar.setPose(chosen ? (pair && photoIds.find(id=>id!=='pet')===person.info.id ? pair as PoseId : photoPose) : person.nearby && !person.home.pool && (clock+index)%8<2.2 ? 'wave' : 'idle');
      slot.avatar.update(dt, {moving:!chosen&&person.speed>0,speed:person.speed,grounded:true,dancing:false,sitting:person.home.pool&&!chosen});
    }
    for (let i=0;i<people.length;i++) {
      const person=people[i], chosen=photo && photoIds.includes(person.info.id);
      const {group,home}=person;
      const groupIndex = photoIds.indexOf(person.info.id);
      const primary = photoIds.find(id=>id!=='pet');
      const offset = pair ? person.info.id === primary ? -1 : 1 : groupIndex === 0 ? 1 : -1;
      const paired = chosen && !!pair && photoIds.find(id=>id!=='pet')===person.info.id;
      const localX=offset*(paired ? .62 : .92), localZ=paired ? -.04 : .05;
      const cosine=Math.cos(presentationFacing), sine=Math.sin(presentationFacing);
      // Match the raised runway deck if a resident ever occupies its footprint.
      if(!home.pool)person.position.y=person.position.x>-51.7&&person.position.x< -40.3&&person.position.z>17.8&&person.position.z<26.2?1.22:home.y;
      group.position.set(chosen?player.x+cosine*localX+sine*localZ:person.position.x,chosen?player.y:person.position.y,chosen?player.z-sine*localX+cosine*localZ:person.position.z);
      group.rotation.y=chosen?presentationFacing+(paired && pair === 'hug' ? Math.PI/2 : -.1):home.pool?Math.sin(clock*.25+i)*.2:person.heading;
      const distance=group.position.distanceTo(player);
      group.visible=chosen || distance<45;
      person.body.visible=!detailed.has(person);
      person.details.visible=person.male && (chosen || distance<10);
      person.label.visible=!photo && distance<15;
      if (!group.visible) continue;
      // A photo companion stands beside the doll even if normally floating.
      if(person.male) person.body.scale.x = paired && pair !== 'hug' ? -1.05 : 1.05;
      person.body.position.y=chosen?0:home.pool?-.82:person.speed>0?Math.abs(Math.sin(person.stride))*.025:Math.sin(clock*1.5+i)*.012;
      person.floatDecor.visible=!chosen;
      person.legs.forEach((leg,index)=>{leg.rotation.x=home.pool&&!chosen?-1.25:!chosen&&person.speed>0?Math.sin(person.stride+index*Math.PI)*.4:0;leg.rotation.z=0;});
      if(home.pool && !chosen) {group.position.y+=Math.sin(clock*1.3+i)*.07;group.rotation.z=Math.sin(clock*.9+i)*.035;}
      else group.rotation.z=0;
      person.arms[0].rotation.z=.1+Math.sin(clock*1.6+i)*.04;
      person.arms[1].rotation.z=chosen?-.8:-.1-Math.sin(clock*1.6+i)*.04;
      person.arms[0].rotation.x=!chosen&&person.speed>0?-Math.sin(person.stride)*.3:0;
      person.arms[1].rotation.x=chosen?-1.2:home.pool?-.5:person.speed>0?Math.sin(person.stride)*.3:0;
      if (!chosen && !home.pool && person.nearby && (clock+i)%8<2.2) person.arms[1].rotation.set(-.6,0,-2.3-Math.sin(clock*4)*.12);
      if (person.male && chosen) {
        const selectedPose=paired ? pair : photoPose;
        person.legs.forEach(leg=>{leg.rotation.z=0;});
        if (selectedPose==='wave' || selectedPose==='peace' || selectedPose==='salute') {person.arms[1].rotation.set(-.6,0,-2.3-Math.sin(clock*4)*.1);}
        else if (selectedPose==='half-heart') {person.arms[0].rotation.set(-.2,0,2.5);person.arms[1].rotation.set(0,0,-.45);}
        else if (selectedPose==='heart') {person.arms[0].rotation.set(-.2,0,2.45);person.arms[1].rotation.set(-.2,0,-2.45);}
        else if (selectedPose==='hug') {person.arms[0].rotation.set(-1.25,0,.7);person.arms[1].rotation.set(-1.25,0,-.7);}
        else if (selectedPose==='arm-around') {person.arms[0].rotation.set(-.3,0,1.5);person.arms[1].rotation.set(0,0,-.12);}
        else if (selectedPose==='kiss') person.arms[1].rotation.set(-1.9,0,-.35);
        else if (selectedPose==='curtsy') {person.legs[1].rotation.x=.35;person.arms[0].rotation.set(0,0,.45);person.arms[1].rotation.set(0,0,-.45);}
        else if (selectedPose==='jump') {person.body.position.y=Math.max(0,Math.sin(clock*3))*.2;person.arms[0].rotation.set(-.2,0,2.5);person.arms[1].rotation.set(-.2,0,-2.5);}
        else if (selectedPose==='dance' || selectedPose==='spin') {person.arms[0].rotation.set(-.4,0,.9+Math.sin(clock*3)*.3);person.arms[1].rotation.set(-.6,0,-.9);person.legs[0].rotation.z=.12;}
        else {person.arms[0].rotation.set(0,0,.1);person.arms[1].rotation.set(0,0,-.1);}
      }
    }
  }
  return {
    root, update,
    setPhotoGroup(ids:string[], pose:PoseId | 'idle' = 'wave', paired:string | null = null) {photoIds=[...new Set(ids.filter(id=>id==='pet'||RESIDENTS.some(person=>person.id===id)))].slice(0,2);photoPose=pose;pair=['hug','arm-around','half-heart'].includes(paired ?? '')?paired:null;},
    setPhotoCompanion(id:string|null) {photoIds=RESIDENTS.some(person=>person.id===id)?[id!]:[];photoPose='wave';pair=null;},
    nearest(x:number,y:number,z:number) {
      let best:typeof people[number]|null=null, distance=2.7;
      for(const person of people) {
        if(Math.abs(person.group.position.y-y)>2) continue;
        const d=Math.hypot(x-person.group.position.x,z-person.group.position.z);
        if(d<distance){best=person;distance=d;}
      }
      return best?.info ?? null;
    },
    dispose(){textures.forEach(texture=>texture.dispose());},
  };
}
