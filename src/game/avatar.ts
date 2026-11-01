import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { AccessoryId, HairId, OutfitId, ShoesId, VehicleId } from '@/game/types';
import { PALETTE } from '@/game/palette';
import type { BottomId, Look, PoseId, TopId } from '@/game/lifestyle-types';
import { DEFAULT_LOOK, presetLook, MAKEUP_LOOKS } from '@/game/fashion';
import { createGarmentRig } from '@/game/character/garment-rig';
import { createHairRig } from '@/game/character/hair-rig';
import { createFace } from '@/game/character/face';
import { applyCharacterSurface } from '@/game/character/surfaces';
import { createTrouserRig } from '@/game/character/trouser-rig';
import { createNecklaceRig } from '@/game/character/necklace-rig';
import { createLimbSkin } from '@/game/character/limb-rig';
import { RIDING, solveLimb } from '@/game/character/riding';
import { createBodyRig, type BodyRig, type HandSide } from '@/game/character/body-rig';
import { createHandRig } from '@/game/character/hand-rig';
import { createBootRig } from '@/game/character/boot-rig';
import { createMotionController } from '@/game/character/motion-controller';
import { createSurfaceMap, conformToSurface, type SurfaceMap } from '@/game/character/surface-map';

export type AvatarMotion = { moving: boolean; speed: number; grounded: boolean; dancing: boolean; sitting: boolean; vehicle?:VehicleId|null };
export type Avatar = {
  group: THREE.Group;
  rig: BodyRig;
  setOutfit(id: OutfitId): void;
  setLook(look: Look): void;
  setPose(pose: PoseId): void;
  setHair(id: HairId): void;
  setAccessory(id: AccessoryId): void;
  setShoes(id: ShoesId): void;
  celebrate(): void;
  attachHeldObject(object:THREE.Object3D,side?:HandSide):()=>void;
  setCarry(mode:'none'|'one-hand'|'two-hand'):void;
  playAction(action:'swing'):boolean;
  getActionState():{active:boolean;progress:number;carry:'none'|'one-hand'|'two-hand'};
  update(dt: number, motion: AvatarMotion): void;
};

type Mat = THREE.MeshStandardMaterial;
type Point = [number, number, number];
type Profile = Array<[number, number]>;
const mat = (color: number, roughness = .55, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
function add(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: Mat, pos: Point = [0, 0, 0], scale: Point = [1, 1, 1]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...pos); mesh.scale.set(...scale);
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function oval(parent: THREE.Object3D, material: Mat, pos: Point, scale: Point, segments = 14) {
  return add(parent, new THREE.SphereGeometry(1, segments, 8), material, pos, scale);
}
function profile(parent: THREE.Object3D, material: Mat, points: Profile, depth = .7, pleats = 0, pleatTop = 0) {
  // Lathe winding travels upwards, including when the author lists a neckline first.
  const ordered = points[0][1] > points[points.length - 1][1] ? [...points].reverse() : points;
  const geo = new THREE.LatheGeometry(ordered.map(([r, y]) => new THREE.Vector2(r, y)), pleats ? 64 : 28);
  if (pleats) {
    const v = geo.getAttribute('position');
    const low = Math.min(...points.map(p => p[1])), high = Math.max(...points.map(p => p[1]));
    for (let i = 0; i < v.count; i++) {
      const x = v.getX(i), y = v.getY(i), z = v.getZ(i);
      const r = 1 + Math.sin(Math.atan2(x, z) * 16) * pleats * (pleatTop + (1 - pleatTop) * (1 - (y - low) / (high - low)));
      v.setXYZ(i, x * r, y, z * r);
    }
    geo.computeVertexNormals();
  }
  return add(parent, geo, material, [0, 0, 0], [1, 1, depth]);
}
function line(parent: THREE.Object3D, material: Mat, points: Point[], radius: number, segments = 10) {
  return add(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), segments, radius, 5, false), material);
}
function joint(parent: THREE.Object3D, name: string, x = 0, y = 0, z = 0) {
  const node = new THREE.Group(); node.name = name; node.position.set(x, y, z); parent.add(node); return node;
}
function bone(parent:THREE.Object3D,name:string,x=0,y=0,z=0) {
  const node=new THREE.Bone();node.name=name;node.position.set(x,y,z);parent.add(node);return node;
}
function ring(parent: THREE.Object3D, material: Mat, radius: number, width: number, pos: Point, depth = 1) {
  const mesh = add(parent, new THREE.TorusGeometry(radius, width, 5, 20), material, pos, [1, depth, 1]);
  mesh.rotation.x = Math.PI / 2; return mesh;
}
// Decorations share draw calls by material within each rigid node; joints remain independent.
function batch(node: THREE.Object3D) {
  for (const child of [...node.children]) if (!(child instanceof THREE.Mesh)) batch(child);
  const buckets = new Map<Mat, THREE.Mesh[]>();
  for (const child of node.children) if (child instanceof THREE.Mesh && !(child instanceof THREE.SkinnedMesh) && !Array.isArray(child.material)) {
    const material = child.material as Mat, list = buckets.get(material) ?? [];
    list.push(child); buckets.set(material, list);
  }
  for (const [material, parts] of buckets) {
    if (parts.length < 2) continue;
    const geos = parts.map(part => {
      part.updateMatrix(); const g = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone();
      return g.applyMatrix4(part.matrix);
    });
    const merged = mergeGeometries(geos, false); geos.forEach(g => g.dispose());
    if (!merged) continue;
    for (const part of parts) { node.remove(part); part.geometry.dispose(); }
    const mesh=add(node, merged, material);
    if(parts[0].name&&parts.every(part=>part.name===parts[0].name))mesh.name=parts[0].name;
  }
}

