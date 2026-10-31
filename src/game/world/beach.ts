import * as THREE from 'three';
import type { Builder } from '@/game/builder';
import { PALETTE, gloss, glassMaterial, neonMaterial } from '@/game/palette';
import { lounger, palm, umbrella } from '@/game/world/props';

export function buildBeach(b: Builder) {
  const wood = gloss(PALETTE.wood, { roughness: 0.75, metalness: 0.1 });
  const lightWood = gloss(0xd9a072, { roughness: 0.7 });
  const white = gloss(PALETTE.white, { roughness: 0.24, metalness: 0.35 });
  const trim = gloss(PALETTE.magenta, { roughness: 0.28, metalness: 0.35 });
  const gold = gloss(PALETTE.gold, { metalness: 0.9, roughness: 0.16 });

  // Boardwalk
  b.box(5, 0.22, 34, wood, 30, 0.13, 34);
  for (let i = 0; i < 9; i += 1) {
    b.box(5.2, 0.06, 0.3, lightWood, 30, 0.26, 19 + i * 3.6);
  }
  b.collider(30, 0.13, 34, 2.5, 0.11, 17);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i += 1) {
      b.cyl(0.09, 0.09, 1.2, 6, white, 30 + side * 2.6, 0.7, 20 + i * 7);
    }
  }

  // Smoothie bar
  b.solid(7, 1.3, 2.4, white, 30, 0.65, 22);
  b.box(7.6, 0.24, 3, trim, 30, 1.4, 22);
  b.cyl(0.14, 0.16, 3.2, 8, gold, 26.6, 1.6, 21.4);
  b.cyl(0.14, 0.16, 3.2, 8, gold, 33.4, 1.6, 21.4);
  const thatch = b.add(
    new THREE.ConeGeometry(4.6, 1.4, 10),
    gloss(0xe6b46c, { roughness: 0.85 }),
    30,
    3.5,
    22
  );
  thatch.rotation.y = 0.4;
  for (let i = 0; i < 3; i += 1) {
    b.cyl(0.28, 0.28, 0.7, 10, glassMaterial(i === 1 ? PALETTE.magenta : PALETTE.sky, 0.75), 28.4 + i * 1.5, 1.85, 22);
  }
  b.cyl(0.45, 0.45, 0.14, 12, neonMaterial(PALETTE.gold, 1.5), 30, 3.4, 20.9).rotation.x =
    Math.PI / 2;

  // Small shell clusters use one instanced mesh and stay off the boardwalk.
  const shells = new THREE.InstancedMesh(new THREE.SphereGeometry(0.18, 7, 5), gloss(PALETTE.cream, { roughness: 0.8, metalness: 0.02 }), 22);
  const shellMatrix = new THREE.Matrix4();
  const shellRotation = new THREE.Quaternion();
  for (let i = 0; i < 22; i += 1) {
    const angle = i * 2.399;
    const radius = 4 + (i % 5) * 1.9;
    const sx = 45 + Math.cos(angle) * radius;
    const sz = 34 + Math.sin(angle) * radius;
    shellRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    shellMatrix.compose(new THREE.Vector3(sx, 0.13, sz), shellRotation, new THREE.Vector3(1, 0.42, 0.72));
    shells.setMatrixAt(i, shellMatrix);
  }
  b.group.add(shells);

  // Lounge area
  umbrella(b, 40, 26, PALETTE.pastelPink);
  umbrella(b, 40, 40, PALETTE.sky);
  umbrella(b, 48, 44, PALETTE.magenta);
  lounger(b, 38.4, 26.6, 0, PALETTE.magenta);
  lounger(b, 41.6, 26.6, 0, PALETTE.gold);
  lounger(b, 38.4, 41, Math.PI, PALETTE.sky);
  lounger(b, 41.6, 41, Math.PI, PALETTE.pastelPink);

  // Surf shack props
  b.box(2.2, 0.3, 1, gloss(PALETTE.pastelPink, { roughness: 0.4 }), 47, 0.16, 24);
  const board = b.add(
    new THREE.CapsuleGeometry(0.42, 1.9, 4, 10),
    gloss(PALETTE.neonBlue, { roughness: 0.2, metalness: 0.45 }),
    47,
    1.5,
    24
  );
  board.rotation.z = 0.12;
  b.cyl(0.1, 0.1, 1.4, 6, white, 52, 0.7, 41);
  b.cyl(0.1, 0.1, 1.4, 6, white, 56, 0.7, 41);

  // Lifeguard tower
  b.box(3.4, 0.3, 3.4, lightWood, 55, 2.3, 46);
  for (const [px, pz] of [
    [53.6, 44.8],
    [56.4, 44.8],
    [53.6, 47.2],
    [56.4, 47.2],
  ]) {
    b.cyl(0.14, 0.14, 2.3, 6, wood, px, 1.15, pz);
  }
  b.box(3.6, 0.24, 0.24, trim, 55, 3.4, 44.6);
  b.box(0.24, 1.1, 3.6, trim, 53.3, 2.9, 46);
  b.sphere(0.3, neonMaterial(PALETTE.magenta, 1.6), 55, 3.1, 44.7);

  palm(b, 22, 40, 1.05);
  palm(b, 36, 46, 0.95);
  palm(b, 50, 20, 1);
  palm(b, 58, 34, 0.9);
  palm(b, 26, 14, 0.85);
}