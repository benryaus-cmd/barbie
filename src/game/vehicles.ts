import * as THREE from 'three';
import type { VehicleId } from '@/game/types';
import { PALETTE, gloss, glassMaterial, neonMaterial } from '@/game/palette';
import { SPOTS } from '@/game/spots';

export type VehicleRig = {
  id: VehicleId;
  group: THREE.Group;
  wheels: THREE.Mesh[];
  seatY: number;
  home: THREE.Vector3;
};

function wheel(radius: number, width: number) {
  const geo = new THREE.CylinderGeometry(radius, radius, width, 14);
  geo.rotateZ(Math.PI / 2);
  return new THREE.Mesh(geo, gloss(0x2a2130, { roughness: 0.65, metalness: 0.3 }));
}

function addWheels(
  group: THREE.Group,
  wheels: THREE.Mesh[],
  positions: Array<[number, number, number]>,
  radius: number,
  width: number
) {
  for (const [x, y, z] of positions) {
    const mesh = wheel(radius, width);
    mesh.position.set(x, y, z);
    group.add(mesh);
    wheels.push(mesh);
  }
}

function buildConvertible(): VehicleRig {
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];
  const pink = gloss(PALETTE.magenta, { roughness: 0.16, metalness: 0.55 });
  const gold = gloss(PALETTE.gold, { metalness: 0.95, roughness: 0.12 });
  const dark = gloss(0x372a44, { roughness: 0.5 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.46, 3.5), pink);
  body.position.y = 0.62;
  group.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 1), pink);
  nose.position.set(0, 0.78, 1.5);
  group.add(nose);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.34, 1.5), dark);
  cabin.position.set(0, 0.9, -0.25);
  group.add(cabin);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.06, 3.5), gold);
  trim.position.y = 0.4;
  group.add(trim);
  const screen = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.42, 0.07), glassMaterial(PALETTE.sky, 0.45));
  screen.position.set(0, 1.1, 0.55);
  screen.rotation.x = -0.24;
  group.add(screen);
  for (const side of [-1, 1]) {
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.36, 0.5),
      gloss(PALETTE.white, { roughness: 0.4 })
    );
    seat.position.set(side * 0.42, 1.04, -0.4);
    group.add(seat);
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), neonMaterial(PALETTE.gold, 1.8));
    light.position.set(side * 0.5, 0.8, 1.9);
    group.add(light);
  }
  addWheels(
    group,
    wheels,
    [
      [-0.88, 0.36, 1.1],
      [0.88, 0.36, 1.1],
      [-0.88, 0.36, -1.15],
      [0.88, 0.36, -1.15],
    ],
    0.36,
    0.26
  );
  return { id: 'convertible', group, wheels, seatY: 0.34, home: new THREE.Vector3() };
}

function buildScooter(): VehicleRig {
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];
  const pink = gloss(PALETTE.hotPink, { roughness: 0.2, metalness: 0.5 });
  const gold = gloss(PALETTE.gold, { metalness: 0.9, roughness: 0.15 });

  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 1.3), pink);
  deck.position.y = 0.42;
  group.add(deck);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.15, 8), gold);
  column.position.set(0, 0.85, 0.55);
  column.rotation.x = 0.24;
  group.add(column);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.08), pink);
  bar.position.set(0, 1.36, 0.42);
  group.add(bar);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.6), pink);
  seat.position.set(0, 0.78, -0.32);
  group.add(seat);
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), neonMaterial(PALETTE.white, 1.6));
  light.position.set(0, 1.2, 0.62);
  group.add(light);
  addWheels(group, wheels, [[0, 0.3, 0.62], [0, 0.3, -0.6]], 0.3, 0.16);
  return { id: 'scooter', group, wheels, seatY: 0.06, home: new THREE.Vector3() };
}

function buildBuggy(): VehicleRig {
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];
  const blue = gloss(PALETTE.sky, { roughness: 0.2, metalness: 0.45 });
  const pink = gloss(PALETTE.magenta, { roughness: 0.24, metalness: 0.4 });
  const cage = gloss(PALETTE.white, { metalness: 0.7, roughness: 0.2 });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.42, 2.9), blue);
  chassis.position.y = 0.72;
  group.add(chassis);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.28, 0.9), pink);
  hood.position.set(0, 0.96, 1.05);
  group.add(hood);
  const tub = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.42, 1.3), gloss(0x372a44, { roughness: 0.55 }));
  tub.position.set(0, 1.02, -0.35);
  group.add(tub);
  for (const side of [-1, 1]) {
    for (const z of [0.85, -1.05]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1, 8), cage);
      post.position.set(side * 0.62, 1.45, z);
      group.add(post);
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2), cage);
    top.position.set(side * 0.62, 1.92, -0.1);
    group.add(top);
    const wheelArch = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.5), pink);
    wheelArch.position.set(side * 0.85, 0.9, 0.9);
    group.add(wheelArch);
  }
  addWheels(
    group,
    wheels,
    [
      [-0.9, 0.44, 0.95],
      [0.9, 0.44, 0.95],
      [-0.9, 0.44, -0.95],
      [0.9, 0.44, -0.95],
    ],
    0.44,
    0.3
  );
  return { id: 'buggy', group, wheels, seatY: 0.36, home: new THREE.Vector3() };
}

export function buildVehicles(): Record<VehicleId, VehicleRig> {
  const rigs: Record<VehicleId, VehicleRig> = {
    convertible: buildConvertible(),
    scooter: buildScooter(),
    buggy: buildBuggy(),
  };
  for (const id of Object.keys(rigs) as VehicleId[]) {
    const spot = SPOTS.find(item => item.id === id);
    if (spot) rigs[id].home.set(spot.x, 0, spot.z);
    rigs[id].group.position.copy(rigs[id].home);
    rigs[id].group.rotation.y = id === 'convertible' ? -1.6 : 0.4;
  }
  return rigs;
}