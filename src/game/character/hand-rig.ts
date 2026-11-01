import * as THREE from 'three';

export type HandGesture = 'relaxed' | 'open' | 'point' | 'peace' | 'grip' | 'heart';

type FingerName = 'index' | 'middle' | 'ring' | 'pinky' | 'thumb';
type Finger = { name: FingerName; base: THREE.Bone; tip: THREE.Bone; restZ: number };

/**
 * Small stylised hand in the existing avatar's wrist coordinates (metres).
 * The wrist/palm origin is (0,0,0); palm centre is (0,-.029,.004), finger tips
 * reach approximately -.10 Y, and +Z is the front/grasping side of the palm.
 * Thumb and index are on -side X, so the pair mirrors without negative scales.
 *
 * The stable grip is INSIDE the curled fingers at (0,-.055,.023), rather than at
 * the wrist. A prop's canonical +Y shaft runs across the palm along side*X;
 * canonical +Z faces out of the palm. Hence grip.rotation.z = -side*PI/2,
 * and prop +X maps to -side*Y. Carry/swing code can orient the wrist using this
 * basis without baking prop-specific offsets into the hand or changing sockets
 * while gestures blend. Fingers curl in Y/Z around this transverse shaft.
 */
export function createHandRig(
  wrist: THREE.Object3D,
  side: -1 | 1,
  skin: THREE.MeshStandardMaterial,
  shade: THREE.MeshStandardMaterial,
): {
  root: THREE.Group;
  grip: THREE.Object3D;
  palm: THREE.Object3D;
  bones: Record<string, THREE.Bone>;
  setGesture(gesture: HandGesture): void;
  update(dt: number): void;
} {
  const root = new THREE.Group();
  root.name = side < 0 ? 'hand.L' : 'hand.R';
  wrist.add(root);
  const palm = new THREE.Bone();
  palm.name = 'palm';
  root.add(palm);
  const bones: Record<string, THREE.Bone> = { palm };
  const skeletonBones = [palm];
  const fingers: Finger[] = [];
  const positions: number[] = [], skinIndices: number[] = [], weights: number[] = [], indices: number[] = [];
  const groups: Array<{ start: number; count: number; materialIndex: number }> = [];

  // Append smooth low-resolution rounded surfaces into a single weighted mesh.
  // Every digit is continuous across its bend and blends two real bone weights.
  function surface(
    rows: number,
    columns: number,
    point: (v: number, angle: number) => THREE.Vector3,
    influence: (v: number) => [number, number, number],
    materialIndex = 0,
  ) {
    const offset = positions.length / 3, start = indices.length;
    for (let row = 0; row <= rows; row++) {
      const v = row / rows;
      const [a, b, blend] = influence(v);
      for (let col = 0; col <= columns; col++) {
        const p = point(v, col / columns * Math.PI * 2);
        positions.push(p.x, p.y, p.z);
        skinIndices.push(a, b, 0, 0);
        weights.push(1 - blend, blend, 0, 0);
      }
    }
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const a = offset + row * (columns + 1) + col, b = a + columns + 1;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
    const previous = groups[groups.length - 1];
    if (previous?.materialIndex === materialIndex) previous.count += indices.length - start;
    else groups.push({ start, count: indices.length - start, materialIndex });
  }
  surface(10, 16, (v, a) => {
    const t = v * Math.PI, r = Math.sin(t);
    return new THREE.Vector3(Math.cos(a) * r * .032, -.029 + Math.cos(t) * .032, .004 + Math.sin(a) * r * .017);
  }, () => [0, 0, 0]);

  for (const [name, across, y, length, radius, restSpread] of [
    ['index', -.021, -.049, .044, .0082, -.055],
    ['middle', -.007, -.052, .048, .0084, -.015],
    ['ring', .008, -.050, .044, .0079, .035],
    ['pinky', .022, -.045, .036, .0068, .13],
    ['thumb', -.026, -.030, .036, .010, -.65],
  ] as const) {
    const base = new THREE.Bone(), tip = new THREE.Bone();
    base.name = `${name}.base`; tip.name = `${name}.tip`;
    base.position.set(side * across, y, name === 'thumb' ? .007 : .004);
    base.rotation.z = side * restSpread;
    tip.position.y = -length * .5;
    palm.add(base); base.add(tip);
    const baseIndex = skeletonBones.length;
    skeletonBones.push(base, tip);
    bones[base.name] = base; bones[tip.name] = tip;
    fingers.push({ name, base, tip, restZ: base.rotation.z });
    base.updateMatrix();
    surface(12, 10, (v, a) => {
      // Capsule hemispheres preserve finger width through the articulation.
      const cap = Math.min(1, v * length / radius, (1 - v) * length / radius);
      const r = radius * Math.sqrt(Math.max(0, 1 - (1 - cap) ** 2)) * (1 - .16 * v);
      return new THREE.Vector3(Math.cos(a) * r, -v * length, Math.sin(a) * r * .88).applyMatrix4(base.matrix);
    }, v => [baseIndex, baseIndex + 1, THREE.MathUtils.smoothstep(v, .34, .66)]);
  }

  // A single subtle wrist crease uses the supplied shade reference as a second
  // material group; recolouring the original materials also recolours the hand.
  surface(2, 8, (v, a) => new THREE.Vector3(Math.cos(a) * .020, -.009 - v * .0011, .016 + Math.sin(a) * .0006), () => [0, 0, 0], 1);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  geometry.setIndex(indices);
  for (const group of groups) geometry.addGroup(group.start, group.count, group.materialIndex);
  geometry.computeVertexNormals();
  const mesh = new THREE.SkinnedMesh(geometry, [skin, shade]);
  mesh.name = 'articulated hand skin';
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  root.add(mesh);
  root.updateWorldMatrix(true, true);
  mesh.bind(new THREE.Skeleton(skeletonBones));

  const grip = new THREE.Object3D();
  grip.name = side < 0 ? 'grip.L' : 'grip.R';
  grip.position.set(0, -.055, .023);
  grip.rotation.z = -side * Math.PI / 2;
  palm.add(grip);
  let gesture: HandGesture = 'relaxed';

  function update(dt: number) {
    // Ignore invalid/negative deltas; cap resumed frames for smooth transitions.
    const step = Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, .1) : 0;
    const blend = 1 - Math.exp(-step * 18);
    for (const finger of fingers) {
      const { name, base, tip, restZ } = finger;
      const thumb = name === 'thumb';
      let curl = gesture === 'relaxed' ? .23 : gesture === 'open' ? 0 : 1;
      if (gesture === 'point' && name === 'index') curl = 0;
      if (gesture === 'peace' && (name === 'index' || name === 'middle')) curl = 0;
      if (gesture === 'heart' && name === 'index') curl = .38;
      if (gesture === 'heart' && thumb) curl = .46;
      const x = -(thumb ? .42 : 1.10) * curl;
      const tipX = -(thumb ? 1.10 : 1.55) * curl;
      let z = thumb ? THREE.MathUtils.lerp(restZ, side * .50, curl) : restZ;
      if (gesture === 'open' && !thumb) z += side * (name === 'index' ? -.09 : name === 'pinky' ? .10 : 0);
      if (gesture === 'peace') z += side * (name === 'index' ? -.16 : name === 'middle' ? .13 : 0);
      if (gesture === 'heart' && name === 'index') z -= side * .30;
      if (gesture === 'heart' && thumb) z = side * 1.05;
      base.rotation.x = THREE.MathUtils.lerp(base.rotation.x, x, blend);
      base.rotation.z = THREE.MathUtils.lerp(base.rotation.z, z, blend);
      tip.rotation.x = THREE.MathUtils.lerp(tip.rotation.x, tipX, blend);
    }
    // Updates ancestors too, so CPU checks and standalone previews see the same
    // transforms as a renderer even when wrist movement happened this frame.
    root.updateWorldMatrix(true, true);
  }
  return { root, grip, palm, bones, setGesture(next) { gesture = next; }, update };
}
