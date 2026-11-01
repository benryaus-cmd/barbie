import * as THREE from 'three';

type Leg = { hip: THREE.Object3D; knee: THREE.Object3D; ankle: THREE.Object3D };
type Influence = Array<[number, number]>;
const SEGMENTS = 64;
const smooth = (a: number, b: number, value: number) => THREE.MathUtils.smoothstep(value, a, b);

/** A sewn pair-of-pants surface: one fitted waistband branches through a shared
 * saddle seam into two legs. Only the waist and the two hems are open boundaries.
 * The pelvis stays fitted while the thigh and calf follow the avatar's real joints. */
export function createTrouserRig(
  pelvis: THREE.Object3D, legs: Leg[], fabric: THREE.MeshStandardMaterial,
  trim: THREE.MeshStandardMaterial, kind: 'shorts' | 'palazzo',
): { root: THREE.Group; update(): void } {
  const root = new THREE.Group(); root.name = `${kind} fitted trouser rig`; pelvis.add(root);
  const waist = new THREE.Bone(); waist.name = `${kind}.waist`; root.add(waist);
  const bones = [waist];
  const hipBones: THREE.Bone[] = [], kneeBones: THREE.Bone[] = [];
  for (let side = 0; side < 2; side++) {
    const hip = new THREE.Bone(), knee = new THREE.Bone();
    hip.name = `${kind}.hip.${side}`; knee.name = `${kind}.knee.${side}`;
    hip.position.copy(legs[side].hip.position); knee.position.copy(legs[side].knee.position);
    waist.add(hip); hip.add(knee); hipBones.push(hip); kneeBones.push(knee); bones.push(hip, knee);
  }
  const positions: number[] = [], uvs: number[] = [], skinIndices: number[] = [], skinWeights: number[] = [], triangles: number[] = [];
  const vertex = (x: number, y: number, z: number, influence: Influence, u = 0, v = 0) => {
    const index = positions.length / 3; positions.push(x, y, z); uvs.push(u, v);
    for (let i = 0; i < 4; i++) { skinIndices.push(influence[i]?.[0] ?? 0); skinWeights.push(influence[i]?.[1] ?? 0); }
    return index;
  };
  const point = (index: number) => new THREE.Vector3().fromArray(positions, index * 3);
  const influence = (index: number): Influence => Array.from({ length: 4 }, (_, i) => [skinIndices[index * 4 + i], skinWeights[index * 4 + i]]);
  const join = (a: number[], b: number[], reverse = false, target = triangles) => {
    for (let j = 0; j < SEGMENTS; j++) {
      const n = (j + 1) % SEGMENTS;
      if (reverse) target.push(a[j], b[n], a[n], a[j], b[j], b[n]);
      else target.push(a[j], a[n], b[n], a[j], b[n], b[j]);
    }
  };
  let previous: number[] = [];
  for (const [radius, y] of [[.17, .062], [.177, .047], [.19, .022], [.201, -.025], [.203, -.055], [.196, -.08], [.181, -.10], [.166, -.125]]) {
    const row: number[] = [];
    for (let j = 0; j < SEGMENTS; j++) {
      const angle = j / SEGMENTS * Math.PI * 2;
      const c = Math.cos(angle);
      row.push(vertex(radius * c, y, radius * .79 * Math.sin(angle), [[0, 1]], j / SEGMENTS, y * 2));
    }
    if (previous.length) join(previous, row); previous = row;
  }
  const hipRing = previous;
  const saddle = new Map<number, number>();
  const hems: number[][] = [];
  for (let side = 0; side < 2; side++) {
    const sign = side === 0 ? -1 : 1, hipIndex = 1 + side * 2, kneeIndex = hipIndex + 1;
    const first: number[] = [];
    for (let j = 0; j < SEGMENTS; j++) {
      const angle = j / SEGMENTS * Math.PI * 2, c = Math.cos(angle), s = Math.sin(angle);
      if (j <= SEGMENTS / 4 || j >= SEGMENTS * 3 / 4) {
        first.push(hipRing[side === 0 ? (SEGMENTS / 2 - j + SEGMENTS) % SEGMENTS : j]);
      } else {
        let index = saddle.get(j);
        if (index === undefined) {
          const y = -.125 - .09 * -c;
          index = vertex(0, y, .166 * .79 * s, [[0, 1]], .5, y * 2);
          saddle.set(j, index);
        }
        first.push(index);
      }
    }
    let row = first;
    const legRow = (y: number, radius: number) => Array.from({ length: SEGMENTS }, (_, j) => {
      const angle = j / SEGMENTS * Math.PI * 2;
      const knee = kind === 'palazzo' ? smooth(.37, .53, -y) : 0;
      return vertex(sign * (.108 + radius * Math.cos(angle)), y, radius * .96 * Math.sin(angle), [[hipIndex, 1 - knee], [kneeIndex, knee]], j / SEGMENTS, y * 2);
    });
    const landingY = -.235, landingRadius = kind === 'shorts' ? .099 : .105;
    // The upper leg enters the fitted hip shell through an inset gusset.
    // Keeping this overlap inside the seat lets a raised thigh retain its full
    // rounded section while the seat still encloses the fixed pelvis.
    for (const [y, radius] of [[-.04, .096], [-.08, .098], [-.12, .1], [-.16, .101], [-.20, .1], [landingY, landingRadius]]) {
      const next = legRow(y, radius); join(row, next, side === 0); row = next;
    }
    const profile = kind === 'shorts' ? [[-.272, .089]] : [
      [-.29, .108], [-.34, .111], [-.38, .113], [-.415, .115], [-.45, .116],
      [-.485, .117], [-.52, .119], [-.56, .121], [-.61, .124], [-.67, .128], [-.73, .131], [-.815, .135],
    ];
    for (const [y, radius] of profile) { const next = legRow(y, radius); join(row, next, side === 0); row = next; }
    hems.push(row);
  }
  const geometry = (indices: number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
    g.setIndex(indices); g.computeVertexNormals(); g.computeBoundingSphere(); return g;
  };
  const surface = new THREE.SkinnedMesh(geometry(triangles), fabric);
  surface.name = `${kind} sewn waist seat and legs`; surface.castShadow = surface.receiveShadow = true;
  surface.frustumCulled = false; root.add(surface);

  // Narrow stitched bands use precisely the same joint field as the fabric.
  // Their slight offset avoids coplanar shimmer without opening a second shell.
  const trimTriangles: number[] = [];
  const trimBand = (source: number[], height: number) => {
    const outer: number[] = [], inner: number[] = [];
    for (const id of source) {
      const p = point(id), centerX = Math.abs(p.x) > .025 && p.y < -.2 ? Math.sign(p.x) * .108 : 0;
      const radial = new THREE.Vector3(p.x - centerX, 0, p.z).normalize().multiplyScalar(.0015);
      outer.push(vertex(p.x + radial.x, p.y + height, p.z + radial.z, influence(id)));
      inner.push(vertex(p.x + radial.x, p.y, p.z + radial.z, influence(id)));
    }
    join(outer, inner, false, trimTriangles);
  };
  // Geometry captures vertex arrays, so build the fabric before adding trim vertices.
  trimBand(Array.from({ length: SEGMENTS }, (_, i) => i), -.005);
  for (const hem of hems) trimBand(hem, .006);
  const stitchMaterial = trim.clone(); stitchMaterial.side = THREE.DoubleSide;
  const stitches = new THREE.SkinnedMesh(geometry(trimTriangles), stitchMaterial);
  stitches.name = `${kind} weighted waistband and hem stitches`; stitches.castShadow = true; stitches.frustumCulled = false; root.add(stitches);
  root.updateWorldMatrix(true, true);
  const skeleton = new THREE.Skeleton(bones);
  surface.bind(skeleton); stitches.bind(skeleton);
  const update = () => {
    for (let i = 0; i < 2; i++) {
      hipBones[i].position.copy(legs[i].hip.position); hipBones[i].quaternion.copy(legs[i].hip.quaternion);
      kneeBones[i].position.copy(legs[i].knee.position); kneeBones[i].quaternion.copy(legs[i].knee.quaternion);
    }
    root.updateWorldMatrix(true, true);
  };
  update(); return { root, update };
}
