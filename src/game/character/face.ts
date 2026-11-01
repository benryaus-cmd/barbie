import * as THREE from 'three';
import { createSurfaceMap } from './surface-map';

type Mat = THREE.MeshStandardMaterial;
export type FaceMaterials = { skin: Mat; shade: Mat; ivory: Mat; ink: Mat; lips: Mat; blush: Mat; eyeshadow: Mat };
export type FaceLook = { eyeStyle?: 'soft' | 'almond' | 'wide'; mouthStyle?: 'smile' | 'soft' | 'full'; eyeColor?: string };
export type FaceController = { setLook(look: FaceLook): void; update(dt: number, pose: string, moving: boolean): void };
type Point = [number, number, number];

// Used only for a standalone face without a supplied skin mesh. Real avatars bake their authored head.
const fallbackFaceZ = (x: number, y: number) => .161 * Math.sqrt(Math.max(.02, 1 - (x / .186) ** 2 - (y / .232) ** 2));
function mesh(parent: THREE.Object3D, name: string, geometry: THREE.BufferGeometry, material: Mat) {
  const result = new THREE.Mesh(geometry, material); result.name = name;
  result.castShadow = false; result.receiveShadow = false; parent.add(result); return result;
}
function oval(parent: THREE.Object3D, name: string, material: Mat, position: Point, scale: Point) {
  const result = mesh(parent, name, new THREE.SphereGeometry(1, 20, 12), material);
  result.position.set(...position); result.scale.set(...scale); return result;
}
function curve(parent: THREE.Object3D, name: string, material: Mat, points: Point[], width: number) {
  return mesh(parent, name, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 16, width, 5, false), material);
}
function tessellateShape(shape: THREE.Shape) {
  const geometry = new THREE.ShapeGeometry(shape, 18), attribute = geometry.getAttribute('position');
  const points = Array.from({ length: attribute.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(attribute, i));
  let triangles = Array.from(geometry.index!.array);
  // ShapeGeometry triangulates the outline only. Interior vertices are necessary for a
  // narrow patch to follow real curved skin between its opposite edges as well.
  for (let pass = 0; pass < 5; pass++) {
    const next: number[] = [], midpoints = new Map<string, number>(); let divided = false;
    const midpoint = (a: number, b: number) => {
      const key = a < b ? `${a}:${b}` : `${b}:${a}`, existing = midpoints.get(key);
      if (existing !== undefined) return existing;
      const index = points.length; points.push(points[a].clone().add(points[b]).multiplyScalar(.5)); midpoints.set(key, index); return index;
    };
    for (let i = 0; i < triangles.length; i += 3) {
      const [a, b, c] = triangles.slice(i, i + 3);
      if (Math.max(points[a].distanceToSquared(points[b]), points[b].distanceToSquared(points[c]), points[c].distanceToSquared(points[a])) <= .01 ** 2) next.push(a, b, c);
      else { const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a); next.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca); divided = true; }
    }
    triangles = next; if (!divided) break;
  }
  geometry.deleteAttribute('uv'); geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flatMap(point => point.toArray()), 3)); geometry.setIndex(triangles);
  return geometry;
}
function curvedShape(shape: THREE.Shape, cx: number, cy: number, lift: number, bulge = 0, faceZ = fallbackFaceZ) {
  const geometry = tessellateShape(shape), positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i);
    positions.setZ(i, faceZ(cx + x, cy + y) + lift + bulge * Math.max(0, 1 - Math.abs(x) / .05));
  }
  geometry.computeVertexNormals(); return geometry;
}
function noseGeometry(faceZ = fallbackFaceZ) {
  const columns = 24, rows = 36, positions: number[] = [], indices: number[] = [];
  for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
    const x = -.032 + column / columns * .064, y = -.062 + row / rows * .099;
    const bridge = .007 * Math.exp(-((x / .011) ** 2) - ((y + .002) / .030) ** 2);
    const tip = .017 * Math.exp(-((x / .015) ** 2) - ((y + .028) / .017) ** 2);
    const wings = .003 * (Math.exp(-(((x - .013) / .007) ** 2) - ((y + .034) / .010) ** 2) +
      Math.exp(-(((x + .013) / .007) ** 2) - ((y + .034) / .010) ** 2));
    // Zero height and slope at the patch perimeter; its border sits inside the head.
    // A single smooth field joins bridge, soft tip and underside without overlapping solids.
    const edgeX = Math.max(0, 1 - (x / .032) ** 2) ** 2;
    const edgeY = Math.max(0, 1 - ((y + .0125) / .0495) ** 2) ** 2;
    positions.push(x, y, faceZ(x, y) - .0016 + (bridge + tip + wings) * edgeX * edgeY);
    if (row < rows && column < columns) {
      const a = row * (columns + 1) + column, b = a + columns + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}
function feather(parent: THREE.Object3D, name: string, material: Mat, cx: number, cy: number, rx: number, ry: number, opacity: number, faceZ = fallbackFaceZ) {
  const positions: number[] = [], colors: number[] = [], indices: number[] = [], sectors = 24, rings = 4;
  for (let ring = 0; ring <= rings; ring++) for (let i = 0; i <= sectors; i++) {
    const radius = ring / rings, angle = i / sectors * Math.PI * 2;
    const x = cx + Math.cos(angle) * rx * radius, y = cy + Math.sin(angle) * ry * radius;
    positions.push(x, y, faceZ(x, y) + .0014);
    colors.push(1, 1, 1, Math.pow(1 - radius * radius, 2) * opacity);
    if (ring < rings && i < sectors) {
      const a = ring * (sectors + 1) + i, b = a + sectors + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return mesh(parent, name, geometry, material);
}

/** Add AFTER rigid geometry batching; the animated eyelids, iris rigs and lips must remain separate. */
export function createFace(head: THREE.Object3D, materials: FaceMaterials): FaceController {
  // Batching merges the head and ears into a direct child with the shared skin material.
  // Bake before adding the nose/features so decoration cannot become its own support.
  const skinMeshes = head.children.filter((node): node is THREE.Mesh => node instanceof THREE.Mesh && node.material === materials.skin);
  const surface = createSurfaceMap(skinMeshes, head);
  const faceZ = (x: number, y: number) => surface.sample(x, y)?.z ?? fallbackFaceZ(x, y);
  const root = new THREE.Group(); root.name = 'face features'; head.add(root);
  const features = new THREE.Group(); root.add(features);
  const irisMaterial = new THREE.MeshStandardMaterial({ color: 0x278eae, roughness: .34 });
  const irisRim = irisMaterial.clone();
  const lowerLid = materials.shade.clone(); lowerLid.transparent = true; lowerLid.opacity = .55;
  const browMaterial = materials.ink.clone(); browMaterial.color.lerp(materials.shade.color, .28);
  const seamMaterial = materials.lips.clone();
  const glowMaterial = materials.ivory.clone(); glowMaterial.transparent = true; glowMaterial.opacity = .45;
  const blushMaterial = materials.blush.clone(), shadowMaterial = materials.eyeshadow.clone();
  for (const material of [blushMaterial, shadowMaterial]) {
    material.transparent = true; material.vertexColors = true; material.depthWrite = false;
    material.roughness = .9; material.polygonOffset = true; material.polygonOffsetFactor = -1;
  }
  const eyes: Array<{ opening: THREE.Group; gaze: THREE.Group; brow: THREE.Object3D; side: number }> = [];
  let mouth = new THREE.Group(), time = 0, expression = 0;
  const animatedLips: Array<{ mesh: THREE.Mesh; rest: Float32Array; lift: Float32Array }> = [];
  const projected = new THREE.Vector3(), localInverse = new THREE.Matrix4(), relative = new THREE.Matrix4();
  function attachLip(part: THREE.Mesh) {
    const positions = part.geometry.getAttribute('position'), rest = new Float32Array(positions.array), lift = new Float32Array(positions.count);
    for (let i = 0; i < positions.count; i++) lift[i] = positions.getZ(i) - faceZ(positions.getX(i), -.095 + positions.getY(i));
    animatedLips.push({ mesh: part, rest, lift });
  }
  let look: Required<FaceLook> = { eyeStyle: 'soft', mouthStyle: 'smile', eyeColor: '#278eae' };
  function build() {
    features.traverse(node => { if (node instanceof THREE.Mesh) node.geometry.dispose(); });
    features.clear(); eyes.length = 0; animatedLips.length = 0;
    const eyeShape = { soft: { width: .048, height: .024, tilt: .003 }, almond: { width: .051, height: .0195, tilt: .006 }, wide: { width: .045, height: .029, tilt: .0015 } }[look.eyeStyle];
    for (const side of [-1, 1]) {
      const suffix = side < 0 ? 'L' : 'R', cx = side * .074, cy = .032;
      const eye = new THREE.Group(); eye.name = `eye.${suffix}`; eye.position.set(cx, cy, 0); features.add(eye);
      feather(features, `eyeshadow.${suffix}`, shadowMaterial, cx, cy + eyeShape.height + .008, eyeShape.width * 1.08, .013, .32, faceZ);
      const opening = new THREE.Group(); opening.name = `eye opening.${suffix}`; eye.add(opening);
      const { width: w, height: h, tilt } = eyeShape;
      const shape = new THREE.Shape(); shape.moveTo(-w, -side * tilt);
      shape.bezierCurveTo(-w * .5, h * .98 - side * tilt, w * .43, h * 1.08 + side * tilt, w, side * tilt);
      shape.bezierCurveTo(w * .5, -h * .9 + side * tilt, -w * .5, -h * .85 - side * tilt, -w, -side * tilt);
      mesh(opening, `eye white.${suffix}`, curvedShape(shape, cx, cy, .0055, .005, faceZ), materials.ivory);
      const gaze = new THREE.Group(); gaze.name = `gaze.${suffix}`; gaze.position.set(-side * .002, -.001, faceZ(cx, cy) + .012); opening.add(gaze);
      oval(gaze, `iris rim.${suffix}`, irisRim, [0, 0, 0], [.0205, h * .75, .004]);
      oval(gaze, `iris.${suffix}`, irisMaterial, [0, 0, .002], [.0176, h * .69, .0035]);
      oval(gaze, `pupil.${suffix}`, materials.ink, [0, .0005, .005], [.0081, h * .50, .0025]);
      oval(gaze, `eye glint.${suffix}`, materials.ivory, [-.006, .008, .0075], [.0046, .005, .0018]);
      oval(gaze, `eye glint small.${suffix}`, materials.ivory, [.0055, -.006, .007], [.002, .0023, .0012]);
      const upper: Point[] = [], lower: Point[] = [];
      for (let i = 0; i <= 8; i++) {
        const u = i / 8, x = (u * 2 - 1) * w;
        const y = Math.sin(u * Math.PI) * h * .79 + side * tilt * (u * 2 - 1);
        upper.push([x, y, faceZ(cx + x, cy + y) + .008]);
        const ly = -Math.sin(u * Math.PI) * h * .65 + side * tilt * (u * 2 - 1);
        lower.push([x, ly, faceZ(cx + x, cy + ly) + .007]);
      }
      curve(opening, `upper lashline.${suffix}`, materials.ink, upper, .0018);
      curve(opening, `lower lid.${suffix}`, lowerLid, lower, .0011);
      // A few fine outer lashes preserve a soft eye silhouette at close and game views.
      for (let lash = 0; lash < 3; lash++) {
        const x = side * (w * (.72 + lash * .10)), y = h * (.53 - lash * .16) + tilt;
        curve(opening, `lash.${suffix}.${lash}`, materials.ink, [[x, y, faceZ(cx + x, cy + y) + .009], [x + side * (.007 + lash * .0015), y + .008 - lash * .001, faceZ(cx + x, cy + y) + .009]], .00125 - lash * .00015);
      }
      const brow = new THREE.Group(); brow.name = `brow.${suffix}`; features.add(brow);
      const browPoints: Point[] = [];
      for (let i = 0; i <= 6; i++) {
        const u = i / 6, x = side * (.030 + u * .09), y = .087 + Math.sin(u * Math.PI) * .009 - u * .003;
        browPoints.push([x, y, faceZ(x, y) + .004]);
      }
      curve(brow, `brow arch.${suffix}`, browMaterial, browPoints, .0032);
      feather(features, `blush.${suffix}`, blushMaterial, side * .111, -.047, .037, .019, .32, faceZ);
      eyes.push({ opening, gaze, brow, side });
    }
    mesh(features, 'nose continuous surface', noseGeometry(faceZ), materials.skin);
    mouth = new THREE.Group(); mouth.name = 'mouth'; mouth.position.y = -.095; features.add(mouth);
    const mouthShape = { smile: { w: .038, upper: .009, lower: .012, corner: .005 }, soft: { w: .031, upper: .008, lower: .010, corner: .001 }, full: { w: .037, upper: .013, lower: .017, corner: .002 } }[look.mouthStyle];
    const { w, upper, lower, corner } = mouthShape;
    const top = new THREE.Shape(); top.moveTo(-w, corner);
    top.bezierCurveTo(-w * .66, corner + upper * .5, -w * .39, upper * 1.38, -w * .19, upper * .83);
    top.quadraticCurveTo(0, upper * .32, w * .19, upper * .83);
    top.bezierCurveTo(w * .39, upper * 1.38, w * .66, corner + upper * .5, w, corner);
    top.quadraticCurveTo(0, -.0035, -w, corner);
    attachLip(mesh(mouth, 'cupid bow upper lip', curvedShape(top, 0, -.095, .0008, .0013, faceZ), materials.lips));
    const bottom = new THREE.Shape(); bottom.moveTo(-w, corner);
    bottom.quadraticCurveTo(0, -.004, w, corner);
    bottom.bezierCurveTo(w * .7, -lower * .7, w * .35, -lower, 0, -lower);
    bottom.bezierCurveTo(-w * .35, -lower, -w * .7, -lower * .7, -w, corner);
    attachLip(mesh(mouth, 'lower lip', curvedShape(bottom, 0, -.095, .0008, .0018, faceZ), materials.lips));
    attachLip(curve(mouth, 'lip seam', seamMaterial, [[-w, corner, faceZ(-w, -.095 + corner) + .0014], [0, -.0015, faceZ(0, -.0965) + .0025], [w, corner, faceZ(w, -.095 + corner) + .0014]], .00045));
    attachLip(curve(mouth, 'lip gloss', glowMaterial, [[-.013, -lower * .6, faceZ(-.013, -.095 - lower * .6) + .003], [0, -lower * .7, faceZ(0, -.095 - lower * .7) + .0032], [.009, -lower * .6, faceZ(.009, -.095 - lower * .6) + .003]], .00045));
  }
  function setLook(next: FaceLook) {
    const eyeStyle = next.eyeStyle && ['soft', 'almond', 'wide'].includes(next.eyeStyle) ? next.eyeStyle : 'soft';
    const mouthStyle = next.mouthStyle && ['smile', 'soft', 'full'].includes(next.mouthStyle) ? next.mouthStyle : 'smile';
    const rebuild = eyeStyle !== look.eyeStyle || mouthStyle !== look.mouthStyle;
    look = { eyeStyle, mouthStyle, eyeColor: /^#[0-9a-f]{6}$/i.test(next.eyeColor ?? '') ? next.eyeColor! : '#278eae' };
    irisMaterial.color.set(look.eyeColor); irisRim.color.copy(irisMaterial.color).multiplyScalar(.58);
    if (rebuild) build();
  }
  function update(dt: number, pose: string, moving: boolean) {
    const step = Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, .1) : 0;
    time += step;
    const target = pose === 'kiss' ? 1 : 0;
    expression = THREE.MathUtils.lerp(expression, target, 1 - Math.exp(-step * 12));
    // Fixed short closure followed by a slower opening; no allocation or timers in the frame loop.
    const cycle = time % 4.7, blink = cycle > 3.75 && cycle < 3.98 ? Math.sin((cycle - 3.75) / .23 * Math.PI) ** .7 : 0;
    for (const eye of eyes) {
      const wink = pose === 'kiss' && eye.side > 0 ? expression * .18 : 0;
      eye.opening.scale.y = Math.max(.035, 1 - blink * .985 - wink);
      eye.gaze.position.x = -eye.side * .002 + Math.sin(time * .47) * .0016 + (pose === 'wave' ? eye.side * .0007 : 0);
      eye.gaze.position.y = -.001 + Math.sin(time * .61 + eye.side * .15) * .0007;
      eye.brow.position.y = (pose === 'wave' || pose === 'jump' ? .002 : 0) + Math.sin(time * .83 + eye.side * .22) * .00045;
    }
    mouth.scale.set(1 - expression * .42, 1 + expression * .22, 1);
    mouth.position.z = 0;
    mouth.rotation.z = Math.sin(time * .72) * .006 + (pose === 'wave' ? .025 : 0);
    root.position.y = Math.sin(time * (moving ? 2 : 1.35)) * .00035;
    // Reproject animated XY after pursing/rolling. Scaling a pre-curved patch changes its
    // footprint without changing its depth, which visibly detaches it from a tapered jaw.
    root.updateMatrix(); features.updateMatrix(); mouth.updateMatrix();
    relative.copy(root.matrix).multiply(features.matrix).multiply(mouth.matrix);
    localInverse.copy(relative).invert();
    for (const lip of animatedLips) {
      const positions = lip.mesh.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        projected.fromArray(lip.rest, i * 3).applyMatrix4(relative);
        projected.z = faceZ(projected.x, projected.y) + Math.max(.00055, lip.lift[i]) + expression * .0005;
        projected.applyMatrix4(localInverse); positions.setXYZ(i, projected.x, projected.y, projected.z);
      }
      positions.needsUpdate = true; lip.mesh.geometry.computeVertexNormals();
    }
    blushMaterial.color.copy(materials.blush.color); shadowMaterial.color.copy(materials.eyeshadow.color);
    seamMaterial.color.copy(materials.lips.color).lerp(materials.ink.color, .42);
  }
  build(); setLook(look); update(0, 'idle', false);
  return { setLook, update };
}
