import * as THREE from 'three';
import type { Builder } from '@/game/builder';
import { PALETTE, gloss, glassMaterial } from '@/game/palette';
import { flowerPatch, palm } from '@/game/world/props';
import { GROUND_FOOTPRINTS } from '@/game/world/ground';
import { surface } from '@/game/world/materials';

function pad(
  b: Builder,
  x: number,
  z: number,
  radius: number,
  color: number
) {
  const disc = b.add(
    new THREE.CircleGeometry(radius, 26),
    gloss(color, { roughness: 0.28, metalness: 0.28 }),
    x,
    0.02,
    z
  );
  disc.rotation.x = -Math.PI / 2;
}

export function buildTerrain(b: Builder) {
  const ocean = b.add(
    new THREE.CylinderGeometry(175, 175, 4, 30),
    gloss(PALETTE.ocean, {
      roughness: 0.12,
      metalness: 0.65,
      emissive: 0x0d5f8a,
      emissiveIntensity: 0.4,
    }),
    0,
    -4.4,
    0
  );
  ocean.name = 'ocean';

  // Offset districts used to be paper discs hanging beyond the physics island.
  // All three now use the same 64-sided footprint as their exact collision caps.
  for (const ground of GROUND_FOOTPRINTS) {
    const island = b.add(
      new THREE.CylinderGeometry(ground.radius, ground.radius - 3, 5, 64),
      surface(ground.color, 'sand', { roughness: 0.92, metalness: 0 }),
      ground.x, -2.5 + ground.elevation, ground.z
    );
    island.name = ground.x === 0 ? 'island' : 'district shore';
  }

  pad(b, 0, 4, 15, PALETTE.blush);

  b.box(30, 0.14, 30, gloss(PALETTE.blush, { roughness: 0.2, metalness: 0.4 }), 0, 0.07, -34);
  b.box(42, 0.08, 5, gloss(PALETTE.pastelPink, { roughness: 0.3, metalness: 0.2 }), -24, 0.05, 14);
  b.box(28, 0.08, 5, gloss(PALETTE.pastelPink, { roughness: 0.3, metalness: 0.2 }), 20, 0.05, 19);
  b.box(5, 0.08, 22, gloss(PALETTE.pastelPink, { roughness: 0.3, metalness: 0.2 }), 0, 0.05, -8);

  // Repeated inset pavers guide all three routes in two instanced draw calls.
  const paverGeometry = new THREE.BoxGeometry(0.7, 0.04, 1.3);
  const paverMaterial = gloss(PALETTE.white, { roughness: 0.75, metalness: 0.02 });
  const placements: Array<[number, number, number]> = [];
  for (let i = 0; i < 12; i += 1) placements.push([0, -17 + i * 1.65, 0]);
  for (let i = 0; i < 20; i += 1) placements.push([-4 - i * 1.9, 14, Math.PI / 2]);
  for (let i = 0; i < 13; i += 1) placements.push([5 + i * 1.8, 19, Math.PI / 2]);
  const pavers = new THREE.InstancedMesh(paverGeometry, paverMaterial, placements.length);
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  placements.forEach(([x, z, angle], index) => {
    rotation.setFromAxisAngle(up, angle);
    matrix.compose(new THREE.Vector3(x, 0.12, z), rotation, new THREE.Vector3(1, 1, 1));
    pavers.setMatrixAt(index, matrix);
  });
  pavers.receiveShadow = true;
  b.group.add(pavers);

  // Fountain landmark at the crossroads
  const stone = gloss(PALETTE.white, { roughness: 0.3, metalness: 0.35 });
  b.cyl(5.4, 5.6, 0.8, 18, stone, 0, 0.4, 4);
  b.cyl(4.9, 4.9, 0.24, 18, glassMaterial(PALETTE.sky, 0.8), 0, 0.82, 4);
  // Porcelain tiers and a pink scalloped bowl replace the dark metal cone.
  const porcelain = gloss(0xfff4ec, { roughness:.32, metalness:.12 });
  const rose = gloss(0xf6a4c6, { roughness:.26, metalness:.18 });
  b.cyl(.7,.95,.35,20,porcelain,0,1.05,4);
  b.cyl(.32,.45,1.45,16,porcelain,0,1.9,4);
  b.cyl(1.25,.62,.32,24,rose,0,2.73,4);
  b.cyl(1.1,1.1,.06,24,glassMaterial(PALETTE.sky,.8),0,2.91,4);
  b.cyl(.16,.23,.65,12,porcelain,0,3.15,4);
  const finial = b.add(new THREE.OctahedronGeometry(.24,0),gloss(PALETTE.gold,{metalness:.6,roughness:.2}),0,3.65,4);
  finial.rotation.y = Math.PI / 4;
  b.collider(0, 0.5, 4, 5.2, 0.6, 5.2);

  // Four sculpted water arcs make the fountain read as water from a distance.
  const water = glassMaterial(0x8ce7f8, 0.7);
  const jet = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 3.2, 0), new THREE.Vector3(1.1, 3.9, 0),
    new THREE.Vector3(2.3, 2.6, 0), new THREE.Vector3(3.2, 0.95, 0),
  ]);
  const jetGeometry = new THREE.TubeGeometry(jet, 14, 0.075, 5, false);
  for (let i = 0; i < 4; i += 1) {
    const arc = b.add(jetGeometry, water, 0, 0, 4);
    arc.rotation.y = i * Math.PI / 2;
  }

  flowerPatch(b, -8, 10, PALETTE.magenta);
  flowerPatch(b, 9, 12, PALETTE.sky);
  flowerPatch(b, -10, -16, PALETTE.gold);
  flowerPatch(b, 12, -14, PALETTE.purple);

  palm(b, -18, 4, 0.95);
  palm(b, -14, -10, 0.85);
  palm(b, 16, 2, 1);
  palm(b, 22, -12, 0.9);
  palm(b, -17, -35, 1.2);
  palm(b, 21, -48, 1.05);
  flowerPatch(b, -13, -38, PALETTE.hotPink);
  flowerPatch(b, 12, -38, PALETTE.purple);
  flowerPatch(b, -35, 22, PALETTE.magenta);
}