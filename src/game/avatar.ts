import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { AccessoryId, HairId, OutfitId, ShoesId } from '@/game/types';
import { PALETTE } from '@/game/palette';

export type AvatarMotion = { moving: boolean; speed: number; grounded: boolean; dancing: boolean; sitting: boolean };
export type Avatar = {
  group: THREE.Group;
  setOutfit(id: OutfitId): void;
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
  const shoes: Record<ShoesId, THREE.Group[]> = { heels: [], sneakers: [], boots: [] };
  const shorts: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const hip = joint(pelvis, side < 0 ? 'hip.L' : 'hip.R', side * .108, -.025);
    profile(hip, skin, [[0, .025], [.077, .015], [.083, -.10], [.065, -.29], [.048, -.425], [0, -.445]], .86);
    const knee = joint(hip, 'knee', 0, -.425);
    oval(knee, skin, [0, 0, 0], [.048, .04, .046], 12);
    profile(knee, skin, [[0, .01], [.047, .01], [.062, -.11], [.044, -.24], [.032, -.39], [0, -.40]], .88);
    const ankle = joint(knee, 'ankle', 0, -.397); legs.push({ hip, knee, ankle });
    const denimLeg = joint(hip, 'casual denim shorts'); shorts.push(denimLeg);
    profile(denimLeg, denim, [[.085, .013], [.091, -.10], [.085, -.235]], .94);
    ring(denimLeg, pale, .085, .008, [0, -.23, 0], .94);
    for (const id of ['heels', 'sneakers', 'boots'] as ShoesId[]) {
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
        profile(shoe, lilac, [[.033, .25], [.044, .245], [.042, .13], [.041, -.022]], 1);
        oval(shoe, lilac, [0, -.045, .045], [.058, .045, .113], 14);
        ring(shoe, gold, .045, .007, [0, .245, 0]);
        add(shoe, new THREE.BoxGeometry(.055, .04, .045), gold, [0, -.069, -.025]);
        line(shoe, ivory, [[0, .225, .042], [0, .06, .043], [0, -.015, .074]], .004, 8);
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
  const hairs: Record<HairId, THREE.Group> = { blonde: makeHair(0xeec86b, 'blonde'), pink: makeHair(0xf378b7, 'pink'), updo: makeHair(0x69412f, 'updo') };
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

  const skirtPivots: THREE.Group[] = [], outfits = {} as Record<OutfitId, THREE.Group>;
  for (const id of ['glam', 'beach', 'popstar', 'casual'] as OutfitId[]) {
    const outfit = joint(spine, `outfit ${id}`); outfits[id] = outfit;
    const fabric = id === 'glam' ? pink : id === 'beach' ? pale : ivory, bottom = id === 'beach' ? .22 : .035;
    const bodyPoints: Profile = id === 'beach' ? [[0, .22], [.164, .22], [.203, .33], [.189, .369]] : [[0, bottom], [.145, bottom], [.142, .14], [.165, .25], [.203, .33], [.189, .369]];
    profile(outfit, fabric, bodyPoints, .72);
    for (const side of [-1, 1]) line(outfit, id === 'glam' ? pale : fabric,
      [[side * .13, .33, .105], [side * .145, .425, .03], [side * .145, .36, -.09]], id === 'casual' ? .024 : .013, 10);
    ring(outfit, gold, .147, .009, [0, .065, 0], .74);
    if (id === 'glam') {
      const skirt = joint(outfit, 'satin gown'); skirtPivots.push(skirt);
      profile(skirt, pink, [[.171, .055], [.193, -.11], [.24, -.33], [.31, -.57], [.405, -.85], [.406, -.875], [.39, -.88]], .82, .045);
      profile(skirt, pale, [[.401, -.85], [.414, -.872], [.396, -.887]], .82, .045, 1);
      for (const side of [-1, 1]) line(skirt, pale,
        [[side * .125, .04, .09], [side * .19, -.22, .13], [side * .28, -.48, .16], [side * .37, -.78, .16]], .011, 16);
      for (let i = 0; i < 5; i++) oval(outfit, gold, [0, .28 - i * .035, .139 - i * .007], [.008, .008, .006], 8);
      const bow = joint(outfit, 'waist bow', .145, .065, .1);
      for (const side of [-1, 1]) oval(bow, pale, [side * .034, 0, 0], [.043, .025, .012], 12).rotation.z = side * .36;
      oval(bow, gold, [0, 0, .01], [.013, .016, .011], 10);
    } else if (id === 'beach') {
      profile(outfit, aqua, [[.174, -.13], [.192, -.055], [.177, .035]], .77);
      const skirt = joint(outfit, 'beach wrap'); skirtPivots.push(skirt);
      profile(skirt, ivory, [[.18, .035], [.219, -.17], [.264, -.35]], .8, .045).rotation.z = -.12;
      line(skirt, aqua, [[-.17, .03, .03], [0, -.07, .164], [.23, -.29, .09]], .014, 12);
      for (let i = 0; i < 4; i++) oval(outfit, ivory, [(i - 1.5) * .05, .281, .142], [.009, .009, .004], 8);
      oval(outfit, pink, [.145, .02, .1], [.03, .026, .019], 10);
    } else if (id === 'popstar') {
      const skirt = joint(outfit, 'pleated performance skirt'); skirtPivots.push(skirt);
      profile(skirt, lilac, [[.168, .045], [.20, -.11], [.28, -.30], [.281, -.315]], .82, .085);
      profile(skirt, aqua, [[.276, -.292], [.288, -.308], [.281, -.321]], .82, .085, 1);
      const star = new THREE.Shape();
      for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + Math.PI / 2, r = i % 2 ? .026 : .057; if (!i) star.moveTo(Math.cos(a) * r, Math.sin(a) * r); else star.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      star.closePath(); add(outfit, new THREE.ShapeGeometry(star), gold, [0, .275, .151]);
      line(outfit, gold, [[-.08, .413, .06], [0, .355, .146], [.08, .413, .06]], .008, 12);
      for (const side of [-1, 1]) oval(outfit, lilac, [side * .183, .35, .02], [.046, .053, .115], 12);
    } else {
      profile(outfit, denim, [[.177, -.09], [.179, .035], [.149, .06]], .79);
      for (const side of [-1, 1]) {
        line(outfit, pale, [[side * .028, .225, .146], [side * .045, .18, .136], [0, .135, .115], [side * .09, .20, .145], [side * .028, .225, .146]], .012, 12);
        add(outfit, new THREE.BoxGeometry(.055, .065, .012), denim, [side * .11, -.012, .124]);
      }
      oval(outfit, gold, [0, .025, .145], [.011, .011, .005], 8);
    }
  }
  batch(group);
  const state = { outfit: 'glam' as OutfitId, hair: 'blonde' as HairId, accessory: 'none' as AccessoryId, shoes: 'heels' as ShoesId, phase: 0, cheer: 0, clock: 0 };
  function sync() {
    for (const id of Object.keys(outfits) as OutfitId[]) outfits[id].visible = id === state.outfit;
    for (const id of Object.keys(hairs) as HairId[]) hairs[id].visible = id === state.hair;
    for (const id of Object.keys(shoes) as ShoesId[]) for (const shoe of shoes[id]) shoe.visible = id === state.shoes;
    for (const part of shorts) part.visible = state.outfit === 'casual';
    sunglasses.visible = state.accessory === 'sunglasses'; tiara.visible = state.accessory === 'tiara';
  }
  sync();
  return {
    group,
    setOutfit(id) { state.outfit = id; sync(); }, setHair(id) { state.hair = id; sync(); },
    setAccessory(id) { state.accessory = id; sync(); }, setShoes(id) { state.shoes = id; sync(); },
    celebrate() { state.cheer = 1.5; },
    update(dt, motion) {
      const step = Math.min(Math.max(dt, 0), .05); state.clock += step;
      state.phase += step * (motion.dancing ? 6.8 : motion.moving ? 7 + motion.speed * .6 : 2.1);
      state.cheer = Math.max(0, state.cheer - step);
      const t = state.phase, dance = motion.dancing || state.cheer > 0;
      const stride = motion.moving ? .53 * Math.min(1, motion.speed / 4.5) : 0, blend = 1 - Math.exp(-step * 15);
      const pose = (node: THREE.Object3D, x = 0, y = 0, z = 0) => {
        node.rotation.x = THREE.MathUtils.lerp(node.rotation.x, x, blend); node.rotation.y = THREE.MathUtils.lerp(node.rotation.y, y, blend); node.rotation.z = THREE.MathUtils.lerp(node.rotation.z, z, blend);
      };
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
      for (const sway of hairSways) pose(sway, Math.sin(t - .45) * (dance ? .095 : stride * .09 + .015), 0, -Math.sin(t) * (dance ? .07 : .018));
      for (const skirt of skirtPivots) { pose(skirt, motion.sitting ? -.8 : Math.sin(t) * stride * .09, 0, dance ? -Math.sin(t - .5) * .07 : Math.sin(t) * .014); skirt.scale.z = THREE.MathUtils.lerp(skirt.scale.z, motion.sitting ? .7 : 1, blend); }
      for (const earring of earrings) pose(earring, Math.sin(t + .3) * .09, 0, Math.sin(t - .4) * (dance ? .15 : .04));
    },
  };
}
