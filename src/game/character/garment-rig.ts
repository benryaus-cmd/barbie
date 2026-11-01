import * as THREE from 'three';
import { RIDING, solveLimb } from './riding';
import { FLOOR_POSE_SUPPORT } from '../poses';
import { createMotionController } from './motion-controller';

export type GarmentMotion = {
  sitting: boolean; moving: boolean; speed: number; dancing: boolean;
  pose: string; phase: number; vehicle?: string | null;
};

const WAIST = .05, KNEE_DEPTH = .5;
const authoredGeometry = new Map<string, THREE.BufferGeometry>();
// Author the small standing clearances from the same solved legs as the body.
// This runs once, never in the frame loop, and remains shoe-height independent.
const standingDirections = ['hair-touch','crossed-arms','leg-pop'].map(name=>{
  const controller=createMotionController();let frame=controller.update(0,{moving:false,speed:0,grounded:true,dancing:false,sitting:false,pose:name});
  for(let i=0;i<90;i++)frame=controller.update(1/30,{moving:false,speed:0,grounded:true,dancing:false,sitting:false,pose:name});
  return {name,directions:['left','right'].map(side=>new THREE.Vector3(0,-1,0).applyEuler(new THREE.Euler(...frame.rotations[side+'UpperLeg'])))};
});
/** Four independent 32-bit streams include every baked attribute byte, index,
 * attribute layout and draw group. Names alone cannot identify fixture/NPC meshes. */
function geometrySignature(geometry: THREE.BufferGeometry, name: string) {
  let a = 1779033703, b = 3144134277, c = 1013904242, d = 2773480762;
  const byte = (value: number) => {
    a = Math.imul(a ^ value, 597399067); b = Math.imul(b ^ value, 2869860233);
    c = Math.imul(c ^ value, 951274213); d = Math.imul(d ^ value, 2716044179);
  };
  const label = (value: string) => { for (let i = 0; i < value.length; i++) byte(value.charCodeAt(i)); byte(255); };
  label(name); label(JSON.stringify(geometry.groups));
  for (const [key, attribute] of [...Object.entries(geometry.attributes), ['index', geometry.index] as const]) {
    if (!attribute) continue;
    label(`${key}:${attribute.itemSize}:${attribute.count}:${attribute.normalized}`);
    const array = attribute instanceof THREE.InterleavedBufferAttribute ? attribute.data.array : attribute.array;
    label(array.constructor.name);
    for (const value of new Uint8Array(array.buffer, array.byteOffset, array.byteLength)) byte(value);
  }
  return [a, b, c, d].map(value => (value >>> 0).toString(16).padStart(8, '0')).join('');
}
const smooth = (low: number, high: number, value: number) => {
  const t = THREE.MathUtils.clamp((value - low) / (high - low), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Insert horizontal rows before weighting. Unlike uniform subdivision this does
 * not multiply the already adequate 28 radial segments or tiny jewellery faces. */
function subdivide(source: THREE.BufferGeometry): THREE.BufferGeometry {
  const geometry = source.index ? source.toNonIndexed() : source.clone();
  const attributes = Object.entries(geometry.attributes);
  const offsets: number[] = [];
  let cursor = 0;
  for (const [, a] of attributes) { offsets.push(cursor); cursor += a.itemSize; }
  const positionOffset = offsets[attributes.findIndex(([name]) => name === 'position')];
  const output: number[][] = attributes.map(() => []);
  const result = new THREE.BufferGeometry();
  const read = (index: number) => {
    const vertex: number[] = [];
    for (const [, attribute] of attributes) for (let c = 0; c < attribute.itemSize; c++) vertex.push(attribute.getComponent(index, c));
    return vertex;
  };
  const clip = (polygon: number[][], height: number, above: boolean) => {
    const out: number[][] = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length];
      const ay = a[positionOffset + 1], by = b[positionOffset + 1];
      const aInside = above ? ay >= height : ay <= height, bInside = above ? by >= height : by <= height;
      if (aInside) out.push(a);
      if (aInside !== bInside) {
        const t = (height - ay) / (by - ay);
        out.push(a.map((v, c) => v + (b[c] - v) * t));
      }
    }
    return out;
  };
  for (let i = 0; i < geometry.attributes.position.count; i += 3) {
    const triangle = [read(i), read(i + 1), read(i + 2)];
    const min = Math.min(...triangle.map(v => v[positionOffset + 1]));
    const max = Math.max(...triangle.map(v => v[positionOffset + 1]));
    const rowLow = Math.floor(min / .035), rowHigh = Math.floor(max / .035);
    const materialIndex = geometry.groups.find(g => i >= g.start && i < g.start + g.count)?.materialIndex ?? 0;
    const start = output[0].length / attributes[0][1].itemSize;
    for (let row = rowLow; row <= rowHigh; row++) {
      const polygon = clip(clip(triangle, row * .035, true), (row + 1) * .035, false);
      for (let p = 1; p < polygon.length - 1; p++) {
        for (const vertex of [polygon[0], polygon[p], polygon[p + 1]]) {
          for (let a = 0; a < attributes.length; a++) {
            const offset = offsets[a];
            for (let c = 0; c < attributes[a][1].itemSize; c++) output[a].push(vertex[offset + c]);
          }
        }
      }
    }
    const count = output[0].length / attributes[0][1].itemSize - start;
    if (geometry.groups.length && count) {
      const previous = result.groups[result.groups.length - 1];
      if (previous && previous.materialIndex === materialIndex) previous.count += count;
      else result.addGroup(start, count, materialIndex);
    }
  }
  for (let a = 0; a < attributes.length; a++) result.setAttribute(attributes[a][0], new THREE.Float32BufferAttribute(output[a], attributes[a][1].itemSize, attributes[a][1].normalized));
  geometry.dispose();
  return result;
}

