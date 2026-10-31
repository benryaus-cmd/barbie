import * as THREE from 'three';
import type { Builder } from '@/game/builder';
import { PALETTE, gloss, glassMaterial, neonMaterial } from '@/game/palette';
import { SPOTS } from '@/game/spots';
import type { Spot } from '@/game/types';
import { neonPanel } from '@/game/world/props';

export type Bobber = {
  obj: THREE.Object3D;
  baseY: number;
  phase: number;
  spin: number;
};

export type BeaconHandle = {
  group: THREE.Group;
  ringMat: THREE.MeshStandardMaterial;
  gemMat: THREE.MeshStandardMaterial;
};

export type StationFx = {
  bobbers: Bobber[];
  pulses: THREE.MeshStandardMaterial[];
  beacons: Record<string, BeaconHandle>;
  setActiveSpot(id: string | null): void;
};

const BEACON_COLORS: Record<string, number> = {
  activity: PALETTE.magenta,
  reward: PALETTE.gold,
  vehicle: PALETTE.sky,
};

function beacon(b: Builder, spot: Spot, fx: StationFx) {
  const color = BEACON_COLORS[spot.kind] ?? PALETTE.magenta;
  const group = new THREE.Group();
  const ringMat = neonMaterial(color, 1.9);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.44, 0.07, 6, 16),
    ringMat
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  const gemMat = neonMaterial(PALETTE.white, 1.15);
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.17, 0),
    gemMat
  );
  group.add(gem);
  const y = spot.markerY ?? (spot.y ? spot.y + 2.1 : 2.35);
  group.position.set(spot.x, y, spot.z);
  b.group.add(group);
  fx.bobbers.push({
    obj: group,
    baseY: y,
    phase: spot.x * 0.7 + spot.z * 0.3,
    spin: 1.15,
  });
  fx.beacons[spot.id] = { group, ringMat, gemMat };
}

function smartMirror(b: Builder, fx: StationFx) {
  const gold = gloss(PALETTE.gold, { metalness: 0.92, roughness: 0.14 });
  b.box(2.2, 0.16, 0.9, gloss(PALETTE.pastelPink, { roughness: 0.3 }), 1.5, 3.98, -51.5);
  b.box(2.1, 2.6, 0.14, gold, 1.5, 5.3, -51.7);
  b.box(1.9, 2.4, 0.18, glassMaterial(PALETTE.sky, 0.55), 1.5, 5.3, -51.6);
  const rim = neonMaterial(PALETTE.neonBlue, 1.5);
  fx.pulses.push(rim);
  b.box(1.7, 0.1, 0.1, rim, 1.5, 6.58, -51.55);
  b.box(1.7, 0.1, 0.1, rim, 1.5, 4.02, -51.55);
}

function danceFloor(b: Builder, fx: StationFx) {
  const tileColors = [PALETTE.magenta, PALETTE.sky, PALETTE.gold];
  b.box(3.9, 0.1, 3.9, gloss(0x2b2140, { metalness: 0.6, roughness: 0.3 }), 11.5, 0.05, -27);
  for (let gx = 0; gx < 3; gx += 1) {
    for (let gz = 0; gz < 3; gz += 1) {
      const mat = neonMaterial(tileColors[(gx + gz) % 3], 0.9);
      fx.pulses.push(mat);
      b.box(1.06, 0.14, 1.06, mat, 11.5 + (gx - 1) * 1.17, 0.12, -27 + (gz - 1) * 1.17);
    }
  }
  const speaker = gloss(0x2b2140, { metalness: 0.55, roughness: 0.35 });
  for (const sx of [9.1, 13.9]) {
    b.solid(0.8, 1.5, 0.8, speaker, sx, 0.75, -27);
    b.cyl(0.26, 0.26, 0.14, 12, neonMaterial(PALETTE.neonBlue, 1.6), sx, 1.4, -27.42).rotation.x =
      Math.PI / 2;
  }
  b.cyl(0.12, 0.12, 2.6, 8, gloss(PALETTE.gold, { metalness: 0.9 }), 11.5, 1.3, -29.4);
  neonPanel(b, 11.5, 2.8, -29.4, 3.6, 0.34, PALETTE.magenta);
}

