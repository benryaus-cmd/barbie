import * as THREE from 'three';
import type { Builder } from '@/game/builder';
import { PALETTE, gloss, neonMaterial } from '@/game/palette';

export function palm(b: Builder, x: number, z: number, scale = 1) {
  const trunkMat = gloss(PALETTE.wood, { roughness: 0.88, metalness: 0.04 });
  const leafMat = gloss(0x2ebd7c, { roughness: 0.55, metalness: 0.1 });
  const nutMat = gloss(0x7a4b2a, { roughness: 0.8 });
  const height = 5.2 * scale;
  const trunk = b.add(
    new THREE.CylinderGeometry(0.16 * scale, 0.32 * scale, height, 7),
    trunkMat,
    x,
    height / 2,
    z
  );
  trunk.rotation.z = 0.05;
  // Seven broad curved fronds share a tiny geometry, with no alpha textures.
  const vertices: number[] = [];
  const indices: number[] = [];
  const steps = 8;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const width = Math.sin(t * Math.PI) * 0.43 * scale;
    const y = (Math.sin(t * Math.PI) * 0.65 - t * t * 1.15) * scale;
    vertices.push(-width, y - width * 0.18, t * 3.4 * scale);
    vertices.push(0, y + width * 0.22, t * 3.4 * scale);
    vertices.push(width, y - width * 0.18, t * 3.4 * scale);
    if (i < steps) {
      const k = i * 3;
      indices.push(k, k + 3, k + 1, k + 1, k + 3, k + 4, k + 1, k + 4, k + 2, k + 2, k + 4, k + 5);
    }
  }
  const frond = new THREE.BufferGeometry();
  frond.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  frond.setIndex(indices);
  frond.computeVertexNormals();
  leafMat.side = THREE.DoubleSide;
  for (let i = 0; i < 7; i += 1) {
    const leaf = b.add(frond, leafMat, x - height * 0.025, height, z);
    leaf.rotation.y = i * Math.PI * 2 / 7 + x * 0.05;
    leaf.rotation.x = i % 2 === 0 ? -0.08 : 0.08;
  }
  b.sphere(0.22 * scale, nutMat, x + 0.22, height - 0.15, z + 0.1);
  b.sphere(0.2 * scale, nutMat, x - 0.16, height - 0.2, z - 0.18);
}

export function umbrella(
  b: Builder,
  x: number,
  z: number,
  color: number,
  scale = 1
) {
  const pole = gloss(PALETTE.white, { metalness: 0.5, roughness: 0.3 });
  b.cyl(0.08 * scale, 0.1 * scale, 2.8 * scale, 8, pole, x, (1.4 * scale), z);
  const canopy = b.add(
    new THREE.ConeGeometry(2.1 * scale, 0.95 * scale, 10),
    gloss(color, { roughness: 0.4, metalness: 0.15 }),
    x,
    2.8 * scale,
    z
  );
  canopy.rotation.y = 0.3;
}

export function lounger(
  b: Builder,
  x: number,
  z: number,
  angle: number,
  color: number
) {
  const frame = gloss(PALETTE.white, { metalness: 0.4, roughness: 0.25 });
  const cushion = gloss(color, { roughness: 0.45 });
  b.box(1.1, 0.16, 2.2, frame, x, 0.52, z, angle);
  b.box(1, 0.14, 2, cushion, x, 0.63, z, angle);
  const back = b.add(
    new THREE.BoxGeometry(1, 1.3, 0.16),
    cushion,
    x - Math.sin(angle) * 1.18,
    0.95,
    z - Math.cos(angle) * 1.18
  );
  back.rotation.y = angle;
  back.rotation.x = -0.42;
}

export function lamp(b: Builder, x: number, z: number) {
  const gold = gloss(PALETTE.gold, { metalness: 0.9, roughness: 0.18 });
  b.cyl(0.1, 0.16, 4.2, 8, gold, x, 2.1, z);
  b.sphere(0.36, neonMaterial(PALETTE.sky, 1.5), x, 4.4, z);
}

export function neonPanel(
  b: Builder,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  color: number,
  angle = 0
) {
  b.box(width, height, 0.16, neonMaterial(color, 1.5), x, y, z, angle);
}

export function flowerPatch(
  b: Builder,
  x: number,
  z: number,
  color: number
) {
  const grass = gloss(0x4fd493, { roughness: 0.7 });
  const petal = gloss(color, { roughness: 0.5, metalness: 0.2 });
  b.cyl(1.1, 1.2, 0.35, 10, gloss(PALETTE.white, { roughness: 0.4 }), x, 0.18, z);
  b.cyl(0.95, 0.95, 0.15, 10, grass, x, 0.4, z);
  for (let i = 0; i < 4; i += 1) {
    const angle = (i / 4) * Math.PI * 2;
    b.sphere(0.19, petal, x + Math.cos(angle) * 0.5, 0.62, z + Math.sin(angle) * 0.5);
  }
  b.sphere(0.16, gloss(PALETTE.gold, { metalness: 0.7 }), x, 0.7, z);
}