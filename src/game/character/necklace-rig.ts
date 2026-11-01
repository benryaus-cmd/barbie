import * as THREE from 'three';

type NecklaceMotion = { moving: boolean; speed: number; dancing: boolean; phase: number };

// Skin and the common fitted top are elliptical rather than circular. Projecting
// onto their front surface keeps the chain on fabric at the bust and skin above it.
const shells = [
  { depth: .68, profile: [[.151, .23], [.194, .32], [.204, .37], [.15, .415], [.075, .44]] },
  { depth: .88, profile: [[.067, .415], [.055, .5], [.065, .54]] },
  { depth: .74, profile: [[.17, .26], [.207, .33], [.194, .37]] },
];
function frontSurface(x: number, y: number): number {
  let z = 0;
  for (const { depth, profile } of shells) for (let i = 1; i < profile.length; i++) {
    const [a, low] = profile[i - 1], [b, high] = profile[i];
    if (y >= low && y <= high) {
      const radius = a + (b - a) * (y - low) / (high - low);
      z = Math.max(z, depth * Math.sqrt(Math.max(0, radius * radius - x * x)));
    }
  }
  // The sport collar rises above the fitted bodice; its front trim reaches .152.
  if (y > .37 && y < .454 && Math.abs(x) < .105) {
    const collar = y <= .39 ? .154 : y <= .433 ? Math.max(.082, .154 - (y - .39) * 2) : .082 - (y - .433) * 2;
    z = Math.max(z, collar);
  }
  return z;
}

/** Create after rigid batching so the thin chain's reusable vertex buffer stays live. */
export function createNecklaceRig(
  spine: THREE.Group,
  gold: THREE.MeshStandardMaterial,
  pendantMaterial: THREE.MeshStandardMaterial,
): { root: THREE.Group; update(dt: number, motion: NecklaceMotion): void } {
  const root = new THREE.Group(); root.name = 'heart necklace'; spine.add(root);
  const points = [
    [-.061, .468, .023], [-.074, .435, .067], [-.079, .413, .103],
    [-.069, .381, .156], [-.038, .35, .163], [0, .339, .167],
    [.038, .35, .163], [.069, .381, .156], [.079, .413, .103],
    [.074, .435, .067], [.061, .468, .023],
  ].map(p => new THREE.Vector3(p[0], p[1], p[2]));
  const segments = 48, sides = 6;
  const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, .0023, sides, false);
  const position = geometry.getAttribute('position');
  // Retain a rest copy once. Ring weights leave both neck anchors completely fixed.
  const rest = new Float32Array(position.count * 3), weights = new Float32Array(position.count);
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i);
    const z = Math.max(position.getZ(i), frontSurface(x, y) + .0022);
    position.setXYZ(i, x, y, z); rest.set([x, y, z], i * 3);
    weights[i] = Math.sin(Math.PI * Math.floor(i / (sides + 1)) / segments) ** 2;
  }
  geometry.computeVertexNormals();
  const chain = new THREE.Mesh(geometry, gold); chain.name = 'necklace chain'; chain.frustumCulled = false; root.add(chain);

  const pendant = new THREE.Group(); pendant.name = 'necklace pendant'; root.add(pendant);
  const heart = new THREE.Shape();
  heart.moveTo(0, .006);
  heart.bezierCurveTo(-.012, .023, -.029, .005, 0, -.020);
  heart.bezierCurveTo(.029, .005, .012, .023, 0, .006);
  const heartGeometry = new THREE.ExtrudeGeometry(heart, { depth: .004, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: .001, bevelThickness: .001, curveSegments: 8 });
  heartGeometry.translate(0, 0, -.002);
  const rim = new THREE.Mesh(heartGeometry, gold); pendant.add(rim);
  const gem = new THREE.Mesh(heartGeometry, pendantMaterial); gem.scale.set(.82, .82, .65); gem.position.z = .0024; pendant.add(gem);
  const bail = new THREE.Mesh(new THREE.TorusGeometry(.0037, .0011, 5, 12), gold);
  bail.position.set(0, .011, -.002); pendant.add(bail);
  pendant.position.set(0, .328, .172);

  const offset = new THREE.Vector3(), velocity = new THREE.Vector3();
  const previousPosition = new THREE.Vector3(), currentPosition = new THREE.Vector3(), delta = new THREE.Vector3();
  const previousRotation = new THREE.Quaternion(), currentRotation = new THREE.Quaternion(), inverse = new THREE.Quaternion(), turn = new THREE.Quaternion();
  const gravity = new THREE.Vector3();
  function capture() {
    spine.updateWorldMatrix(true, false); spine.getWorldPosition(previousPosition); spine.getWorldQuaternion(previousRotation);
  }
  function apply() {
    for (let i = 0; i < position.count; i++) {
      const w = weights[i], x = rest[i * 3] + offset.x * w, y = rest[i * 3 + 1] + offset.y * w;
      position.setXYZ(i, x, y, Math.max(rest[i * 3 + 2] + offset.z * w, frontSurface(x, y) + .0022));
    }
    position.needsUpdate = true; geometry.computeVertexNormals();
    pendant.position.set(offset.x, .328 + offset.y, Math.max(.172 + offset.z, frontSurface(offset.x, .348 + offset.y) + .008));
    // A small roll reads as a hanging heart, while its back remains on the cloth.
    pendant.rotation.z = -offset.x * 5;
  }
  capture(); apply();
  return {
    root,
    update(dt, motion) {
      spine.updateWorldMatrix(true, false); spine.getWorldPosition(currentPosition); spine.getWorldQuaternion(currentRotation);
      inverse.copy(currentRotation).invert();
      delta.copy(currentPosition).sub(previousPosition).applyQuaternion(inverse).clampLength(0, .12);
      turn.copy(previousRotation).invert().multiply(currentRotation);
      previousPosition.copy(currentPosition); previousRotation.copy(currentRotation);
      if (!Number.isFinite(dt) || dt <= 0 || dt > .25) {
        offset.set(0, 0, 0); velocity.set(0, 0, 0); apply(); return;
      }
      gravity.set(0, -1, 0).applyQuaternion(inverse);
      const sign = turn.w < 0 ? -1 : 1;
      velocity.x += -delta.x * 1.4 - turn.z * sign * .065;
      velocity.z += -delta.z * 1.4 + turn.x * sign * .065;
      const elapsed = Math.min(dt, 1 / 15), steps = Math.ceil(elapsed * 120), step = elapsed / steps;
      const speed = Number.isFinite(motion.speed) ? Math.min(Math.abs(motion.speed), 5) : 0;
      const phase = Number.isFinite(motion.phase) ? motion.phase : 0;
      for (let i = 0; i < steps; i++) {
        const gait = motion.moving ? Math.sin(phase * 2) * speed * .008 : 0;
        const dance = motion.dancing ? Math.sin(phase * 1.5) * .025 : 0;
        velocity.x += (-90 * offset.x - 15 * velocity.x + gravity.x * .55 + gait + dance) * step;
        velocity.y += (-120 * offset.y - 18 * velocity.y) * step;
        velocity.z += (-90 * offset.z - 15 * velocity.z + gravity.z * .55) * step;
        offset.addScaledVector(velocity, step);
      }
      offset.x = THREE.MathUtils.clamp(offset.x, -.008, .008);
      offset.y = THREE.MathUtils.clamp(offset.y, -.002, .002);
      offset.z = THREE.MathUtils.clamp(offset.z, -.004, .005);
      apply();
    },
  };
}