/** Stylised doll with articulated limbs, weighted garments/hair and an expressive facial rig. */
export function createAvatar(): Avatar {
  const group = new THREE.Group(); group.name = 'Dreamland fashion doll';
  const skin = mat(0xffd4b9, .67), shade = mat(0xeaa88f, .75), ivory = mat(0xfffaf3, .45);
  const ink = mat(0x302435, .6), lips = mat(0xe84a82, .4), blush = mat(0xf4a395, .8);
  const gold = mat(0xf6c35e, .28, .65), pink = mat(PALETTE.magenta, .4, .12), pale = mat(0xffb3d6, .65);
  const denim = mat(0x658fda, .83), aqua = mat(0x53dbe4, .46, .1), lilac = mat(0xb898f0, .48, .16);
  const pelvis = bone(group, 'pelvis', 0, 1.015), spine = bone(pelvis, 'waist');
  profile(pelvis, skin, [[0, -.115], [.14, -.115], [.185, -.055], [.172, .035], [.139, .095], [0, .095]]);
  profile(spine, skin, [[0, .025], [.142, .025], [.132, .12], [.151, .23], [.194, .32], [.204, .37], [.15, .415], [.075, .44], [0, .44]], .68);
  profile(spine, skin, [[0, .415], [.067, .415], [.055, .5], [.065, .54], [0, .54]], .88);
  const neck=bone(spine,'neck',0,.49),head = bone(neck, 'head', 0, .175);
  head.scale.setScalar(.92);
  const face = new THREE.SphereGeometry(1, 40, 28), fv = face.getAttribute('position');
  for (let i = 0; i < fv.count; i++) { const y = fv.getY(i); if (y < -.12) fv.setX(i, fv.getX(i) * (1 + (y + .12) * .23)); }
  face.computeVertexNormals(); add(head, face, skin, [0, 0, 0], [.186, .232, .161]);
  const earrings: THREE.Group[] = [];
  const eyeshadow=mat(0xc98cab,.64,.08);
  for(const side of [-1,1]) {
    oval(head, skin, [side*.181,-.015,-.005],[.035,.052,.025],16);
    oval(head, shade, [side*.194,-.018,.012],[.014,.03,.009],12);
    const earring=joint(head,'earring',side*.193,-.055,.012);earrings.push(earring);
    const hoop=add(earring,new THREE.TorusGeometry(.026,.005,5,12),gold,[0,-.025,0]);hoop.scale.y=1.25;
    oval(earring,ivory,[0,0,0],[.009,.009,.009],8);
  }

  const legs: Array<{ hip: THREE.Bone; knee: THREE.Bone; ankle: THREE.Bone }> = [];
  const arms: Array<{ shoulder: THREE.Bone; elbow: THREE.Bone; wrist: THREE.Bone }> = [];
  const shoes: Record<ShoesId, THREE.Group[]> = { heels: [], sneakers: [], boots: [], sandals: [], platforms: [] };
  const bottomMaterials = Object.fromEntries(['gown','wrap','pleated','shorts','palazzo','tennis','denim-skirt','satin-mini'].map(id => [id, mat(0xec4899, id === 'shorts' || id === 'denim-skirt' ? .83 : .5)])) as Record<BottomId,Mat>;
  const bangles:THREE.Group[]=[];
  
  for (const side of [-1, 1]) {
    const hip = bone(pelvis, side < 0 ? 'hip.L' : 'hip.R', side * .108, -.025);
    profile(hip, skin, [[0, .025], [.077, .015], [.083, -.10], [.065, -.29], [.048, -.425], [0, -.445]], .86);
    const knee = bone(hip, 'knee', 0, -.425);
    oval(knee, skin, [0, 0, 0], [.048, .04, .046], 12);
    profile(knee, skin, [[0, .01], [.047, .01], [.062, -.11], [.044, -.24], [.032, -.39], [0, -.40]], .88);
    const ankle = bone(knee, 'ankle', 0, -.397); legs.push({ hip, knee, ankle });
    for (const id of ['heels', 'sneakers', 'sandals', 'platforms'] as ShoesId[]) {
      const shoe = joint(ankle, id); shoes[id].push(shoe);
      if (id === 'heels') {
        oval(shoe, pink, [0, -.047, .047], [.057, .041, .116], 14);
        add(shoe, new THREE.CylinderGeometry(.015, .011, .065, 8), gold, [0, -.066, -.033]);
        ring(shoe, gold, .036, .006, [0, .015, 0], .95);
        line(shoe, gold, [[-.043, -.018, .08], [0, -.001, .102], [.043, -.018, .08]], .006, 8);
      } else if (id === 'sneakers') {
        oval(shoe, ivory, [0, -.043, .04], [.066, .047, .12], 14);
        oval(shoe, pale, [0, -.075, .042], [.067, .014, .118], 14);
        for (let lace = 0; lace < 3; lace++) line(shoe, pink,
          [[-.028, -.002 - lace * .004, .03 + lace * .023], [.028, -.002 - lace * .004, .03 + lace * .023]], .004, 2);
      } else {
        oval(shoe, id === 'platforms' ? lilac : gold, [0,-.058,.045],[.062,id === 'platforms' ? .048 : .017,.12],14);
        for (const z of [.025,.095]) line(shoe,id === 'platforms' ? pale : gold,[[-.05,-.025,z],[0,.0,z+.012],[.05,-.025,z]],.009,7);
        ring(shoe,gold,.037,.006,[0,.01,0]);
      }
    }
    const shoulder = bone(spine, side < 0 ? 'shoulder.L' : 'shoulder.R', side * .212, .368);
    oval(shoulder, skin, [0, -.015, 0], [.058, .067, .056], 14);
    profile(shoulder, skin, [[0, .015], [.054, 0], [.052, -.105], [.039, -.255], [0, -.28]], .95);
    const elbow = bone(shoulder, 'elbow', 0, -.27);
    oval(elbow, skin, [0, 0, 0], [.04, .04, .039], 12);
    profile(elbow, skin, [[0, .012], [.039, .005], [.043, -.07], [.026, -.235], [0, -.25]], .88);
    const wrist = bone(elbow, 'wrist', 0, -.245);
    ring(wrist, gold, .028, .006, [0, 0, 0], .85);
    const bracelet=joint(wrist,'rainbow bangles');bangles.push(bracelet);
    for(let i=0;i<3;i++)ring(bracelet,[aqua,pale,lilac][i],.031,.006,[0,.012+i*.014,0],.88);
    arms.push({ shoulder, elbow, wrist });
  }

  const hairSways: THREE.Group[] = [];
  function hairLock(parent: THREE.Object3D, material: Mat, points: Point[], width: number) {
    if(material.name==='hair fine highlights')width*=.52;
    const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const geo = new THREE.TubeGeometry(path, 12, width, 6, false), v = geo.getAttribute('position');
    for (let i = 0; i <= 12; i++) {
      const center = path.getPointAt(i / 12);
      const taper = (.22 + .78 * Math.min(1, i / 2)) * (.94 - Math.pow(i / 12, 3) * .85);
      for (let j = 0; j <= 6; j++) {
        const k = i * 7 + j, point = new THREE.Vector3().fromBufferAttribute(v, k).sub(center).multiplyScalar(taper).add(center);
        v.setXYZ(k, point.x, point.y, point.z);
      }
    }
    geo.computeVertexNormals(); add(parent, geo, material);
  }
  const hairMaterials={} as Record<HairId,{base:Mat;highlight:Mat;natural:number}>;
  function makeHair(color: number, style: HairId) {
    const holder = joint(head, `hair ${style}`), base = mat(color, .48, .04);
    const highlight = mat(new THREE.Color(color).lerp(new THREE.Color(0xfff2d8), .09).getHex(), .44, .06);
    highlight.name='hair fine highlights';
    hairMaterials[style]={base,highlight,natural:color};
    oval(holder, base, [0, .015, -.086], [.2, .22, .099], 20);
    const cap=new THREE.SphereGeometry(1,32,16,0,Math.PI*2,0,Math.PI*.46),capVertices=cap.attributes.position;
    for(let i=0;i<capVertices.count;i++) {
      const y=capVertices.getY(i),front=THREE.MathUtils.smoothstep(capVertices.getZ(i),.1,.9);
      if(y<.52)capVertices.setY(i,y+front*.28*THREE.MathUtils.clamp((.52-y)/.395,0,1));
    }
    cap.computeVertexNormals();add(holder,cap,base,[0,.026,-.007],[.203,.231,.179]);
    for (let i = 0; i < 4; i++) {
      const offset = i * .021;
      hairLock(holder, i % 2 ? highlight : base,
        [[-.05 + offset, .247, -.01], [.065 + offset, .203, .11], [.155 + offset * .35, .093, .115], [.183, -.015 - offset, .04]], .032);
    }
    const sway = joint(holder, 'hair secondary motion', 0, .05, -.1); hairSways.push(sway);
    // Continuous hair masses give the locks a smooth, full silhouette between the detailed strands.
    if(['blonde','straight','curls','bob'].includes(style)) {
      const length=style==='bob'?.20:style==='curls'?.31:.37;
      oval(sway,base,[0,-length*.62,-.047],[style==='curls'?.216:.196,length,.115],24);
      for(const side of [-1,1])oval(sway,base,[side*.173,-length*.53,.015],[.052,length*.88,.085],18);
    }
    if (style === 'straight') {
      for(let i=0;i<11;i++) {
        const x=(i-5)*.034;
        hairLock(sway,i%3===0?highlight:base,[[x,.105,-.04],[x*1.06,-.16,-.13],[x*1.1,-.43,-.09],[x*1.04,-.58+Math.abs(x)*.25,-.035]],.033);
      }
      for(const side of [-1,1])hairLock(sway,highlight,[[side*.17,.07,.10],[side*.19,-.19,.112],[side*.18,-.43,.10]],.022);
    } else if(style==='braids') {
      for(const side of [-1,1]) {
        oval(sway,base,[side*.16,-.08,-.02],[.058,.22,.065],18);
        for(let strand=0;strand<3;strand++) {
          const points:Point[]=[];
          for(let j=0;j<16;j++){const a=j*.95+strand*Math.PI*2/3;points.push([side*(.16+j*.002)+Math.sin(a)*.024,.1-j*.037,Math.cos(a)*.024+.018]);}
          hairLock(sway,strand===0?highlight:base,points,.025);
        }
        ring(sway,pale,.038,.012,[side*.19,-.405,.018]);
      }
    } else if(style==='twin-buns') {
      for(const side of [-1,1]) {
        oval(holder,base,[side*.163,.225,-.09],[.112,.106,.096],22);
        for(let j=0;j<3;j++) {
          const coil=add(holder,new THREE.TorusGeometry(.079-j*.014,.008,6,22),highlight,[side*.163,.224,-.02-j*.006]);coil.scale.y=.87;
        }
        hairLock(sway,base,[[side*.17,.06,.09],[side*.19,-.12,.10],[side*.155,-.25,.14]],.022);
      }
    } else if(style==='pixie') {
      for(let i=0;i<6;i++) {
        const x=(i-2.5)*.045;
        hairLock(holder,i%2?base:highlight,[[x,.21,-.07],[x-.055,.195,.06],[x-.07,.11-Math.abs(x)*.2,.145]],.035);
      }
      for(const side of [-1,1])hairLock(holder,base,[[side*.17,.13,.025],[side*.19,.02,.05],[side*.176,-.08,.04]],.026);
    } else if (style === 'blonde') {
      for (let i = 0; i < 7; i++) {
        const x = (i - 3) * .053;
        hairLock(sway, i % 3 === 0 ? highlight : base,
          [[x, .11, -.005], [x * 1.18, -.13, -.065], [x * 1.18 + Math.sin(i) * .018, -.38, -.04], [x * .97, -.53 + Math.abs(x) * .25, .018]], .047);
      }
      for (const side of [-1, 1]) hairLock(sway, base,
        [[side * .174, .055, .06], [side * .207, -.17, .09], [side * .208, -.34, .115], [side * .17, -.44, .09]], .039);
    } else if (style === 'pink') {
      oval(holder, base, [0, .21, -.115], [.099, .093, .075], 16); ring(holder, gold, .071, .013, [0, .18, -.16]);
      for (let i = 0; i < 5; i++) hairLock(sway, i % 2 ? highlight : base,
        [[(i - 2) * .023, .17, -.04], [(i - 2) * .035, .08, -.17], [(i - 2) * .037, -.21, -.22], [(i - 2) * .025 + .06, -.40, -.15]], .039);
    } else if (style === 'bob') {
      for (let i=0;i<9;i++) {
        const a=(i/8)*Math.PI*1.5+Math.PI*.25;
        const x=Math.sin(a)*.18,z=-Math.cos(a)*.13-.035;
        hairLock(sway,i%3===0?highlight:base,[[x,.1,z],[x*1.1,-.08,z],[x*1.02,-.245,z+.018]],.047);
      }
    } else if (style === 'curls') {
      for (let i=0;i<9;i++) {
        const a=(i/8)*Math.PI*1.55+Math.PI*.225;
        const x=Math.sin(a)*.17,z=-Math.cos(a)*.13-.04;
        const points:Point[]=[];
        for(let j=0;j<10;j++) points.push([x+Math.sin(j*1.65+i)*.027,.11-j*.052,z+Math.cos(j*1.65+i)*.022]);
        hairLock(sway,i%3===0?highlight:base,points,.039);
      }
    } else {
      oval(holder, base, [0, .26, -.06], [.123, .115, .104], 18);
      for (let i = 0; i < 3; i++) {
        const band = add(holder, new THREE.TorusGeometry(.095 - i * .014, .009, 5, 18), highlight, [0, .245 + i * .031, -.035]); band.rotation.x = Math.PI / 2 + .2;
      }
      for (const side of [-1, 1]) hairLock(sway, base,
        [[side * .17, .045, .07], [side * .19, -.08, .09], [side * .18, -.18, .1]], .018);
    }
    return holder;
  }
  const hairs: Record<HairId, THREE.Group> = { blonde: makeHair(0xeec86b, 'blonde'), pink: makeHair(0xf378b7, 'pink'), updo: makeHair(0x69412f, 'updo'), bob: makeHair(0x412a39, 'bob'), curls: makeHair(0x9c5837, 'curls'), braids:makeHair(0x69412f,'braids'), pixie:makeHair(0x412a39,'pixie'), 'twin-buns':makeHair(0xb69ae4,'twin-buns'), straight:makeHair(0xeec86b,'straight') };
  const sunglasses = joint(head, 'sunglasses'), lensMat = mat(0x59355c, .24, .2);
  for (const side of [-1, 1]) {
    oval(sunglasses, gold, [side * .077, .035, .172], [.067, .047, .014], 16).rotation.z = side * .12;
    oval(sunglasses, lensMat, [side * .077, .035, .183], [.056, .037, .012], 16).rotation.z = side * .12;
    line(sunglasses, gold, [[side * .13, .04, .17], [side * .192, .03, .07], [side * .19, .015, -.025]], .006, 8);
  }
  line(sunglasses, gold, [[-.018, .041, .183], [0, .047, .189], [.018, .041, .183]], .006, 5);
  const tiara = joint(head, 'tiara');
  line(tiara, gold, [[-.17, .15, .055], [-.1, .178, .136], [0, .19, .173], [.1, .178, .136], [.17, .15, .055]], .01, 16);
  for (let i = -2; i <= 2; i++) {
    const y = .218 + (2 - Math.abs(i)) * .027;
    line(tiara, gold, [[i * .05 - .021, .18, .153], [i * .05, y, .153], [i * .05 + .021, .18, .153]], .006, 5);
    add(tiara, new THREE.OctahedronGeometry(i === 0 ? .023 : .014), i === 0 ? pink : ivory, [i * .05, y, .153]);
  }

  const hairBow = joint(head,'silk hair bow',-.16,.17,-.07);
  for(const side of [-1,1]) oval(hairBow,pale,[side*.043,0,0],[.052,.034,.018],12).rotation.z=side*.3;
  oval(hairBow,gold,[0,0,.009],[.014,.018,.012],10);
  for(const side of [-1,1]) line(hairBow,pale,[[side*.01,-.02,0],[side*.035,-.08,.01],[side*.055,-.11,.025]],.012,6);

  const roundShades=joint(head,'round sun lenses'), starShades=joint(head,'starlet shades');
  for(const side of [-1,1]) {
    const rim=add(roundShades,new THREE.TorusGeometry(.055,.007,7,24),gold,[side*.073,.035,.184]);rim.scale.y=.98;
    oval(roundShades,aqua,[side*.073,.035,.183],[.050,.050,.009],20);
    const star=new THREE.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,r=i%2?.035:.068;if(i===0)star.moveTo(Math.cos(a)*r,Math.sin(a)*r);else star.lineTo(Math.cos(a)*r,Math.sin(a)*r);}star.closePath();
    const starGeo=new THREE.ExtrudeGeometry(star,{depth:.006,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.003,bevelThickness:.002});
    add(starShades,starGeo,lilac,[side*.077,.035,.183]);
    oval(starShades,lensMat,[side*.077,.035,.192],[.032,.032,.006],16);
    for(const glasses of [roundShades,starShades])line(glasses,gold,[[side*.125,.04,.18],[side*.19,.03,.07],[side*.19,.015,-.025]],.006,8);
  }
  for(const glasses of [roundShades,starShades])line(glasses,gold,[[-.02,.038,.19],[0,.045,.194],[.02,.038,.19]],.006,5);
  const straw=mat(0xefd29a,.87), sunhat=joint(head,'Riviera sunhat',0,.185,-.012);
  oval(sunhat,straw,[0,.035,0],[.225,.13,.208],24);
  oval(sunhat,straw,[0,-.024,0],[.35,.022,.30],28);
  ring(sunhat,pale,.218,.018,[0,.012,0],.91);
  for(let i=0;i<3;i++)ring(sunhat,gold,.26+i*.03,.0018,[0,-.017,0],.86);
  const beret=joint(head,'Parisian beret',.025,.225,-.012);
  oval(beret,pink,[0,0,0],[.244,.093,.213],24).rotation.z=-.18;
  ring(beret,pink,.185,.017,[0,-.044,0],.88);
  oval(beret,pink,[.025,.09,0],[.015,.024,.016],10);
  const headband=joint(head,'pearl headband');
  const bandPoints:Point[]=[];for(let i=0;i<=16;i++){const a=i/16*Math.PI;bandPoints.push([Math.cos(a)*.205,Math.sin(a)*.231,.025]);}
  line(headband,pale,bandPoints,.014,24);
  for(let i=1;i<12;i++){const a=i/12*Math.PI;oval(headband,ivory,[Math.cos(a)*.208,Math.sin(a)*.236,.032],[.012,.012,.012],10);}
  const choker=joint(spine,'velvet choker');ring(choker,lensMat,.071,.008,[0,.474,0],.92);
  add(choker,new THREE.OctahedronGeometry(.019),gold,[0,.469,.080]);

  const skirtPivots:THREE.Group[] = [];
  const tops = {} as Record<TopId,THREE.Group>;
  const topMaterials = {} as Record<TopId,Mat>;
  const necklaceSurfaces={} as Record<TopId,SurfaceMap>;
  const bodySkin=spine.children.filter((node):node is THREE.Mesh=>node instanceof THREE.Mesh&&node.material===skin);
  for(const id of ['glam','beach','popstar','casual','sunset','denim','sport','midnight'] as TopId[]) {
    const top=joint(spine,`top ${id}`); tops[id]=top;
    const fabric=mat(0xec4899,id==='denim'?.83:id==='midnight'?.76:.48); topMaterials[id]=fabric;
    const low=id==='beach'?.22:id==='sunset'?.16:id==='denim'?.10:.035;
    const points:Profile=[[0,low],[.146,low],[.144,Math.max(low,.14)],[.17,.26],[.207,.33],[.194,.37]];
    const bodice=profile(top,fabric,points,.74);bodice.name='bodice surface';
    const appliqueSurface=createSurfaceMap([bodice],spine);
    const fitApplique=(mesh:THREE.Mesh)=>{mesh.updateMatrix();mesh.geometry.applyMatrix4(mesh.matrix);mesh.position.set(0,0,0);mesh.quaternion.identity();mesh.scale.set(1,1,1);conformToSurface(mesh.geometry,appliqueSurface,.0008);};
    if(id==='midnight') {
      line(top,fabric,[[.14,.32,.103],[.146,.445,.025],[.145,.36,-.09]],.028,10);
      line(top,gold,[[-.19,.365,.07],[0,.338,.149],[.16,.408,.07]],.005,12);
    } else if(id==='sunset') {
      for(const side of [-1,1]) line(top,fabric,[[side*.15,.32,.09],[side*.055,.466,-.03]],.02,10);
      ring(top,gold,.148,.008,[0,.168,0],.75);
    } else {
      for(const side of [-1,1]) line(top,id==='glam'?pale:fabric,[[side*.13,.33,.106],[side*.145,.425,.03],[side*.145,.36,-.09]],id==='casual'?.022:.013,10);
    }
    if(id==='glam') {
      for(let i=0;i<5;i++) oval(top,gold,[0,.28-i*.035,.143-i*.007],[.007,.007,.005],8);
      for(const side of [-1,1]) line(top,pale,[[side*.1,.34,.123],[side*.073,.18,.123],[side*.1,.04,.10]],.003,8);
    } else if(id==='popstar') {
      const star=new THREE.Shape();
      for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,r=i%2?.023:.052;if(!i)star.moveTo(Math.cos(a)*r,Math.sin(a)*r);else star.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
      star.closePath();const applique=add(top,new THREE.ShapeGeometry(star),gold,[0,.275,.157]);applique.name='shirt star applique';fitApplique(applique);
      for(const side of [-1,1]) oval(top,fabric,[side*.199,.35,.015],[.059,.066,.12],12);
    } else if(id==='casual') {
      for(const side of [-1,1]) {const applique=line(top,pink,[[0,.16,.134],[side*.06,.22,.15],[side*.045,.245,.148],[0,.21,.147]],.009,8);applique.name='shirt heart applique';fitApplique(applique);}
    } else if(id==='denim') {
      for(const side of [-1,1]) {
        oval(top,fabric,[side*.212,.34,.01],[.064,.075,.105],12);
        line(top,ivory,[[side*.065,.41,.075],[side*.105,.30,.15],[side*.02,.33,.157],[side*.03,.10,.115]],.005,9);
        add(top,new THREE.BoxGeometry(.057,.058,.01),fabric,[side*.11,.24,.15]);
        oval(top,gold,[side*.11,.26,.162],[.006,.006,.004],8);
      }
    } else if(id==='sport') {
      for(const side of [-1,1]) {
        oval(top,fabric,[side*.207,.345,.014],[.058,.049,.11],12);
        line(top,ivory,[[side*.07,.422,.07],[side*.08,.369,.13],[0,.386,.14]],.012,7);
      }
      line(top,ivory,[[0,.39,.145],[0,.27,.157]],.005,5);
    } else if(id==='beach') {
      for(let i=0;i<4;i++) oval(top,ivory,[(i-1.5)*.05,.28,.151],[.009,.009,.004],8);
    }
    const clothes:THREE.Mesh[]=[];top.traverse(node=>{if(node instanceof THREE.Mesh)clothes.push(node);});
    necklaceSurfaces[id]=createSurfaceMap([...bodySkin,...clothes],spine);
  }
  const bottoms={} as Record<BottomId,THREE.Group>;
  for(const id of ['gown','wrap','pleated','shorts','palazzo','tennis','denim-skirt','satin-mini'] as BottomId[]) {
    const bottom=joint(pelvis,`bottom ${id}`); bottoms[id]=bottom;
    const fabric=bottomMaterials[id];
    if(id==='shorts'||id==='palazzo') continue;
    profile(bottom,fabric,[[.18,-.105],[.183,-.035],[.149,.058]],.79);
    ring(bottom,id==='denim-skirt'?ivory:gold,.15,.006,[0,.05,0],.79);
    const skirt=joint(bottom,`${id} skirt`);skirtPivots.push(skirt);
    if(id==='gown') {
      profile(skirt,fabric,[[.169,.05],[.19,-.12],[.25,-.38],[.405,-.87],[.39,-.88]],.82,.045);
      profile(skirt,pale,[[.401,-.85],[.414,-.872],[.396,-.887]],.82,.045,1);
      for(const side of [-1,1]) line(skirt,pale,[[side*.125,.04,.09],[side*.19,-.22,.13],[side*.28,-.48,.16],[side*.37,-.78,.16]],.008,14);
    } else if(id==='wrap') {
      profile(skirt,fabric,[[.18,.035],[.219,-.17],[.264,-.35]],.8,.045).rotation.z=-.12;
      line(skirt,aqua,[[-.17,.03,.03],[0,-.07,.17],[.23,-.29,.09]],.01,12);
      oval(skirt,gold,[.15,.025,.11],[.029,.025,.013],10);
    } else if(id==='pleated'||id==='tennis') {
      const hem=id==='tennis'?-.255:-.315;
      profile(skirt,fabric,[[.168,.045],[.20,-.10],[.28,hem]],.82,id==='tennis'?.065:.055);
      profile(skirt,id==='tennis'?aqua:ivory,[[.274,hem+.018],[.285,hem],[.281,hem-.009]],.82,.055,1);
    } else if(id==='denim-skirt') {
      profile(skirt,fabric,[[.17,.04],[.20,-.1],[.204,-.39]],.8);
      for(const side of [-1,1]) {
        add(skirt,new THREE.BoxGeometry(.06,.07,.012),fabric,[side*.105,-.07,.15]);
        line(skirt,ivory,[[side*.018,.025,.145],[side*.02,-.36,.165]],.003,5);
      }
      ring(skirt,ivory,.204,.005,[0,-.39,0],.8);
    } else {
      profile(skirt,fabric,[[.167,.045],[.20,-.09],[.213,-.245]],.8);
      line(skirt,gold,[[-.15,.0,.11],[-.1,-.14,.155],[0,-.21,.174],[.16,-.18,.12]],.005,10);
      for(let i=0;i<3;i++) oval(skirt,ivory,[.14,-.03-i*.055,.132],[.008,.008,.005],8);
    }
  }
  applyCharacterSurface(skin,'skin');applyCharacterSurface(shade,'skin');
  for(const [id,material] of Object.entries(topMaterials))applyCharacterSurface(material,id==='denim'?'denim':id==='casual'||id==='sport'?'cotton':'satin');
  for(const [id,material] of Object.entries(bottomMaterials))applyCharacterSurface(material,id==='denim-skirt'||id==='shorts'?'denim':id==='tennis'?'cotton':'satin');
  for(const material of Object.values(hairMaterials)){applyCharacterSurface(material.base,'hair');applyCharacterSurface(material.highlight,'hair');}
  batch(group);
  const handRigs=arms.map((arm,i)=>createHandRig(arm.wrist,i?1:-1,skin,shade));
  const bodyRig=createBodyRig({hips:pelvis,spine,neck,head,leftUpperArm:arms[0].shoulder,leftLowerArm:arms[0].elbow,leftHand:arms[0].wrist,rightUpperArm:arms[1].shoulder,rightLowerArm:arms[1].elbow,rightHand:arms[1].wrist,leftUpperLeg:legs[0].hip,leftLowerLeg:legs[0].knee,leftFoot:legs[0].ankle,rightUpperLeg:legs[1].hip,rightLowerLeg:legs[1].knee,rightFoot:legs[1].ankle},{left:handRigs[0],right:handRigs[1]});
  const limbRigs=[...arms.map(arm=>createLimbSkin(arm.shoulder,arm.elbow,skin,'arm',bodyRig.skeleton)),...legs.map(leg=>createLimbSkin(leg.hip,leg.knee,skin,'leg',bodyRig.skeleton))];
  const bootRigs=legs.map(leg=>{const rig=createBootRig(leg.knee,leg.ankle,{fabric:lilac,trim:gold,lining:ivory});shoes.boots.push(rig.root);return rig;});
  const trouserRigs=(['shorts','palazzo'] as const).map(kind=>{bottoms[kind].removeFromParent();const rig=createTrouserRig(pelvis,legs,bottomMaterials[kind],ivory,kind);bottoms[kind]=rig.root;return rig;});
  const necklaceRig=createNecklaceRig(spine,gold,pink),necklace=necklaceRig.root;
  const facialRig=createFace(head,{skin,shade,ivory,ink,lips,blush,eyeshadow});
  const garmentRigs=skirtPivots.map(skirt=>({skirt,rig:createGarmentRig(skirt)}));
  const hairRigs=hairSways.map(sway=>({sway,rig:createHairRig(sway)}));
  const controller=createMotionController();
  const state = { look: { ...DEFAULT_LOOK, accessories:[...DEFAULT_LOOK.accessories] }, pose:'idle' as PoseId, hair:'blonde' as HairId, shoes:'heels' as ShoesId, phase:0,cheer:0,clock:0,carry:'none' as 'none'|'one-hand'|'two-hand',actionElapsed:0,actionActive:false,sitting:false };
  let activeNecklaceSurface:SurfaceMap|undefined;
  function sync() {
    for(const id of Object.keys(tops) as TopId[]) tops[id].visible=id===state.look.top;
    for(const id of Object.keys(bottoms) as BottomId[]) bottoms[id].visible=id===state.look.bottom;
    for(const id of Object.keys(hairs) as HairId[]) hairs[id].visible=id===state.hair;
    for(const id of Object.keys(shoes) as ShoesId[]) for(const shoe of shoes[id]) shoe.visible=id===state.shoes;
    topMaterials[state.look.top].color.set(state.look.topColor);
    bottomMaterials[state.look.bottom].color.set(state.look.bottomColor);
    sunglasses.visible=state.look.accessories.includes('sunglasses'); tiara.visible=state.look.accessories.includes('tiara');
    necklace.visible=state.look.accessories.includes('necklace'); hairBow.visible=state.look.accessories.includes('bow');
    for(const part of earrings) part.visible=state.look.accessories.includes('earrings');
    for(const part of bangles)part.visible=state.look.accessories.includes('bracelets');
    roundShades.visible=state.look.accessories.includes('round-shades');starShades.visible=state.look.accessories.includes('star-shades');
    sunhat.visible=state.look.accessories.includes('sunhat');beret.visible=state.look.accessories.includes('beret');headband.visible=state.look.accessories.includes('headband');choker.visible=state.look.accessories.includes('choker');
    for(const [id,materials] of Object.entries(hairMaterials)) {
      const color=new THREE.Color(state.look.hairColor||materials.natural);
      materials.base.color.copy(color);materials.highlight.color.copy(color).lerp(new THREE.Color(0xfff2d8),.09);
      hairs[id as HairId].userData.color=color.getStyle();
    }
    const makeup=MAKEUP_LOOKS.find(item=>item.id===(state.look.makeup||'rose'))||MAKEUP_LOOKS[1];
    lips.color.set(makeup.lip);blush.color.set(makeup.blush);eyeshadow.color.set(makeup.shadow);
    facialRig.setLook(state.look);
    if(activeNecklaceSurface!==necklaceSurfaces[state.look.top]){activeNecklaceSurface=necklaceSurfaces[state.look.top];necklaceRig.setSurface(activeNecklaceSurface);}
  }
  function setLook(look:Look) {
    if(!tops[look.top]||!bottoms[look.bottom]) return;
    state.look={...look,accessories:[...look.accessories]};sync();
  }
  sync();
  let activeBottom:BottomId|null=null;
  return {
    group, rig:bodyRig,setLook,
    setPose(pose) {state.pose=pose;},
    setOutfit(id) {setLook(presetLook(id,state.look));}, setHair(id) {if(hairs[id]){for(const item of hairRigs)item.rig.reset();state.hair=id;sync();}},
    setAccessory(id) {state.look.accessories=state.look.accessories.filter(a=>a!=='tiara'&&a!=='sunglasses');if(id!=='none')state.look.accessories.push(id);sync();},
    setShoes(id) {state.shoes=id;sync();},
    celebrate() { state.cheer = 1.5; },
    attachHeldObject(object,side='right'){return bodyRig.attach(object,side);},
    setCarry(mode){state.carry=mode==='one-hand'||mode==='two-hand'?mode:'none';},
    playAction(action){if(action!=='swing'||state.sitting||state.actionActive)return false;state.actionElapsed=0;state.actionActive=true;return true;},
    getActionState(){return {active:state.actionActive,progress:Math.min(1,state.actionElapsed/1.05),carry:state.carry};},
    update(dt, motion) {
      const step=Number.isFinite(dt)?THREE.MathUtils.clamp(dt,0,.05):0;
      state.clock+=step;state.cheer=Math.max(0,state.cheer-step);state.sitting=motion.sitting;
      if(motion.sitting){state.actionActive=false;state.actionElapsed=0;}
      else if(state.actionActive){state.actionElapsed=Math.min(1.05,state.actionElapsed+step);if(state.actionElapsed>=1.05)state.actionActive=false;}
      const soleHeight={heels:.099,sneakers:.09,sandals:.075,platforms:.106,boots:.094}[state.shoes];
      const frame=controller.update(step,{...motion,pose:state.pose,dancing:motion.dancing||state.cheer>0,heading:group.rotation.y,soleHeight,armSpace:['gown','pleated','tennis','wrap'].includes(state.look.bottom)?.045:0,carry:state.actionActive&&state.carry==='none'?'one-hand':state.carry,swing:state.actionActive?state.actionElapsed/1.05:null});
      state.phase=frame.phase;pelvis.position.y=frame.pelvisY;neck.rotation.set(0,0,0);
      // The controller already blends actions. A second joint filter would drag solved feet.
      for(const [key,rotation] of Object.entries(frame.rotations)) {
        const node=key==='pelvis'?pelvis:key==='waist'?spine:bodyRig.bones[key as keyof typeof bodyRig.bones];
        node.rotation.set(...rotation);
      }
      if(motion.sitting&&motion.vehicle) {
        const ride=RIDING[motion.vehicle];
        pelvis.position.y=1.015;pelvis.rotation.set(0,0,0);spine.rotation.set(ride.lean,0,0);head.rotation.set(-ride.lean*.6,0,0);
        const inverseSpine=new THREE.Matrix4().makeRotationX(-ride.lean);
        for(let i=0;i<2;i++) {
          const side=i?1:-1;
          const hand=new THREE.Vector3(...ride.hands[i]).sub(new THREE.Vector3(0,ride.rootY+1.015,ride.rootZ)).applyMatrix4(inverseSpine);
          const handDirection=new THREE.Vector3(0,0,1).applyMatrix4(inverseSpine);
          const handQs=solveLimb(arms[i].shoulder.position,hand,new THREE.Vector3(side*.7,-.3,0),.27,.245,handDirection);
          const foot=new THREE.Vector3(...ride.feet[i]).sub(new THREE.Vector3(0,ride.rootY+1.015,ride.rootZ));
          const legQs=solveLimb(legs[i].hip.position,foot,new THREE.Vector3(side*.08,0,1),.425,.397,new THREE.Vector3(0,-1,0));
          for(const [nodes,rotations] of [[[arms[i].shoulder,arms[i].elbow,arms[i].wrist],handQs],[[legs[i].hip,legs[i].knee,legs[i].ankle],legQs]] as const)nodes.forEach((node,j)=>node.quaternion.copy(rotations[j]));
        }
      }
      handRigs.forEach((hand,i)=>{hand.setGesture(motion.sitting&&motion.vehicle?'grip':frame.hands[i?'right':'left']);hand.update(step);});
      for(const earring of earrings)earring.rotation.set(Math.sin(state.clock*2.1+.3)*.035,0,Math.sin(state.clock*1.7-.4)*(motion.dancing?.10:.025));
      facialRig.update(step,motion.moving||motion.sitting?'idle':state.pose,motion.moving);
      for(const limb of limbRigs)limb.update();
      for(const boot of bootRigs)if(boot.root.visible)boot.update();
      for(const trousers of trouserRigs)if(trousers.root.visible)trousers.update();
      if(necklace.visible)necklaceRig.update(step,{...motion,phase:state.phase});
      for(const item of garmentRigs)if(item.skirt.parent?.visible)item.rig.update(step,{...motion,pose:!motion.moving&&!motion.sitting?state.pose:'idle',phase:state.phase},activeBottom!==state.look.bottom);
      activeBottom=state.look.bottom;
      for(const item of hairRigs)if(item.sway.parent?.visible)item.rig.update(step,{...motion,phase:state.phase});

    },
  };
}