function petBed(b: Builder, fx: StationFx) {
  const fur = gloss(0xfff0d8, { roughness: 0.72, metalness: 0.05 });
  const ear = gloss(0xc98b62, { roughness: 0.72 });
  const dark = gloss(0x2b2035, { roughness: 0.4 });
  b.cyl(1.25, 1.3, 0.2, 16, gloss(PALETTE.white, { roughness: 0.45 }), 4.5, 0.2, -34.5);
  const cushion = gloss(PALETTE.pastelPink, { roughness: 0.5 });
  b.cyl(1.05, 1.1, 0.16, 16, cushion, 4.5, 0.34, -34.5);
  const body = b.sphere(0.32, fur, 4.5, 0.66, -34.5);
  body.scale.set(1.25, 0.85, 1);
  b.sphere(0.24, fur, 4.92, 0.86, -34.3);
  b.sphere(0.1, ear, 4.8, 1.02, -34.42);
  b.sphere(0.1, ear, 5.04, 1.02, -34.16);
  b.sphere(0.042, dark, 5.08, 0.9, -34.16);
  b.sphere(0.042, dark, 4.94, 0.94, -34.14);
  const tail = b.sphere(0.12, fur, 4.14, 0.78, -34.34);
  tail.scale.set(1.4, 0.7, 0.7);
  b.box(0.4, 0.1, 0.11, gloss(PALETTE.gold, { metalness: 0.8 }), 3.94, 0.42, -35.15);
  const heart = neonMaterial(PALETTE.hotPink, 1.6);
  fx.pulses.push(heart);
  b.add(new THREE.TorusGeometry(0.18, 0.06, 6, 12), heart, 4.5, 1.5, -35.6).rotation.x =
    Math.PI / 2;
}

function slideSign(b: Builder, fx: StationFx) {
  b.cyl(0.11, 0.13, 2.4, 8, gloss(PALETTE.gold, { metalness: 0.9 }), 3.4, 1.6, -23.4);
  neonPanel(b, 3.4, 3, -23.4, 2.6, 0.5, PALETTE.neonBlue);
  const float = b.add(
    new THREE.TorusGeometry(0.6, 0.18, 8, 16),
    gloss(PALETTE.magenta, { roughness: 0.35, metalness: 0.3 }),
    2.1,
    1,
    -23.6
  );
  float.rotation.x = Math.PI / 2;
  fx.bobbers.push({ obj: float, baseY: 1, phase: 1.2, spin: 0.6 });
}

function surfShack(b: Builder, fx: StationFx) {
  const boardMat = gloss(PALETTE.neonBlue, { roughness: 0.2, metalness: 0.45 });
  const boards: Array<[number, number, number]> = [
    [46.2, 25.2, 0.16],
    [47.9, 26.4, -0.12],
  ];
  for (const [bx, bz, tilt] of boards) {
    const board = b.add(new THREE.CapsuleGeometry(0.32, 1.7, 4, 10), boardMat, bx, 1.2, bz);
    board.rotation.z = tilt;
  }
  b.box(3.4, 0.24, 1.7, gloss(PALETTE.pastelPink, { roughness: 0.4 }), 47, 0.2, 25.8);
  b.cyl(0.1, 0.1, 2.5, 8, gloss(PALETTE.gold, { metalness: 0.9 }), 47, 1.35, 24.3);
  neonPanel(b, 47, 2.9, 24.3, 2.8, 0.42, PALETTE.neonBlue);
  const wave = new THREE.Mesh(
    new THREE.TorusGeometry(0.9, 0.13, 8, 18, Math.PI),
    neonMaterial(PALETTE.white, 1.2)
  );
  wave.position.set(48.6, 1.4, 27.6);
  wave.rotation.z = Math.PI;
  b.group.add(wave);
  fx.bobbers.push({ obj: wave, baseY: 1.4, phase: 0.4, spin: 0.3 });
}

function volleyNet(b: Builder) {
  const gold = gloss(PALETTE.gold, { metalness: 0.9, roughness: 0.16 });
  for (const px of [40.6, 47.4]) {
    b.cyl(0.1, 0.13, 2.7, 8, gold, px, 1.35, 35);
    b.sphere(0.16, neonMaterial(PALETTE.magenta, 1.5), px, 2.78, 35);
  }
  b.box(6.8, 0.95, 0.06, glassMaterial(PALETTE.white, 0.42), 44, 2.15, 35);
  b.box(6.9, 0.08, 0.1, gloss(PALETTE.magenta, { roughness: 0.3 }), 44, 2.62, 35);
  b.box(6.9, 0.08, 0.1, gloss(PALETTE.magenta, { roughness: 0.3 }), 44, 1.68, 35);
  b.sphere(0.26, gloss(PALETTE.white, { roughness: 0.28 }), 41.4, 0.4, 37.4);
}

