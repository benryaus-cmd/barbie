import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { AccessoryId, HairId, OutfitId, ShoesId } from '@/game/types';
import { PALETTE } from '@/game/palette';
import type { BottomId, Look, PoseId, TopId } from '@/game/lifestyle-types';
import { DEFAULT_LOOK, presetLook } from '@/game/fashion';

export type AvatarMotion = { moving: boolean; speed: number; grounded: boolean; dancing: boolean; sitting: boolean };
export type Avatar = {
  group: THREE.Group;
  setOutfit(id: OutfitId): void;
  setLook(look: Look): void;
  setPose(pose: PoseId): void;
  setHair(id: HairId): void;
  setAccessory(id: AccessoryId): void;
  setShoes(id: ShoesId): void;
  celebrate(): void;
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
  const geo = new THREE.LatheGeometry(ordered.map(([r, y]) => new THREE.Vector2(r, y)), 28);
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
function ring(parent: THREE.Object3D, material: Mat, radius: number, width: number, pos: Point, depth = 1) {
  const mesh = add(parent, new THREE.TorusGeometry(radius, width, 5, 20), material, pos, [1, depth, 1]);
  mesh.rotation.x = Math.PI / 2; return mesh;
}
// Decorations share draw calls by material within each rigid node; joints remain independent.
function batch(node: THREE.Object3D) {
  for (const child of [...node.children]) if (!(child instanceof THREE.Mesh)) batch(child);
  const buckets = new Map<Mat, THREE.Mesh[]>();
  for (const child of node.children) if (child instanceof THREE.Mesh && !Array.isArray(child.material)) {
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
    add(node, merged, material);
  }
}

/** Original segmented doll rig. No downloaded model, skinning shader, animation file or runtime fetch. */
export function createAvatar(): Avatar {
  const group = new THREE.Group(); group.name = 'Dreamland fashion doll';
  const skin = mat(0xffd4b9, .67), shade = mat(0xeaa88f, .75), ivory = mat(0xfffaf3, .45);
  const ink = mat(0x302435, .6), iris = mat(0x1a9bb9, .35), lips = mat(0xe84a82, .4), blush = mat(0xf4a395, .8);
  const gold = mat(0xf6c35e, .28, .65), pink = mat(PALETTE.magenta, .4, .12), pale = mat(0xffb3d6, .65);
  const denim = mat(0x658fda, .83), aqua = mat(0x53dbe4, .46, .1), lilac = mat(0xb898f0, .48, .16);
  const pelvis = joint(group, 'pelvis', 0, 1.015), spine = joint(pelvis, 'waist');
  profile(pelvis, skin, [[0, -.115], [.14, -.115], [.185, -.055], [.172, .035], [.139, .095], [0, .095]]);
  profile(spine, skin, [[0, .025], [.142, .025], [.132, .12], [.151, .23], [.194, .32], [.204, .37], [.15, .415], [.075, .44], [0, .44]], .68);
  profile(spine, skin, [[0, .415], [.067, .415], [.055, .5], [.065, .54], [0, .54]], .88);
  const head = joint(spine, 'head', 0, .665);
  head.scale.setScalar(.92);
  const face = new THREE.SphereGeometry(1, 24, 16), fv = face.getAttribute('position');
  for (let i = 0; i < fv.count; i++) { const y = fv.getY(i); if (y < -.12) fv.setX(i, fv.getX(i) * (1 + (y + .12) * .23)); }
  face.computeVertexNormals(); add(head, face, skin, [0, 0, 0], [.186, .232, .161]);
  const earrings: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    oval(head, skin, [side * .181, -.015, -.005], [.035, .052, .025], 12);
    oval(head, shade, [side * .194, -.018, .012], [.014, .03, .009], 10);
    const eye = joint(head, side < 0 ? 'eye.L' : 'eye.R', side * .074, .031, .14); eye.rotation.y = side * .18;
    oval(eye, ink, [0, .002, 0], [.057, .034, .017], 16);
    oval(eye, ivory, [0, -.002, .008], [.05, .026, .015], 16);
    oval(eye, iris, [-side * .003, -.001, .022], [.021, .024, .007], 12);
    oval(eye, ink, [-side * .003, -.001, .028], [.0105, .016, .004], 12);
    oval(eye, ivory, [-.008, .009, .032], [.006, .007, .003], 8);
    oval(eye, ivory, [.007, -.009, .032], [.0025, .003, .002], 6);
    line(head, ink, [[side * .027, .091, .14], [side * .07, .103, .148], [side * .12, .083, .123]], .007, 8);
    for (let lash = 0; lash < 2; lash++) line(eye, ink,
      [[side * .043, .013 + lash * .005, .005], [side * (.06 + lash * .009), .025 + lash * .009, .006]], .003, 3);
    oval(head, blush, [side * .115, -.048, .123], [.029, .013, .003], 12);
    const earring = joint(head, 'earring', side * .193, -.055, .012); earrings.push(earring);
    const hoop = add(earring, new THREE.TorusGeometry(.026, .005, 5, 12), gold, [0, -.025, 0]); hoop.scale.y = 1.25;
    oval(earring, ivory, [0, 0, 0], [.009, .009, .009], 8);
  }
  oval(head, skin, [0, -.021, .162], [.019, .029, .023], 12);
  oval(head, shade, [0, -.038, .179], [.013, .005, .004], 10);
  line(head, ink, [[-.039, -.094, .143], [0, -.102, .153], [.039, -.094, .143]], .003, 8);
  oval(head, lips, [-.016, -.087, .149], [.025, .010, .009], 12);
  oval(head, lips, [.016, -.087, .149], [.025, .010, .009], 12);
  oval(head, lips, [0, -.105, .147], [.033, .009, .009], 12);
  oval(head, pale, [-.008, -.104, .156], [.016, .002, .002], 8);

  const legs: Array<{ hip: THREE.Group; knee: THREE.Group; ankle: THREE.Group }> = [];
  const arms: Array<{ shoulder: THREE.Group; elbow: THREE.Group; wrist: THREE.Group }> = [];
  const shoes: Record<ShoesId, THREE.Group[]> = { heels: [], sneakers: [], boots: [], sandals: [], platforms: [] };
  const trouserParts: Record<string, THREE.Group[]> = { shorts: [], palazzo: [] };
  const bottomMaterials = Object.fromEntries(['gown','wrap','pleated','shorts','palazzo','tennis','denim-skirt','satin-mini'].map(id => [id, mat(0xec4899, id === 'shorts' || id === 'denim-skirt' ? .83 : .5)])) as Record<BottomId,Mat>;
  const peaceFingers: THREE.Group[] = [];
  
  for (const side of [-1, 1]) {
    const hip = joint(pelvis, side < 0 ? 'hip.L' : 'hip.R', side * .108, -.025);
    profile(hip, skin, [[0, .025], [.077, .015], [.083, -.10], [.065, -.29], [.048, -.425], [0, -.445]], .86);
    const knee = joint(hip, 'knee', 0, -.425);
    oval(knee, skin, [0, 0, 0], [.048, .04, .046], 12);
    profile(knee, skin, [[0, .01], [.047, .01], [.062, -.11], [.044, -.24], [.032, -.39], [0, -.40]], .88);
    const ankle = joint(knee, 'ankle', 0, -.397); legs.push({ hip, knee, ankle });
    for (const id of ['shorts', 'palazzo'] as const) {
      const garment = joint(hip, id); trouserParts[id].push(garment);
      if (id === 'shorts') {
        profile(garment, bottomMaterials.shorts, [[.085, .013], [.091, -.10], [.085, -.235]], .94);
        ring(garment, ivory, .085, .006, [0, -.23, 0], .94);
      } else {
        profile(garment, bottomMaterials.palazzo, [[.087,.012],[.092,-.1],[.109,-.41]], .94);
        const calf = joint(knee, 'palazzo lower leg'); trouserParts[id].push(calf);
        oval(calf,bottomMaterials.palazzo,[0,0,0],[.113,.10,.109],14);
        profile(calf, bottomMaterials.palazzo, [[.109,.012],[.12,-.18],[.129,-.39]], .94);
        line(calf, ivory, [[side*.08,0,.065],[side*.09,-.37,.085]],.003,5);
      }
    }
    for (const id of ['heels', 'sneakers', 'boots', 'sandals', 'platforms'] as ShoesId[]) {
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
      } else if (id === 'boots') {
        profile(shoe, lilac, [[.033, .25], [.044, .245], [.042, .13], [.041, -.022]], 1);
        oval(shoe, lilac, [0, -.045, .045], [.058, .045, .113], 14);
        ring(shoe, gold, .045, .007, [0, .245, 0]);
        add(shoe, new THREE.BoxGeometry(.055, .04, .045), gold, [0, -.069, -.025]);
        line(shoe, ivory, [[0, .225, .042], [0, .06, .043], [0, -.015, .074]], .004, 8);
      } else {
        oval(shoe, id === 'platforms' ? lilac : gold, [0,-.058,.045],[.062,id === 'platforms' ? .048 : .017,.12],14);
        for (const z of [.025,.095]) line(shoe,id === 'platforms' ? pale : gold,[[-.05,-.025,z],[0,.0,z+.012],[.05,-.025,z]],.009,7);
        ring(shoe,gold,.037,.006,[0,.01,0]);
      }
    }
    const shoulder = joint(spine, side < 0 ? 'shoulder.L' : 'shoulder.R', side * .212, .368);
    oval(shoulder, skin, [0, -.015, 0], [.058, .067, .056], 14);
    profile(shoulder, skin, [[0, .015], [.054, 0], [.052, -.105], [.039, -.255], [0, -.28]], .95);
    const elbow = joint(shoulder, 'elbow', 0, -.27);
    oval(elbow, skin, [0, 0, 0], [.04, .04, .039], 12);
    profile(elbow, skin, [[0, .012], [.039, .005], [.043, -.07], [.026, -.235], [0, -.25]], .88);
    const wrist = joint(elbow, 'wrist', 0, -.245);
    oval(wrist, skin, [0, -.04, .004], [.035, .048, .019], 12);
    oval(wrist, skin, [-side * .029, -.024, .009], [.014, .03, .016], 10);
    ring(wrist, gold, .028, .006, [0, 0, 0], .85);
    const fingers = joint(wrist, 'peace fingers'); peaceFingers.push(fingers);
    for (const finger of [-1,1]) line(fingers,skin,[[finger*.012,-.062,.006],[finger*.025,-.113,.008]],.009,3);
    fingers.visible = false;
    arms.push({ shoulder, elbow, wrist });
  }

  const hairSways: THREE.Group[] = [];
  function hairLock(parent: THREE.Object3D, material: Mat, points: Point[], width: number) {
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
  function makeHair(color: number, style: HairId) {
    const holder = joint(head, `hair ${style}`), base = mat(color, .48, .04);
    const highlight = mat(new THREE.Color(color).lerp(new THREE.Color(0xfff2d8), .26).getHex(), .44, .06);
    oval(holder, base, [0, .015, -.086], [.2, .22, .099], 20);
    add(holder, new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI * .46), base, [0, .026, -.007], [.203, .231, .179]);
    for (let i = 0; i < 4; i++) {
      const offset = i * .021;
      hairLock(holder, i % 2 ? highlight : base,
        [[-.05 + offset, .247, -.01], [.065 + offset, .203, .11], [.155 + offset * .35, .093, .115], [.183, -.015 - offset, .04]], .032);
    }
    const sway = joint(holder, 'hair secondary motion', 0, .05, -.1); hairSways.push(sway);
    if (style === 'blonde') {
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
  const hairs: Record<HairId, THREE.Group> = { blonde: makeHair(0xeec86b, 'blonde'), pink: makeHair(0xf378b7, 'pink'), updo: makeHair(0x69412f, 'updo'), bob: makeHair(0x412a39, 'bob'), curls: makeHair(0x9c5837, 'curls') };
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

  const necklace = joint(spine, 'heart necklace');
  line(necklace,gold,[[-.08,.431,.06],[-.063,.376,.113],[0,.333,.143],[.063,.376,.113],[.08,.431,.06]],.005,14);
  for (const side of [-1,1]) oval(necklace,pink,[side*.009,.328,.15],[.013,.017,.007],10).rotation.z=-side*.5;
  const hairBow = joint(head,'silk hair bow',-.16,.17,-.07);
  for(const side of [-1,1]) oval(hairBow,pale,[side*.043,0,0],[.052,.034,.018],12).rotation.z=side*.3;
  oval(hairBow,gold,[0,0,.009],[.014,.018,.012],10);
  for(const side of [-1,1]) line(hairBow,pale,[[side*.01,-.02,0],[side*.035,-.08,.01],[side*.055,-.11,.025]],.012,6);

  const skirtPivots:THREE.Group[] = [];
  const tops = {} as Record<TopId,THREE.Group>;
  const topMaterials = {} as Record<TopId,Mat>;
  for(const id of ['glam','beach','popstar','casual','sunset','denim','sport','midnight'] as TopId[]) {
    const top=joint(spine,`top ${id}`); tops[id]=top;
    const fabric=mat(0xec4899,id==='denim'?.83:id==='midnight'?.76:.48); topMaterials[id]=fabric;
    const low=id==='beach'?.22:id==='sunset'?.16:id==='denim'?.10:.035;
    const points:Profile=[[0,low],[.146,low],[.144,Math.max(low,.14)],[.17,.26],[.207,.33],[.194,.37]];
    profile(top,fabric,points,.74);
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
      star.closePath();add(top,new THREE.ShapeGeometry(star),gold,[0,.275,.157]);
      for(const side of [-1,1]) oval(top,fabric,[side*.199,.35,.015],[.059,.066,.12],12);
    } else if(id==='casual') {
      for(const side of [-1,1]) line(top,pink,[[0,.16,.134],[side*.06,.22,.15],[side*.045,.245,.148],[0,.21,.147]],.009,8);
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
  }
  const bottoms={} as Record<BottomId,THREE.Group>;
  for(const id of ['gown','wrap','pleated','shorts','palazzo','tennis','denim-skirt','satin-mini'] as BottomId[]) {
    const bottom=joint(pelvis,`bottom ${id}`); bottoms[id]=bottom;
    const fabric=bottomMaterials[id];
    profile(bottom,fabric,[[.18,-.105],[.183,-.035],[.149,.058]],.79);
    ring(bottom,id==='shorts'||id==='denim-skirt'?ivory:gold,.15,.006,[0,.05,0],.79);
    if(id==='shorts'||id==='palazzo') continue;
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
      profile(skirt,fabric,[[.168,.045],[.20,-.10],[.28,hem]],.82,id==='tennis'?.11:.085);
      profile(skirt,id==='tennis'?aqua:ivory,[[.274,hem+.018],[.285,hem],[.281,hem-.009]],.82,.085,1);
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
  batch(group);
  const state = { look: { ...DEFAULT_LOOK, accessories:[...DEFAULT_LOOK.accessories] }, pose:'idle' as PoseId, hair:'blonde' as HairId, shoes:'heels' as ShoesId, phase:0,cheer:0,clock:0 };
  function sync() {
    for(const id of Object.keys(tops) as TopId[]) tops[id].visible=id===state.look.top;
    for(const id of Object.keys(bottoms) as BottomId[]) bottoms[id].visible=id===state.look.bottom;
    for(const id of Object.keys(trouserParts)) for(const part of trouserParts[id]) part.visible=id===state.look.bottom;
    for(const id of Object.keys(hairs) as HairId[]) hairs[id].visible=id===state.hair;
    for(const id of Object.keys(shoes) as ShoesId[]) for(const shoe of shoes[id]) shoe.visible=id===state.shoes;
    topMaterials[state.look.top].color.set(state.look.topColor);
    bottomMaterials[state.look.bottom].color.set(state.look.bottomColor);
    sunglasses.visible=state.look.accessories.includes('sunglasses'); tiara.visible=state.look.accessories.includes('tiara');
    necklace.visible=state.look.accessories.includes('necklace'); hairBow.visible=state.look.accessories.includes('bow');
    for(const part of earrings) part.visible=state.look.accessories.includes('earrings');
  }
  function setLook(look:Look) {
    if(!tops[look.top]||!bottoms[look.bottom]) return;
    state.look={...look,accessories:[...look.accessories]};sync();
  }
  sync();
  return {
    group, setLook,
    setPose(pose) {state.pose=pose;},
    setOutfit(id) {setLook(presetLook(id));}, setHair(id) {state.hair=id;sync();},
    setAccessory(id) {state.look.accessories=state.look.accessories.filter(a=>a!=='tiara'&&a!=='sunglasses');if(id!=='none')state.look.accessories.push(id);sync();},
    setShoes(id) {state.shoes=id;sync();},
    celebrate() { state.cheer = 1.5; },
    update(dt, motion) {
      const step = Math.min(Math.max(dt, 0), .05); state.clock += step;
      state.phase += step * (motion.dancing ? 6.8 : motion.moving ? 7 + motion.speed * .6 : 2.1);
      state.cheer = Math.max(0, state.cheer - step);
      const t = state.phase, dance = motion.dancing || state.cheer > 0;
      const stride = motion.moving ? .53 * Math.min(1, motion.speed / 4.5) : 0, blend = 1 - Math.exp(-step * 15);
      const targets = new Map<THREE.Object3D,Point>();
      const pose = (node:THREE.Object3D,x=0,y=0,z=0) => {targets.set(node,[x,y,z]);};
      // Every pose updates every joint; leaving dance/sitting cannot retain stale limb rotations.
      pelvis.position.y = 1.015 + (motion.moving && motion.grounded ? Math.abs(Math.sin(t)) * .018 : dance ? Math.sin(t * 2) * .018 : Math.sin(t) * .004);
      pose(pelvis, 0, dance ? Math.sin(t) * .14 : 0, dance ? Math.sin(t) * .065 : motion.moving ? Math.sin(t) * .025 : -.025);
      pose(spine, motion.sitting ? .09 : 0, dance ? -Math.sin(t) * .23 : -Math.sin(t) * stride * .12, dance ? -Math.sin(t) * .08 : .025);
      pose(head, Math.sin(state.clock * 1.4) * .026, dance ? Math.sin(t * .5) * .14 : Math.sin(t * .45) * .045, dance ? Math.sin(t) * .07 : -.035);
      for (let i = 0; i < 2; i++) {
        const side = i ? 1 : -1, wave = Math.sin(t + i * Math.PI), leg = legs[i], arm = arms[i];
        let hx = wave * stride, kx = Math.max(0, -wave) * stride * 1.15;
        let ax = -wave * stride * .75, az = -side * .115, ex = -.12 - Math.max(0, wave) * stride * .5;
        if (motion.sitting) { hx = -1.4; kx = 1.38; ax = -.72; ex = -.6; }
        else if (dance) { hx = wave * .19; kx = .13 + Math.max(0, -wave) * .35; ax = -1.1 + Math.sin(t + i * 1.9) * .7; az = -side * (.6 + Math.sin(t * .5 + i) * .3); ex = -.8 + Math.sin(t + i) * .5; }
        else if (!motion.grounded) { hx = i ? .26 : -.5; kx = i ? .55 : .18; ax = -.65; ex = -.45; }
        pose(leg.hip, hx, 0, motion.sitting ? side * .035 : side * .012); pose(leg.knee, kx); pose(leg.ankle, motion.sitting ? -.12 : -kx * .2);
        pose(arm.shoulder, ax, 0, az); pose(arm.elbow, ex, 0, -side * (dance ? .23 : .07)); pose(arm.wrist, 0, dance ? Math.sin(t + i) * .3 : 0, side * .045);
      }
      for(const fingers of peaceFingers) fingers.visible=false;
      const selected=state.pose;
      if(selected!=='idle' && !motion.moving && !motion.sitting) {
        const pulse=Math.sin(state.clock*3);
        const arm=(i:number,x:number,y:number,z:number,ex:number,ez=0,wx=0,wy=0,wz=0)=>{
          pose(arms[i].shoulder,x,y,z);pose(arms[i].elbow,ex,0,ez);pose(arms[i].wrist,wx,wy,wz);
        };
        // Two bone reach keeps photo hands at the face/chest instead of merely raising an arm.
        const reach=(i:number,target:Point,hint:Point,handDirection:Point)=>{
          const origin=arms[i].shoulder.position, end=new THREE.Vector3(...target);
          const direction=end.clone().sub(origin), distance=THREE.MathUtils.clamp(direction.length(),.03,.51);
          direction.normalize();
          const along=(.27*.27-.245*.245+distance*distance)/(2*distance);
          const perpendicular=new THREE.Vector3(...hint).addScaledVector(direction,-new THREE.Vector3(...hint).dot(direction)).normalize();
          const elbow=origin.clone().addScaledVector(direction,along).addScaledVector(perpendicular,Math.sqrt(Math.max(0,.27*.27-along*along)));
          const down=new THREE.Vector3(0,-1,0);
          const shoulderQ=new THREE.Quaternion().setFromUnitVectors(down,elbow.clone().sub(origin).normalize());
          const elbowQ=new THREE.Quaternion().setFromUnitVectors(down,end.clone().sub(elbow).normalize().applyQuaternion(shoulderQ.clone().invert()));
          const handQ=new THREE.Quaternion().setFromUnitVectors(down,new THREE.Vector3(...handDirection).normalize());
          const wristQ=shoulderQ.clone().multiply(elbowQ).invert().multiply(handQ);
          for(const [node,q] of [[arms[i].shoulder,shoulderQ],[arms[i].elbow,elbowQ],[arms[i].wrist,wristQ]] as const){
            const rotation=new THREE.Euler().setFromQuaternion(q);pose(node,rotation.x,rotation.y,rotation.z);
          }
        };
        pose(pelvis,0,0,-.04);pose(spine,0,0,.04);pose(head,0,.08,-.07);
        for(let i=0;i<2;i++){const side=i?1:-1;pose(legs[i].hip,0,0,side*.025);pose(legs[i].knee,0);pose(legs[i].ankle,0);arm(i,0,0,side*.10,-.1);}
        if(selected==='wave') {
          reach(1,[.38,.71,.06],[.25,-.05,.04],[pulse*.3,1,0]);pose(head,0,-.12,-.11);
          arm(0,-.12,0,-.15,-.15);
        } else if(selected==='peace') {
          reach(1,[.29,.60,.16],[.3,-.1,.02],[.12,1,0]); peaceFingers[1].visible=true;
          arm(0,.1,0,.43,-.9,-.25);pose(head,-.04,-.1,-.16);
          pose(legs[0].hip,.08,0,-.07);pose(legs[0].knee,.12);
        } else if(selected==='heart') {
          reach(0,[-.045,.35,.24],[-.2,-.3,.04],[.65,-.75,0]);
          reach(1,[.045,.35,.24],[.2,-.3,.04],[-.65,-.75,0]);
          pose(head,.10,0,.04);pose(spine,-.03,0,0);
        } else if(selected==='kiss') {
          reach(1,[.082,.53,.235],[.28,-.17,.06],[-.8,.5,.05]);
          arm(0,.08,0,.34,-1.1,-.22);pose(head,-.08,-.16,-.12);
          pose(legs[1].hip,.18,0,.08);pose(legs[1].knee,.25);
        } else if(selected==='spin') {
          pose(pelvis,0,state.clock*1.7,.04);pose(spine,-.03,0,-.08);
          arm(0,-.2,0,-1.35,-.2,0);arm(1,-.2,0,1.35,-.2,0);
          pose(legs[0].hip,-.10,0,-.12);pose(legs[1].hip,.32,0,.14);pose(legs[1].knee,.85);pose(legs[1].ankle,-.4);
        } else if(selected==='dance') {
          pose(pelvis,0,pulse*.24,pulse*.10);pose(spine,-.06,-pulse*.3,-pulse*.16);pose(head,-.04,pulse*.15,.1);
          arm(0,-.8+pulse*.35,0,-1.05,-1.0,.2,0,0,pulse*.25);
          arm(1,-1.5-pulse*.35,0,1.8,-.6,-.2,0,0,-pulse*.25);
          pose(legs[0].hip,-.1+pulse*.18,0,-.15);pose(legs[0].knee,.2+Math.max(0,pulse)*.35);
          pose(legs[1].hip,-.1-pulse*.18,0,.15);pose(legs[1].knee,.2+Math.max(0,-pulse)*.35);
        } else if(selected==='pet') {
          pelvis.position.y=.83;pose(pelvis,.28,0,-.05);pose(spine,.28,0,-.12);pose(head,.28,0,-.12);
          pose(legs[0].hip,-.72,0,-.13);pose(legs[0].knee,1.35);pose(legs[1].hip,-.35,0,.1);pose(legs[1].knee,.85);
          arm(0,-.72,0,-.22,-.15,0,0,0,pulse*.09);arm(1,-.25,0,.17,-.62);
        } else if(selected==='surf') {
          pelvis.position.y=.88;pose(pelvis,-.08,.6,.06);pose(spine,.15,-.3,-.08);pose(head,-.04,-.3,0);
          pose(legs[0].hip,-.48,0,-.28);pose(legs[0].knee,.76);pose(legs[1].hip,-.45,0,.28);pose(legs[1].knee,.72);
          arm(0,-.14,-.3,-1.25,-.24);arm(1,-.3,.3,1.2,-.37);
        }
      }
      for (const sway of hairSways) pose(sway, Math.sin(t - .45) * (dance ? .095 : stride * .09 + .015), 0, -Math.sin(t) * (dance ? .07 : .018));
      for (const skirt of skirtPivots) {
        const crouched=selected==='surf'||selected==='pet';
        pose(skirt,motion.sitting?-.8:crouched?-.12:Math.sin(t)*stride*.09,0,dance?-Math.sin(t-.5)*.07:Math.sin(t)*.014);
        skirt.scale.x=THREE.MathUtils.lerp(skirt.scale.x,crouched?1.16:1,blend);
        skirt.scale.z=THREE.MathUtils.lerp(skirt.scale.z,motion.sitting?.7:crouched?1.3:1,blend);
      }
      for (const earring of earrings) pose(earring, Math.sin(t + .3) * .09, 0, Math.sin(t - .4) * (dance ? .15 : .04));
      for(const [node,[x,y,z]] of targets) {
        node.rotation.x=THREE.MathUtils.lerp(node.rotation.x,x,blend);
        node.rotation.y=THREE.MathUtils.lerp(node.rotation.y,y,blend);
        node.rotation.z=THREE.MathUtils.lerp(node.rotation.z,z,blend);
      }
    },
  };
}
