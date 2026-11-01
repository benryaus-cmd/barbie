import * as THREE from 'three';

type HairMotion = { moving: boolean; speed: number; dancing: boolean; phase: number };
type Chain = { side: number; bones: THREE.Bone[]; angle: THREE.Vector3; velocity: THREE.Vector3 };

/** Weighted secondary hair. Create after rigid batching; the cap/fringe stay outside sway. */
export function createHairRig(sway: THREE.Group): { update(dt: number, motion: HairMotion): void; reset(): void } {
  const parts: THREE.Mesh[] = [];
  sway.traverse(node => { if (node instanceof THREE.Mesh && !(node instanceof THREE.SkinnedMesh)) parts.push(node); });
  if (!parts.length) return { update() {}, reset() {} };
  const style = sway.parent?.name ?? '';
  const restraint = style.includes('updo') ? .09 : style.includes('twin-buns') ? .35 : style.includes('bob') ? .6 : 1;
  const root = new THREE.Bone(); root.name = 'hair.fixed-root'; sway.add(root);
  const bones = [root], chains: Chain[] = [];
  const classified: Array<{ mesh: THREE.Mesh; geometry: THREE.BufferGeometry; sides: number[] }> = [];
  const inverse = new THREE.Matrix4();
  sway.updateWorldMatrix(true, true); inverse.copy(sway.matrixWorld).invert();
  const point = new THREE.Vector3();
  // Bake just the secondary meshes into the sway coordinate system. Keep shared colour materials.
  for (const mesh of parts) {
    const geometry = mesh.geometry.clone();
    geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld));
    const position = geometry.getAttribute('position'), sides: number[] = [];
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i);
      sides.push(point.x < -.11 ? -1 : point.x > .11 ? 1 : 0);
      // Keep the original x/y silhouette. A radial push can send a vertex of a
      // back mass onto the front cheek and stretch its triangles across the mouth.
      // This monotone rear shell only moves obstructing geometry behind the head.
      const headY = point.y + sway.position.y;
      let headZ = point.z + sway.position.z;
      if (headY < -.025 && headY > -.235) {
        const back = -.185 * Math.sqrt(Math.max(0, 1 - (point.x / .208) ** 2 - (headY / .25) ** 2));
        if (Math.abs(point.x) < .208) headZ = Math.min(headZ, back);
      }
      if (headY < -.225) {
        const shoulder = THREE.MathUtils.smoothstep(-headY, .225, .265);
        const rx = .105 + shoulder * .178, rz = .087 + shoulder * .103;
        if (Math.abs(point.x) < rx) {
          const back = -rz * Math.sqrt(Math.max(0, 1 - (point.x / rx) ** 2));
          headZ = Math.min(headZ, back);
        }
      }
      point.z = headZ - sway.position.z;
      position.setXYZ(i, point.x, point.y, point.z);
    }
    // Rigid batching expands indexed meshes into triangles. Recomputing their
    // normals alone would turn the soft masses into flat, folded-looking facets.
    geometry.computeVertexNormals();
    const normals = geometry.getAttribute('normal');
    const averages = new Map<string, THREE.Vector3>();
    const keys: string[] = [];
    for (let i = 0; i < position.count; i++) {
      const key = `${Math.round(position.getX(i) * 1e5)},${Math.round(position.getY(i) * 1e5)},${Math.round(position.getZ(i) * 1e5)}`;
      keys.push(key);
      const normal = averages.get(key) ?? new THREE.Vector3();
      normal.x += normals.getX(i); normal.y += normals.getY(i); normal.z += normals.getZ(i); averages.set(key, normal);
    }
    for (const normal of averages.values()) { if (normal.lengthSq() < 1e-12) normal.set(0, 0, -1); else normal.normalize(); }
    for (let i = 0; i < position.count; i++) { const normal = averages.get(keys[i])!; normals.setXYZ(i, normal.x, normal.y, normal.z); }
    classified.push({ mesh, geometry, sides });
  }
  for (const side of [-1, 0, 1]) {
    let low = 0; let used = false;
    for (const part of classified) for (let i = 0; i < part.sides.length; i++) if (part.sides[i] === side) {
      used = true; low = Math.min(low, part.geometry.getAttribute('position').getY(i));
    }
    if (!used) continue;
    const step = Math.max(.07, (.045 - low) / 3), chain: Chain = { side, bones: [], angle: new THREE.Vector3(), velocity: new THREE.Vector3() };
    for (let i = 0; i < 3; i++) {
      const bone = new THREE.Bone(); bone.name = `hair.${side < 0 ? 'left' : side > 0 ? 'right' : 'back'}.${i}`;
      bone.position.set(i ? 0 : side * .17, i ? -step : .045, i ? 0 : side ? .025 : -.055);
      (i ? chain.bones[i - 1] : root).add(bone); chain.bones.push(bone); bones.push(bone);
    }
    // Each chain's depth is stored on its fixed pivot, so weight interpolation follows
    // the actual length of a bob, ponytail, braid or long back mass.
    chain.bones[0].userData.hairStep = step; chains.push(chain);
  }
  sway.updateWorldMatrix(true, true);
  const skeleton = new THREE.Skeleton(bones);
  for (const { mesh, geometry, sides } of classified) {
    const position = geometry.getAttribute('position'), indices: number[] = [], weights: number[] = [];
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), side = sides[i] || (x < 0 ? -1 : 1);
      const edgeChain = chains.find(item => item.side === side);
      const backChain = chains.find(item => item.side === 0);
      const edgeMix = edgeChain ? backChain ? THREE.MathUtils.smoothstep(Math.abs(x), .055, .165) : 1 : 0;
      const rowIndices: number[] = [], rowWeights: number[] = [];
      for (const [chain, mix] of [[backChain, 1 - edgeMix], [edgeChain, edgeMix]] as Array<[Chain | undefined, number]>) {
        if (!chain || mix === 0) { rowIndices.push(0, 0); rowWeights.push(0, 0); continue; }
        const depth = Math.max(0, .045 - position.getY(i));
        const progression = Math.min(3, depth / chain.bones[0].userData.hairStep);
        const lower = Math.floor(progression), blend = progression - lower;
        const a = lower === 0 ? 0 : bones.indexOf(chain.bones[lower - 1]);
        const b = lower >= 3 ? a : bones.indexOf(chain.bones[lower]);
        rowIndices.push(a, b); rowWeights.push((1 - blend) * mix, blend * mix);
      }
      indices.push(...rowIndices); weights.push(...rowWeights);
    }
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
    const skinned = new THREE.SkinnedMesh(geometry, mesh.material);
    skinned.name = mesh.name || 'weighted hair'; skinned.castShadow = mesh.castShadow; skinned.receiveShadow = mesh.receiveShadow;
    // A tiny moving mesh is cheaper to draw than to repeatedly compute animated bounds.
    skinned.frustumCulled = false; sway.add(skinned); skinned.bind(skeleton, sway.matrixWorld);
    mesh.removeFromParent(); mesh.geometry.dispose();
  }
  const previousPosition = new THREE.Vector3(), position = new THREE.Vector3(), delta = new THREE.Vector3();
  const previousRotation = new THREE.Quaternion(), rotation = new THREE.Quaternion(), localRotation = new THREE.Quaternion();
  const inverseRotation = new THREE.Quaternion();
  function capture() {
    sway.updateWorldMatrix(true, false); sway.getWorldPosition(previousPosition); sway.getWorldQuaternion(previousRotation);
  }
  function reset() {
    for (const chain of chains) { chain.angle.set(0, 0, 0); chain.velocity.set(0, 0, 0); for (const bone of chain.bones) bone.quaternion.identity(); }
    capture(); sway.updateWorldMatrix(false, true); skeleton.update();
  }
  reset();
  return {
    reset,
    update(dt, motion) {
      sway.updateWorldMatrix(true, false); sway.getWorldPosition(position); sway.getWorldQuaternion(rotation);
      inverseRotation.copy(rotation).invert(); delta.copy(position).sub(previousPosition).applyQuaternion(inverseRotation).clampLength(0, .12);
      localRotation.copy(previousRotation).invert().multiply(rotation);
      const sign = localRotation.w < 0 ? -1 : 1;
      const turnX = THREE.MathUtils.clamp(localRotation.x * sign * 2, -.5, .5);
      const turnY = THREE.MathUtils.clamp(localRotation.y * sign * 2, -.5, .5);
      const turnZ = THREE.MathUtils.clamp(localRotation.z * sign * 2, -.5, .5);
      previousPosition.copy(position); previousRotation.copy(rotation);
      if (!Number.isFinite(dt) || dt <= 0) return;
      const elapsed = Math.min(dt, 1 / 15), steps = Math.ceil(elapsed / (1 / 120)), h = elapsed / steps;
      const speed = Number.isFinite(motion.speed) ? Math.min(Math.abs(motion.speed), 5) : 0;
      const phase = Number.isFinite(motion.phase) ? motion.phase : 0;
      for (const chain of chains) {
        const a = chain.angle, v = chain.velocity, side = chain.side;
        // Impulses are measured from the actual world head transform, including vehicle
        // translation and turns; the gait is only a small additional excitation.
        v.x += (delta.z * 24 - turnX * 3 + turnY * side * 1.8) * restraint;
        v.z += (-delta.x * 24 - turnZ * 3 + turnY * 1.1) * restraint;
        v.y += -turnY * 1.4 * restraint;
        for (let step = 0; step < steps; step++) {
          const gait = motion.moving ? Math.sin(phase * 2 + side * .6) * speed * .012 : 0;
          const dance = motion.dancing ? Math.sin(phase * 1.6 + side) * .06 : 0;
          v.x += (-82 * a.x - 12 * v.x + (gait + dance) * restraint) * h;
          v.y += (-95 * a.y - 14 * v.y) * h;
          v.z += (-82 * a.z - 12 * v.z + dance * restraint) * h;
          a.addScaledVector(v, h);
        }
        a.x = THREE.MathUtils.clamp(a.x, -.09 * restraint, .16 * restraint);
        a.y = THREE.MathUtils.clamp(a.y, -.025 * restraint, .025 * restraint);
        a.z = THREE.MathUtils.clamp(a.z, -.14 * restraint, .14 * restraint);
        // Back lengths only swing behind the head; side lengths open away from the
        // neck. Distal joints share the bend for a curve rather than a rigid pendulum.
        for (let i = 0; i < chain.bones.length; i++) {
          const amount = [.52, .31, .17][i];
          chain.bones[i].rotation.set(Math.max(0, a.x) * amount, a.y * amount,
            (side ? side * Math.max(0, a.z * side) : a.z) * amount);
        }
      }
      sway.updateWorldMatrix(false, true); skeleton.update();
    },
  };
}