function photoBooth(b: Builder, fx: StationFx) {
  const gold = gloss(PALETTE.gold, { metalness: 0.92, roughness: 0.14 });
  const dark = gloss(0x2b2140, { metalness: 0.5, roughness: 0.35 });
  b.box(3.6, 0.18, 2.6, gloss(0xd0184f, { roughness: 0.38, metalness: 0.2 }), -46, 0.14, 16.4);
  for (const px of [-47.7, -44.3]) {
    b.box(0.34, 3.3, 0.34, gold, px, 1.72, 16.4);
  }
  b.add(new THREE.TorusGeometry(1.7, 0.18, 8, 20, Math.PI), gold, -46, 3.3, 16.4);
  b.cyl(0.07, 0.1, 1.5, 6, dark, -46, 0.86, 14.7);
  b.box(0.52, 0.38, 0.5, dark, -46, 1.78, 14.7);
  b.cyl(0.16, 0.16, 0.28, 10, glassMaterial(PALETTE.sky, 0.85), -46, 1.78, 14.42).rotation.x =
    Math.PI / 2;
  const flash = neonMaterial(PALETTE.white, 1.6);
  fx.pulses.push(flash);
  b.sphere(0.15, flash, -46.42, 1.98, 14.72);
  neonPanel(b, -46, 4.9, 16.05, 3.2, 0.36, PALETTE.magenta);
}

function cafeKiosk(b: Builder, fx: StationFx) {
  const white = gloss(PALETTE.white, { roughness: 0.24, metalness: 0.35 });
  const cx = -49;
  const cz = 26;
  b.solid(3.4, 1.2, 2.2, white, cx, 0.6, cz);
  b.box(3.9, 0.2, 2.6, gloss(PALETTE.pastelPink, { roughness: 0.3 }), cx, 1.32, cz);
  for (const px of [cx - 1.4, cx + 1.4]) {
    b.cyl(0.1, 0.12, 2.4, 8, gloss(PALETTE.gold, { metalness: 0.9 }), px, 1.4, cz);
  }
  const striped: number[] = [PALETTE.magenta, PALETTE.white];
  for (let i = 0; i < 4; i += 1) {
    b.box(1, 0.14, 2.8, gloss(striped[i % 2], { roughness: 0.35 }), cx - 1.4 + i, 2.62, cz);
  }
  for (let i = 0; i < 3; i += 1) {
    b.cyl(0.16, 0.13, 0.22, 10, gloss(PALETTE.cream, { roughness: 0.5 }), cx - 1 + i * 0.95, 1.55, cz);
    b.sphere(0.15, gloss(PALETTE.pastelPink, { roughness: 0.4 }), cx - 1 + i * 0.95, 1.68, cz);
  }
  const sign = neonMaterial(PALETTE.gold, 1.5);
  fx.pulses.push(sign);
  b.box(3, 0.34, 0.16, sign, cx, 3.2, cz - 1.3);
  b.add(new THREE.TorusGeometry(0.5, 0.14, 8, 14), gloss(PALETTE.hotPink, { roughness: 0.3 }), cx, 3.9, cz - 1.3);
}

export function buildStations(b: Builder): StationFx {
  const fx: StationFx = {
    bobbers: [],
    pulses: [],
    beacons: {},
    setActiveSpot(id: string | null) {
      for (const [key, bData] of Object.entries(fx.beacons)) {
        const active = key === id;
        bData.group.scale.setScalar(active ? 1.38 : 1.0);
        bData.ringMat.emissiveIntensity = active ? 3.4 : 1.9;
        bData.gemMat.emissiveIntensity = active ? 2.5 : 1.15;
      }
    },
  };
  smartMirror(b, fx);
  danceFloor(b, fx);
  petBed(b, fx);
  slideSign(b, fx);
  surfShack(b, fx);
  volleyNet(b);
  photoBooth(b, fx);
  cafeKiosk(b, fx);

  for (const spot of SPOTS) beacon(b, spot, fx);
  return fx;
}