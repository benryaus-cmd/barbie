import * as THREE from 'three';
import { PALETTE } from '@/game/palette';

const TOKEN_SPOTS: Array<[number, number, number]> = [
  [-5, 1.15, -43],
  [4.5, 1.15, -43.5],
  [-2, 4.4, -50.4],
  [4, 4.4, -50.4],
  [5.4, 4.8, -25],
  [0, 1.15, -21],
  [11, 2.2, -32],
  [11.5, 1.15, -27],
  [2, 1.15, -30],
  [-8, 1.15, -36.5],
  [24, 1.15, -16],
  [10, 1.15, 6],
  [-30, 1.15, 14],
  [-46, 1.15, 2],
  [-51, 1.15, 12],
  [-49, 1.15, 26],
  [-44, 1.15, -4],
  [-52, 1.15, 30],
  [30, 1.15, 24],
  [34, 1.15, 42],
  [44, 1.15, 36.6],
  [47, 1.15, 26.6],
  [54, 1.15, 25],
];

const BASE_Y = 1.15;
const PICK_RADIUS_SQ = 2.4;

export type TokenField = {
  group: THREE.Group;
  update(
    dt: number,
    x: number,
    y: number,
    z: number,
    onCollect: (px: number, py: number, pz: number) => void
  ): number;
  remaining(): number;
  reset(): void;
};

export function createTokens(): TokenField {
  const group = new THREE.Group();
  const ringGeo = new THREE.TorusGeometry(0.32, 0.09, 6, 14);
  const gemGeo = new THREE.OctahedronGeometry(0.17, 0);
  const ringMat = new THREE.MeshStandardMaterial({
    color: PALETTE.gold,
    emissive: PALETTE.gold,
    emissiveIntensity: 1.4,
    roughness: 0.3,
    metalness: 0.6,
    toneMapped: false,
  });
  const gemMat = new THREE.MeshStandardMaterial({
    color: PALETTE.magenta,
    emissive: PALETTE.magenta,
    emissiveIntensity: 1.2,
    roughness: 0.2,
    metalness: 0.5,
    toneMapped: false,
  });

  const items = TOKEN_SPOTS.map(([x, y, z], index) => {
    const holder = new THREE.Group();
    const ring = new THREE.Mesh(ringGeo, ringMat);
    const gem = new THREE.Mesh(gemGeo, gemMat);
    holder.add(ring);
    holder.add(gem);
    holder.position.set(x, y, z);
    group.add(holder);
    return { holder, x, baseY: y, z, taken: false, phase: index * 0.7 };
  });

  let clock = 0;

  return {
    group,
    update(dt, x, y, z, onCollect) {
      clock += dt;
      let collected = 0;
      for (const item of items) {
        if (item.taken) continue;
        item.holder.position.y = item.baseY + Math.sin(clock * 2 + item.phase) * 0.13;
        item.holder.rotation.y += dt * 1.7;
        const dx = x - item.x;
        const dy = y - item.baseY;
        const dz = z - item.z;
        if (dx * dx + dz * dz < PICK_RADIUS_SQ && Math.abs(dy) < 2.2) {
          item.taken = true;
          item.holder.visible = false;
          collected += 1;
          onCollect(item.x, item.baseY, item.z);
        }
      }
      return collected;
    },
    remaining() {
      let left = 0;
      for (const item of items) if (!item.taken) left += 1;
      return left;
    },
    reset() {
      for (const item of items) {
        item.taken = false;
        item.holder.visible = true;
      }
    },
  };
}