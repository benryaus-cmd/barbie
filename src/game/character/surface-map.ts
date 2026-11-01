import * as THREE from 'three';

export type SurfaceMap = { sample(x: number, y: number): { z: number; normal: THREE.Vector3 } | null };
type Triangle = { ax: number; ay: number; az: number; bx: number; by: number; bz: number; cx: number; cy: number; cz: number; denominator: number; normal: THREE.Vector3 };

/** Bake rigid mesh triangles into `space`. The source geometry can subsequently be batched/disposed.
 * Queries travel along local -Z and select the frontmost actual triangle, including trim.
 * A small XY grid keeps frame-loop queries local; no mesh traversal or raycasting is needed.
 */
export function createSurfaceMap(meshes: THREE.Mesh[], space: THREE.Object3D): SurfaceMap {
  space.updateWorldMatrix(true, false);
  const inverse = space.matrixWorld.clone().invert(), triangles: Triangle[] = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), edge = new THREE.Vector3();
  for (const mesh of meshes) {
    mesh.updateWorldMatrix(true, false);
    const matrix = inverse.clone().multiply(mesh.matrixWorld), positions = mesh.geometry.getAttribute('position'), index = mesh.geometry.index;
    if (!positions) continue;
    const count = index?.count ?? positions.count;
    for (let i = 0; i + 2 < count; i += 3) {
      a.fromBufferAttribute(positions, index ? index.getX(i) : i).applyMatrix4(matrix);
      b.fromBufferAttribute(positions, index ? index.getX(i + 1) : i + 1).applyMatrix4(matrix);
      c.fromBufferAttribute(positions, index ? index.getX(i + 2) : i + 2).applyMatrix4(matrix);
      const denominator = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
      if (!Number.isFinite(a.x + a.y + a.z + b.x + b.y + b.z + c.x + c.y + c.z) || Math.abs(denominator) < 1e-14) continue;
      const normal = b.clone().sub(a).cross(edge.copy(c).sub(a)).normalize();
      if (normal.z < 0) normal.negate();
      triangles.push({ ax: a.x, ay: a.y, az: a.z, bx: b.x, by: b.y, bz: b.z, cx: c.x, cy: c.y, cz: c.z, denominator, normal });
      minX = Math.min(minX, a.x, b.x, c.x); maxX = Math.max(maxX, a.x, b.x, c.x);
      minY = Math.min(minY, a.y, b.y, c.y); maxY = Math.max(maxY, a.y, b.y, c.y);
    }
  }
  if (!triangles.length) return { sample: () => null };
  const size = Math.max(4, Math.min(64, Math.ceil(Math.sqrt(triangles.length / 2))));
  const scaleX = size / Math.max(maxX - minX, 1e-9), scaleY = size / Math.max(maxY - minY, 1e-9);
  const cellX = (x: number) => Math.max(0, Math.min(size - 1, Math.floor((x - minX) * scaleX)));
  const cellY = (y: number) => Math.max(0, Math.min(size - 1, Math.floor((y - minY) * scaleY)));
  const cells: Triangle[][] = Array.from({ length: size * size }, () => []);
  for (const triangle of triangles) {
    const lowX = cellX(Math.min(triangle.ax, triangle.bx, triangle.cx)), highX = cellX(Math.max(triangle.ax, triangle.bx, triangle.cx));
    const lowY = cellY(Math.min(triangle.ay, triangle.by, triangle.cy)), highY = cellY(Math.max(triangle.ay, triangle.by, triangle.cy));
    for (let y = lowY; y <= highY; y++) for (let x = lowX; x <= highX; x++) cells[y * size + x].push(triangle);
  }
  return {
    sample(x, y) {
      if (!Number.isFinite(x + y) || x < minX - 1e-9 || x > maxX + 1e-9 || y < minY - 1e-9 || y > maxY + 1e-9) return null;
      let z = -Infinity, selected: Triangle | undefined;
      for (const triangle of cells[cellY(y) * size + cellX(x)]) {
        const u = ((triangle.by - triangle.cy) * (x - triangle.cx) + (triangle.cx - triangle.bx) * (y - triangle.cy)) / triangle.denominator;
        const v = ((triangle.cy - triangle.ay) * (x - triangle.cx) + (triangle.ax - triangle.cx) * (y - triangle.cy)) / triangle.denominator;
        const w = 1 - u - v;
        if (u < -1e-7 || v < -1e-7 || w < -1e-7) continue;
        const next = u * triangle.az + v * triangle.bz + w * triangle.cz;
        if (next > z) { z = next; selected = triangle; }
      }
      return selected ? { z, normal: selected.normal.clone() } : null;
    },
  };
}

/** Add patch interior samples once; interpolated UVs keep fabric/embroidery textures intact. */
function tessellatePatch(geometry: THREE.BufferGeometry): void {
  const attributes = Object.entries(geometry.attributes).map(([name, attribute]) => {
    const values: number[] = [];
    for (let i = 0; i < attribute.count; i++) for (let component = 0; component < attribute.itemSize; component++) values.push(attribute.getComponent(i, component));
    return { name, size: attribute.itemSize, values };
  });
  const points = attributes.find(attribute => attribute.name === 'position')!;
  let triangles = geometry.index ? Array.from(geometry.index.array) : Array.from({ length: geometry.getAttribute('position').count }, (_, index) => index);
  const lengthSquared = (a: number, b: number) => (points.values[a * 3] - points.values[b * 3]) ** 2 + (points.values[a * 3 + 1] - points.values[b * 3 + 1]) ** 2;
  for (let pass = 0; pass < 5; pass++) {
    const next: number[] = [], midpoints = new Map<string, number>(); let divided = false;
    const midpoint = (a: number, b: number) => {
      const key = a < b ? `${a}:${b}` : `${b}:${a}`, existing = midpoints.get(key);
      if (existing !== undefined) return existing;
      const index = points.values.length / 3;
      for (const attribute of attributes) for (let component = 0; component < attribute.size; component++) attribute.values.push((attribute.values[a * attribute.size + component] + attribute.values[b * attribute.size + component]) * .5);
      midpoints.set(key, index); return index;
    };
    for (let i = 0; i + 2 < triangles.length; i += 3) {
      const a = triangles[i], b = triangles[i + 1], c = triangles[i + 2];
      if (Math.max(lengthSquared(a, b), lengthSquared(b, c), lengthSquared(c, a)) <= .012 ** 2) next.push(a, b, c);
      else { const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a); next.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca); divided = true; }
    }
    triangles = next; if (!divided) break;
  }
  for (const attribute of attributes) geometry.setAttribute(attribute.name, new THREE.Float32BufferAttribute(attribute.values, attribute.size));
  geometry.setIndex(triangles);
}

/** Geometry coordinates must already be in the surface map's space. Unsupported vertices stay put. */
export function conformToSurface(geometry: THREE.BufferGeometry, surface: SurfaceMap, offset = .0008): void {
  tessellatePatch(geometry);
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const support = surface.sample(positions.getX(i), positions.getY(i));
    if (support) positions.setZ(i, support.z + offset);
  }
  positions.needsUpdate = true; geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
}