/** GPU skinning plus authored seated/crouch correctives; no per-frame vertex walk.
 * All fabric, seams, buttons and hem trims receive the same coordinate field. */
export function createGarmentRig(skirt: THREE.Group): { update(dt: number, motion: GarmentMotion, snap?: boolean): void } {
  type Drape = { name: string; directions: THREE.Vector3[]; shin?:THREE.Vector3; floorY?:number; lateral?:boolean; standing?:boolean };
  const drapes: Drape[] = Object.entries(RIDING).map(([name, ride]) => ({ name, directions: [-1, 1].map((side, i) => {
    const origin = new THREE.Vector3(side * .108, -.025, 0);
    const foot = new THREE.Vector3(...ride.feet[i]).sub(new THREE.Vector3(0, ride.rootY + 1.015, ride.rootZ));
    const [rotation] = solveLimb(origin, foot, new THREE.Vector3(side * .08, 0, 1), .425, .397, new THREE.Vector3(0, -1, 0));
    return new THREE.Vector3(0, -1, 0).applyQuaternion(rotation);
  }) }));
  for (const [name, angles] of [['pet', [[-.72, -.13], [-.35, .1]]], ['surf', [[-.48, -.28], [-.45, .28]]], ['curtsy', [[-.2, -.08], [.32, .08]]]] as const) {
    drapes.push({ name, directions: angles.map(([x, z]) => new THREE.Vector3(0, -1, 0).applyEuler(new THREE.Euler(x, 0, z))) });
  }
  for(const [name,support] of Object.entries(FLOOR_POSE_SUPPORT)) {
    drapes.push({name,directions:[-1,1].map(()=>new THREE.Vector3(...support.thigh).normalize()),shin:new THREE.Vector3(...support.shin).normalize(),floorY:.025-support.pelvisY,lateral:name==='side-sit'});
  }
  for(const support of standingDirections)drapes.push({...support,standing:true});
  const root = new THREE.Bone(); root.name = 'dress.waist'; root.position.y = WAIST;
  const bones: THREE.Bone[] = [root], panels: THREE.Bone[] = [], hems: THREE.Bone[] = [];
  for (const name of ['front', 'right', 'back', 'left']) {
    const panel = new THREE.Bone(); panel.name = `dress.${name}`; root.add(panel); panels.push(panel); bones.push(panel);
    const hem = new THREE.Bone(); hem.name = `dress.${name}.hem`; hem.position.y = -KNEE_DEPTH; panel.add(hem); hems.push(hem);
  }
  bones.push(...hems);
  const originals: THREE.Mesh[] = [];
  skirt.traverse(object => { if (object instanceof THREE.Mesh) originals.push(object); });
  skirt.updateWorldMatrix(true, true);
  const local = skirt.matrixWorld.clone().invert(), meshes: THREE.SkinnedMesh[] = [], fresh = new Map<THREE.SkinnedMesh, string>();
  for (const original of originals) {
    const baked = original.geometry.clone().applyMatrix4(local.clone().multiply(original.matrixWorld));
    const signature = geometrySignature(baked, skirt.name), cached = authoredGeometry.get(signature);
    const geometry = cached ? cached.clone() : subdivide(baked); baked.dispose();
    const position = geometry.attributes.position, indices: number[] = [], weights: number[] = [];
    if (!cached) for (let i = 0; i < position.count; i++) {
      const depth = WAIST - position.getY(i);
      const angle = ((Math.atan2(position.getX(i), position.getZ(i)) / (Math.PI / 2)) + 4) % 4;
      const a = Math.floor(angle), b = (a + 1) % 4, across = angle - a;
      const anchored = smooth(.012, .12, depth), lower = smooth(.40, .60, depth);
      if (anchored < 1) {
        indices.push(0, 1 + a, 1 + b, 0); weights.push(1 - anchored, anchored * (1 - across), anchored * across, 0);
      } else {
        indices.push(1 + a, 1 + b, 5 + a, 5 + b);
        weights.push((1 - lower) * (1 - across), (1 - lower) * across, lower * (1 - across), lower * across);
      }
    }
    if (!cached) {
      geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
      geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
    }
    const mesh = new THREE.SkinnedMesh(geometry, original.material);
    if (!cached) fresh.set(mesh, signature);
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.side = THREE.DoubleSide;
    mesh.name = `${skirt.name} ${original.name || 'fabric'}`; mesh.castShadow = original.castShadow; mesh.receiveShadow = original.receiveShadow;
    mesh.visible = original.visible; mesh.renderOrder = original.renderOrder; mesh.userData = { ...original.userData };
    // Explicit bounds avoid per-frame CPU evaluation of every weighted vertex.
    geometry.computeBoundingSphere(); geometry.computeBoundingBox();
    mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -.25, .2), 1.35);
    mesh.boundingBox = new THREE.Box3(new THREE.Vector3(-.75, -1.1, -.7), new THREE.Vector3(.75, .55, 1.0));
    original.removeFromParent(); original.geometry.dispose(); skirt.add(mesh); meshes.push(mesh);
  }
  skirt.add(root); skirt.updateWorldMatrix(true, true);
  const skeleton = new THREE.Skeleton(bones);
  for (const mesh of meshes) mesh.bind(skeleton);
  const angleFor = (drape: Drape, panel: number) => {
    if(drape.standing)return 0;
    const angles = drape.directions.map(v => Math.atan2(v.z, -v.y));
    return (panel === 1 ? angles[1] : panel === 3 ? angles[0] : (angles[0] + angles[1]) / 2) * .7;
  };
  const setBones = (amounts: number[]) => {
    for (let i = 0; i < 4; i++) {
      const angle = drapes.reduce((sum, drape, j) => sum + angleFor(drape, i) * amounts[j], 0);
      panels[i].rotation.x = -angle; hems[i].rotation.x = angle;
    }
  };
  const seatedPosition = (p: THREE.Vector3, out: THREE.Vector3, drape: Drape) => {
    const depth = WAIST - p.y, influence = smooth(.012, .115, depth);
    if (depth <= .012) return out.copy(p);
    if(drape.standing){
      // Loft only the fitted upper skirt around the two actual thigh paths.
      // Keep its waist, height and hem style; a few millimetres of allowance at
      // the outer hips prevent the leg-pop's raised thigh cutting a side slit.
      const radius=Math.hypot(p.x,p.z);if(radius<1e-6)return out.copy(p);
      const nx=p.x/radius,nz=p.z/radius;let expanded=radius;
      for(let i=0;i<2;i++){
        const leg=drape.directions[i],along=(p.y+.025)/leg.y;
        if(along<0||along>.36)continue;
        const x=(i?1:-1)*.108+along*leg.x,z=along*leg.z,projection=x*nx+z*nz;
        const section=.091/Math.max(.6,-leg.y),perpendicular=x*x+z*z-projection*projection;
        if(perpendicular<section*section)expanded=Math.max(expanded,projection+Math.sqrt(section*section-perpendicular));
      }
      const scale=THREE.MathUtils.lerp(radius,expanded,influence)/radius;
      return out.set(p.x*scale,p.y,p.z*scale);
    }
    const across = smooth(-.10, .10, p.x), left = drape.directions[0], right = drape.directions[1];
    const directionY = THREE.MathUtils.lerp(left.y, right.y, across), directionZ = THREE.MathUtils.lerp(left.z, right.z, across);
    const directionX = THREE.MathUtils.lerp(left.x, right.x, across);
    const axial = Math.max(0, depth - (drape.lateral ? .025 : .075)), upper = Math.min(axial, .425), trailing = Math.max(0, axial - .425);
    const bend = Math.atan2(directionZ, -directionY), normalBend = bend * (1 - smooth(.35, .49, axial));
    const radius = Math.max(.001, Math.hypot(p.x, p.z / .82));
    // Loft the outer hips around the actual two thigh paths. This early width
    // expansion closes the side wedge without moving the top waistband.
    const width = Math.max(radius, .215) + (drape.lateral?0:Math.abs(directionX) * upper);
    const x = p.x / radius * width + (drape.lateral?directionX*upper+(drape.shin?.x||0)*trailing:0);
    const compression = .80 + .10 * smooth(.35, .58, axial);
    // A seated skirt has an oblate section over the thighs. Unbounded source
    // radius would turn wide pleated hems into fins above the waistband.
    const section = THREE.MathUtils.clamp(p.z * compression, -.13, .10);
    out.set(THREE.MathUtils.lerp(p.x, x, smooth(.012, .07, depth)), -.025 + upper * directionY + trailing*(drape.shin?.y??-1) + section * Math.sin(normalBend), upper * directionZ + trailing*(drape.shin?.z||0) + section * Math.cos(normalBend));
    out.y = THREE.MathUtils.lerp(p.y, out.y, influence); out.z = THREE.MathUtils.lerp(p.z, out.z, influence);
    // Floor poses fold the long hem beside the shins. They retain the same
    // weighted surface and trims without dropping a gown through the floor.
    if(drape.floorY!==undefined)out.y=Math.max(drape.floorY,out.y);
    return out;
  };
  // Solve the corrective in bind coordinates against the fully posed skin blend,
  // so the seated surface follows an authored hip/knee path rather than a tilt.
  for (let mode = 0; mode < drapes.length; mode++) {
   setBones(drapes.map((_, i) => i === mode ? 1 : 0)); skirt.updateWorldMatrix(true, true);
   for (const mesh of meshes) {
    if (!fresh.has(mesh)) continue;
    const position = mesh.geometry.attributes.position, index = mesh.geometry.attributes.skinIndex, weight = mesh.geometry.attributes.skinWeight;
    const palette = bones.map((bone, i) => mesh.bindMatrixInverse.clone().multiply(bone.matrixWorld).multiply(skeleton.boneInverses[i]).multiply(mesh.bindMatrix));
    const corrective = new Float32Array(position.count * 3);
    const p = new THREE.Vector3(), desired = new THREE.Vector3(), blended = new THREE.Matrix4();
    for (let i = 0; i < position.count; i++) {
      p.fromBufferAttribute(position, i);
      seatedPosition(p, desired, drapes[mode]);
      blended.elements.fill(0);
      for (let w = 0; w < 4; w++) {
        const matrix = palette[index.getComponent(i, w)], strength = weight.getComponent(i, w);
        for (let e = 0; e < 16; e++) blended.elements[e] += matrix.elements[e] * strength;
      }
      blended.invert(); desired.applyMatrix4(blended);
      corrective[i * 3] = desired.x - p.x; corrective[i * 3 + 1] = desired.y - p.y; corrective[i * 3 + 2] = desired.z - p.z;
    }
    mesh.geometry.morphTargetsRelative = true;
    (mesh.geometry.morphAttributes.position ??= []).push(new THREE.Float32BufferAttribute(corrective, 3));
    mesh.updateMorphTargets();
   }
  }
  for (const [mesh, signature] of fresh) {
    authoredGeometry.set(signature, mesh.geometry.clone());
    // Bound exceptional/custom authoring inputs while retaining the full wardrobe.
    if (authoredGeometry.size > 64) {
      const oldest = authoredGeometry.keys().next().value;
      if (oldest) { authoredGeometry.get(oldest)!.dispose(); authoredGeometry.delete(oldest); }
    }
  }
  const amounts = drapes.map(() => 0);
  setBones(amounts); skirt.updateWorldMatrix(true, true);
  let sway = 0, walkingFlare = 0;
  return {
    update(dt, motion, snap = false) {
      const step = Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, .05) : 0;
      const blend = snap ? 1 : 1 - Math.exp(-step * 13), selected = motion.sitting ? motion.vehicle || 'scooter' : motion.pose;
      for (let i = 0; i < amounts.length; i++) {
        const target = selected === drapes[i].name ? 1 : 0;
        amounts[i] += (target - amounts[i]) * blend;
        if (Math.abs(target - amounts[i]) < 1e-7) amounts[i] = target;
      }
      const seated = Math.min(1, amounts.reduce((a, b) => a + b, 0));
      const phase = Number.isFinite(motion.phase) ? motion.phase : 0;
      const speed = Number.isFinite(motion.speed) ? THREE.MathUtils.clamp(motion.speed, 0, 8) : 0;
      const strength = motion.dancing ? .035 : motion.moving ? Math.min(.022, speed * .0055) : 0;
      sway += (strength - sway) * blend;
      if (sway < 1e-8) sway = 0;
      const walkingTarget = motion.moving && !motion.sitting ? .34 * Math.min(1, speed / 4.5) : 0;
      walkingFlare += (walkingTarget - walkingFlare) * blend;
      if (Math.abs(walkingFlare) < 1e-8) walkingFlare = 0;
      setBones(amounts);
      for (let i = 0; i < 4; i++) {
        // Thighs sweep forward AND backward. Open opposite panels outward;
        // moving both side panels forward left the rear leg without clearance.
        const allowance = i === 0 ? walkingFlare : i === 2 ? -walkingFlare : 0;
        panels[i].rotation.x -= allowance;
        hems[i].rotation.x += allowance * .7;
        const wave = Math.sin(phase + i * Math.PI / 2) * sway * (1 - seated * .85);
        const lateral = i === 1 ? walkingFlare * .5 : i === 3 ? -walkingFlare * .5 : 0;
        panels[i].rotation.z = wave * .3 + lateral; hems[i].rotation.z = wave - lateral * .7;
        hems[i].rotation.x += Math.cos(phase * .9 + i) * sway * .65 * (1 - seated);
      }
      for (const mesh of meshes) for (let i = 0; i < amounts.length; i++) mesh.morphTargetInfluences![i] = amounts[i];
      root.updateWorldMatrix(true, true);
    },
  };
}
