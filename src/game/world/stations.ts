import * as THREE from 'three';
import type { Builder } from '@/game/builder';
import { PALETTE, gloss, glassMaterial, neonMaterial } from '@/game/palette';
import { SPOTS } from '@/game/spots';
import type { Spot } from '@/game/types';
import { neonPanel } from '@/game/world/props';
import { buildPhotoGarden } from '@/game/world/vistas';

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
  group.name = `activity beacon: ${spot.id}`;
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
      b.box(1.06, 0.14, 1.06, mat, 11.5 + (gx - 1) * 1.17, 0.12, -27 + (gz - 1) * 1.17).name = 'party tile';
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
  b.cyl(1.25, 1.3, 0.2, 16, gloss(PALETTE.white, { roughness: 0.45 }), 4.5, 0.2, -34.5);
  const cushion = gloss(PALETTE.pastelPink, { roughness: 0.5 });
  b.cyl(1.05, 1.1, 0.16, 16, cushion, 4.5, 0.34, -34.5);
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

function netballCourt(b: Builder) {
  const x=17,z=34;
  const rose=gloss(0xe582a5,{roughness:.88});
  const teal=gloss(0x2e8f9c,{roughness:.86});
  const stripe=gloss(0xfff6df,{roughness:.8});
  const brass=gloss(PALETTE.gold,{metalness:.65,roughness:.3});
  // This separate court is on the main island, with a broad entrance at the south.
  b.box(13,.04,11,teal,x,.035,z).name='Sunset Netball court';
  b.box(11,.045,9,rose,x,.06,z);
  for(const px of [x-5.4,x+5.4]) b.box(.08,.04,8.8,stripe,px,.095,z);
  for(const pz of [z-4.35,z,z+4.35]) b.box(10.8,.04,.08,stripe,x,.095,pz);
  const circle=b.add(new THREE.TorusGeometry(1.05,.045,5,28),stripe,x,.12,z);circle.rotation.x=-Math.PI/2;
  const goalArc=b.add(new THREE.TorusGeometry(3.5,.045,5,36,Math.PI),stripe,x,.12,z-4.35);goalArc.rotation.x=-Math.PI/2;
  for(const side of [-1,1]) {
    const pz=z+side*4.5, rz=pz-side*.65;
    b.cyl(.085,.12,3.05,10,brass,x,1.53,pz);
    b.collider(x,1.53,pz,.13,1.53,.13);
    b.box(.08,.08,.65,brass,x,3.04,pz-side*.325);
    const rim=b.add(new THREE.TorusGeometry(.4,.045,8,24),gloss(0xd95080),x,3.05,rz);rim.rotation.x=-Math.PI/2;
    const netMat=gloss(0xfff5e6,{roughness:.85});
    for(let i=0;i<10;i++) {
      const a=i*Math.PI*2/10;
      const curve=new THREE.LineCurve3(new THREE.Vector3(x+Math.cos(a)*.4,3.03,rz+Math.sin(a)*.4),new THREE.Vector3(x+Math.cos(a+.3)*.22,2.48,rz+Math.sin(a+.3)*.22));
      b.add(new THREE.TubeGeometry(curve,1,.012,4,false),netMat);
    }
    for(const [y,r] of [[2.86,.35],[2.67,.28],[2.48,.22]]) {const ring=b.add(new THREE.TorusGeometry(r,.012,4,16),netMat,x,y,rz);ring.rotation.x=-Math.PI/2;}
  }
  b.sphere(.23,gloss(0xf8eee4,{roughness:.78}),x-2.6,.27,z+1.2);
  // Benches stay outside the court and leave its two end entrances clear.
  const seat=gloss(0xffc1d6,{roughness:.8});
  b.solid(.8,.42,3,seat,9.5,.23,z);
  b.box(.15,.55,3,brass,9.15,.7,z);
}

function volleyballCourt(b: Builder) {
  const sand=gloss(0xf9d49b,{roughness:.95});
  const coral=gloss(0xd75278,{roughness:.8});
  const rope=gloss(0xfff5e8,{roughness:.8});
  const post=gloss(0x47a4b0,{roughness:.4,metalness:.18});
  b.box(13,.04,10,sand,50,.06,35).name='Glam Beach volleyball court';
  for(const x of [43.8,56.2]) b.box(.095,.035,9.6,coral,x,.1,35);
  for(const z of [30.2,39.8]) b.box(12.4,.035,.095,coral,50,.1,z);
  for(const x of [43.6,56.4]) {
    b.cyl(.095,.14,2.65,10,post,x,1.34,35);
    b.cyl(.18,.18,.09,10,coral,x,2.68,35);
    b.collider(x,1.34,35,.15,1.34,.15);
  }
  // A visible woven mesh, top tape and lower rope make the real 3D net readable.
  for(let i=0;i<=24;i++) b.box(.018,1.2,.02,rope,43.8+i*12.4/24,1.91,35);
  for(let i=0;i<=5;i++) b.box(12.4,.018,.02,rope,50,1.31+i*.24,35);
  b.box(12.8,.1,.045,rope,50,2.56,35);
  b.collider(50,1.91,35,6.2,.65,.035);
  b.sphere(.24,gloss(0xfff4e3,{roughness:.68}),52,.34,37.8);
}

function photoBooth(b: Builder, fx: StationFx) {
  const gold = gloss(PALETTE.gold, { metalness: 0.92, roughness: 0.14 });
  const dark = gloss(0x2b2140, { metalness: 0.5, roughness: 0.35 });
  b.box(3.6, 0.18, 2.6, gloss(0xd0184f, { roughness: 0.38, metalness: 0.2 }), -46, 0.14, 16.4);
  buildPhotoGarden(b);
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
  netballCourt(b);
  volleyballCourt(b);
  photoBooth(b, fx);
  cafeKiosk(b, fx);

  for (const spot of SPOTS) beacon(b, spot, fx);
  return fx;
}