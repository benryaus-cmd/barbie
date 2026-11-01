import * as THREE from 'three';
import { createSurfaceMap, type SurfaceMap } from './surface-map';

type NecklaceMotion = { moving: boolean; speed: number; dancing: boolean; phase: number };

// Standalone rigs can use the torso's direct skin mesh; the avatar supplies a map
// containing its skin plus ONLY the selected top. No outfit-wide collar envelope.
function defaultSurface(spine: THREE.Object3D): SurfaceMap {
  return createSurfaceMap(spine.children.filter((node): node is THREE.Mesh => node instanceof THREE.Mesh), spine);
}

/** Create after rigid batching so the thin chain's reusable vertex buffer stays live. */
export function createNecklaceRig(
  spine: THREE.Object3D,
  gold: THREE.MeshStandardMaterial,
  pendantMaterial: THREE.MeshStandardMaterial,
): { root: THREE.Group; setSurface(surface: SurfaceMap): void; update(dt: number, motion: NecklaceMotion): void } {
  let surface = defaultSurface(spine);
  const root = new THREE.Group(); root.name = 'heart necklace'; spine.add(root);
  const points = [
    [-.054, .468], [-.074, .435], [-.079, .413], [-.069, .381],
    [-.038, .35], [0, .339], [.038, .35], [.069, .381],
    [.079, .413], [.074, .435], [.054, .468],
  ].map(p => new THREE.Vector3(p[0], p[1], 0));
  const segments = 48, sides = 6, radius = .00165;
  const path = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(path, segments, radius, sides, false);
  const position = geometry.getAttribute('position');
  // Keep XY and tube thickness, never a previous outfit's front depth.
  const rest = new Float32Array(position.array), weights = new Float32Array(position.count);
  const hangingDepth = new Float32Array(segments + 1), restDepth = new Float32Array(position.count);
  function rebaseSurface() {
    const supported: number[] = [];
    for (let ring = 0; ring <= segments; ring++) {
      const point = path.getPointAt(ring / segments), support = surface.sample(point.x, point.y);
      hangingDepth[ring] = support?.z ?? NaN; if (support) supported.push(ring);
    }
    for (let ring = 0; ring <= segments; ring++) if (!Number.isFinite(hangingDepth[ring])) {
      const low = supported.filter(index => index < ring).pop(), high = supported.find(index => index > ring);
      hangingDepth[ring] = low !== undefined && high !== undefined ? THREE.MathUtils.lerp(hangingDepth[low], hangingDepth[high], (ring - low) / (high - low)) : hangingDepth[low ?? high ?? 0] || 0;
    }
    for (let i = 0; i < position.count; i++) restDepth[i] = surface.sample(rest[i * 3], rest[i * 3 + 1])?.z ?? hangingDepth[Math.floor(i / (sides + 1))];
  }
  rebaseSurface();
  for (let i = 0; i < position.count; i++) weights[i] = Math.sin(Math.PI * Math.floor(i / (sides + 1)) / segments) ** 2;
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
  const gem = new THREE.Mesh(heartGeometry.clone(), pendantMaterial); gem.scale.set(.82, .82, .65); gem.position.z = .0024; pendant.add(gem);
  const bail = new THREE.Mesh(new THREE.TorusGeometry(.0037, .0011, 5, 12), gold);
  bail.position.set(0, .011, -.002); pendant.add(bail);
  pendant.position.set(0, .328, 0);
  const pendantParts: Array<{ mesh: THREE.Mesh; rest: Float32Array; transform: THREE.Matrix4; inverse: THREE.Matrix4; minDepth: number }> = [];
  pendant.updateMatrix();
  for (const part of [rim, gem, bail]) {
    part.frustumCulled = false;
    part.updateMatrix(); const transform = part.matrix.clone(), inverse = transform.clone().invert();
    const positions = part.geometry.getAttribute('position'), rest = new Float32Array(positions.array);
    let minDepth = Infinity;
    for (let i = 0; i < positions.count; i++) minDepth = Math.min(minDepth, new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(transform).z);
    pendantParts.push({ mesh: part, rest, transform, inverse, minDepth });
  }
  const pendantPoint = new THREE.Vector3(), pendantTransform = new THREE.Matrix4(), pendantInverse = new THREE.Matrix4();

  const offset = new THREE.Vector3(), velocity = new THREE.Vector3();
  const previousPosition = new THREE.Vector3(), currentPosition = new THREE.Vector3(), delta = new THREE.Vector3();
  const previousRotation = new THREE.Quaternion(), currentRotation = new THREE.Quaternion(), inverse = new THREE.Quaternion(), turn = new THREE.Quaternion();
  const gravity = new THREE.Vector3();
  function capture() {
    spine.updateWorldMatrix(true, false); spine.getWorldPosition(previousPosition); spine.getWorldQuaternion(previousRotation);
  }
  function apply() {
    for (let i = 0; i < position.count; i++) {
      const w = weights[i], ring = Math.floor(i / (sides + 1));
      let x = rest[i * 3] + offset.x * w, y = rest[i * 3 + 1] + offset.y * w, support = surface.sample(x, y);
      // Raised trim can have a sharp side. Reduce sliding at that edge instead of
      // letting tiny lateral motion jump the chain several centimeters in depth.
      for (let attempt = 0; attempt < 5 && Math.abs((support?.z ?? hangingDepth[ring]) - restDepth[i]) > .012; attempt++) {
        const fraction = attempt === 4 ? 0 : .35;
        x = THREE.MathUtils.lerp(rest[i * 3], x, fraction); y = THREE.MathUtils.lerp(rest[i * 3 + 1], y, fraction); support = surface.sample(x, y);
      }
      // The tube's back rests just above skin/cloth. Unsupported short spans keep
      // their shallow hanging arc; supported points cannot retain a floating rest Z.
      const depth = support?.z ?? hangingDepth[ring];
      const lift = .0007 + (rest[i * 3 + 2] + radius) + Math.max(0, offset.z) * w * .12;
      position.setXYZ(i, x, y, depth + lift);
    }
    position.needsUpdate = true; geometry.computeVertexNormals();
    pendant.position.set(offset.x, .328 + offset.y, 0);
    pendant.rotation.z = -offset.x * 5; pendant.updateMatrix();
    pendantTransform.copy(pendant.matrix); pendantInverse.copy(pendantTransform).invert();
    // A gently curved pendant back follows the same support. Retain the authored
    // extrusion/bevel thickness instead of flattening the heart into an applique.
    for (const part of pendantParts) {
      const positions = part.mesh.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        pendantPoint.fromArray(part.rest, i * 3).applyMatrix4(part.transform);
        const thickness = pendantPoint.z - part.minDepth;
        pendantPoint.applyMatrix4(pendantTransform);
        const support = surface.sample(pendantPoint.x, pendantPoint.y);
        pendantPoint.z = (support?.z ?? hangingDepth[segments / 2]) + .0008 + thickness + (part.mesh === gem ? .002 : 0);
        pendantPoint.applyMatrix4(pendantInverse).applyMatrix4(part.inverse);
        positions.setXYZ(i, pendantPoint.x, pendantPoint.y, pendantPoint.z);
      }
      positions.needsUpdate = true; part.mesh.geometry.computeVertexNormals();
    }
  }
  capture(); apply();
  return {
    root,
    setSurface(next) {
      surface = next;
      rebaseSurface();
      offset.set(0, 0, 0); velocity.set(0, 0, 0); apply();
    },
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
