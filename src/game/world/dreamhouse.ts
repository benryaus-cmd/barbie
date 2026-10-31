import * as THREE from 'three';
import type { Builder } from '@/game/builder';
import { PALETTE, gloss, glassMaterial, neonMaterial } from '@/game/palette';
import { neonPanel } from '@/game/world/props';
import { surface, signTexture } from '@/game/world/materials';

export type DreamhouseMood = {
  light: THREE.PointLight;
  orbMat: THREE.MeshStandardMaterial;
};

export function buildDreamhouse(b: Builder): DreamhouseMood {
  const wall = surface(PALETTE.cream, 'plaster', { roughness: 0.66, metalness: 0.06 });
  const inner = surface(0xfff2f9, 'plaster', { roughness: 0.7, metalness: 0.04 });
  const pink = gloss(PALETTE.pastelPink, { roughness: 0.2, metalness: 0.4 });
  const trim = gloss(PALETTE.magenta, { roughness: 0.26, metalness: 0.35 });
  const gold = gloss(PALETTE.gold, { metalness: 0.92, roughness: 0.14 });
  const white = gloss(PALETTE.white, { roughness: 0.18, metalness: 0.4 });
  const floorMat = gloss(0xffe4f2, { roughness: 0.3, metalness: 0.25 });
  const kitchenTop = gloss(PALETTE.white, { roughness: 0.16, metalness: 0.5 });

  // Ground floor slab (visual polish over terrain)
  b.box(19.6, 0.14, 13.6, floorMat, 0, 0.08, -46);

  // ---- Structure: hollow, enterable footprint x[-10,10] z[-53,-39] ----
  // Back wall (full height, also loft wall)
  b.solid(20, 7.4, 0.5, wall, 0, 3.7, -52.75);
  // Side walls: front half (low) + back half (tall loft walls)
  b.solid(0.5, 3.7, 8.4, wall, -9.75, 1.85, -43.2);
  b.solid(0.5, 3.7, 8.4, wall, 9.75, 1.85, -43.2);
  b.solid(0.5, 7.4, 5.6, wall, -9.75, 3.7, -50.2);
  b.solid(0.5, 7.4, 5.6, wall, 9.75, 3.7, -50.2);
  // Front wall with centered door gap x[-1.9,1.9]
  b.solid(7.6, 3.7, 0.5, wall, -5.7, 1.85, -39.25);
  b.solid(7.6, 3.7, 0.5, wall, 5.7, 1.85, -39.25);
  // Interior partition between living room and kitchen (open doorway at front)
  b.solid(0.5, 3.7, 4.9, inner, 0, 1.85, -44.95);
  // Back partition (stair hall) with doorway gap x[1.5,4.5]
  b.solid(8.4, 3.7, 0.5, inner, -2.3, 1.85, -47.4);
  b.solid(5.25, 3.7, 0.5, inner, 7.125, 1.85, -47.4);

  // Second-floor slab over the back half (stair opening at x[-9.75,-6.5])
  b.solid(16.25, 0.3, 5.6, white, 1.625, 3.75, -50.2);

  // A full-width stair passage avoids the old partition across the flight.
  // Closed risers use a comfortable 0.15m rise, with a clear 3m flight.
  for (let i = 0; i < 26; i += 1) {
    const height = (i + 1) * 0.15;
    b.solid(3, height, 8.4 / 26, pink, -8.1, height / 2, -42.3 - (i + 0.5) * 8.4 / 26);
    b.box(2.9, 0.025, 0.07, white, -8.1, height + 0.012, -42.32 - i * 8.4 / 26);
  }
  // The top landing turns right into the loft, with 1.8m depth and clear headroom.
  b.solid(3.1, 0.3, 1.8, white, -8.05, 3.75, -51.6);

  // Loft guards stop before the landing opening; the old continuous rail
  // sealed off the only route from the stairs onto the upper floor.
  b.box(16.25, 0.1, 0.12, gold, 1.625, 4.95, -47.4);
  b.collider(1.625, 4.45, -47.4, 8.1, 0.55, 0.06);
  b.box(0.12, 0.1, 3.15, gold, -6.5, 4.95, -48.975);
  b.collider(-6.5, 4.45, -48.975, 0.06, 0.55, 1.575);
  for (let i = 0; i <= 6; i += 1) {
    b.cyl(0.05, 0.05, 1.05, 6, gold, -6.5 + i * 2.7, 4.42, -47.4);
  }
  for (const z of [-47.9, -49.2, -50.5]) b.cyl(0.05, 0.05, 1.05, 6, gold, -6.5, 4.42, z);

  // ---- Facade dressing ----
  // Front windows
  for (const wx of [-6, 6]) {
    b.box(2.2, 1.8, 0.2, glassMaterial(PALETTE.sky, 0.6), wx, 1.95, -38.95);
    b.box(2.4, 2, 0.14, gold, wx, 1.95, -39.02);
  }
  // Side windows (ground + loft)
  for (const sx of [-10.05, 10.05]) {
    b.box(0.2, 1.8, 2.2, glassMaterial(PALETTE.sky, 0.6), sx, 1.95, -43.2);
    b.box(0.14, 2, 2.4, gold, sx, 1.95, -43.2);
    b.box(0.2, 1.6, 2, glassMaterial(PALETTE.sky, 0.6), sx, 5.5, -50.2);
    b.box(0.14, 1.8, 2.2, gold, sx, 5.5, -50.2);
  }
  // Door frame + lintel + glowing name sign
  b.box(0.45, 3.7, 0.6, gold, -2.1, 1.85, -39.25);
  b.box(0.45, 3.7, 0.6, gold, 2.1, 1.85, -39.25);
  b.box(4.7, 0.9, 0.6, gold, 0, 3.25, -39.25);
  b.box(3.7, 0.42, 0.2, neonMaterial(PALETTE.magenta, 1.9), 0, 3.25, -38.92);
  // Awning over the door
  const awning = b.box(5.4, 0.2, 1.9, trim, 0, 3.95, -38.6);
  awning.rotation.x = 0.16;
  // Roofline caps
  b.box(20.6, 0.32, 0.8, gold, 0, 3.86, -39.05);
  b.box(20.6, 0.32, 0.8, gold, 0, 7.56, -52.75);
  b.box(0.8, 7.7, 6, gold, -10.05, 3.85, -50.2);
  b.box(0.8, 7.7, 6, gold, 10.05, 3.85, -50.2);

  // Porcelain-pink architectural crown and a readable arrival landmark.
  if (typeof document !== 'undefined') {
    b.add(new THREE.PlaneGeometry(7.4,1.85),new THREE.MeshStandardMaterial({map:signTexture('Dreamhouse','#fff9ef','#d52f81',true),roughness:.45,emissive:0xff92ba,emissiveIntensity:.12}),0,5.55,-47.05);
  }
  b.box(8, .18, .38, pink, 0, 6.65, -47.3);
  for (const px of [-4,4]) b.cyl(.12,.16,2.1,10,pink,px,5.6,-47.3);
  for (let i=0;i<7;i++) b.box(.22,.22,5.9,pink,-8.4+i*2.8,7.65,-50.2);

  // ---- Living room (left-front) ----
  b.box(6, 0.06, 4.6, gloss(PALETTE.pastelPink, { roughness: 0.4 }), -5, 0.18, -43.2);
  const sofa = surface(PALETTE.white, 'fabric', { roughness: 0.88 });
  const cushion = surface(PALETTE.magenta, 'fabric', { roughness: 0.8, metalness: 0.02 });
  b.box(4.2, 0.75, 1.3, sofa, -5, 0.58, -46);
  b.box(4.2, 1.15, 0.35, sofa, -5, 1.15, -46.7);
  b.box(4, 0.24, 1.1, cushion, -5, 1.02, -45.95);
  b.collider(-5, 0.7, -46.2, 2.1, 0.85, 0.75);
  b.box(2.4, 0.42, 1.2, glassMaterial(PALETTE.white, 0.55), -5, 0.42, -42.6);
  b.box(2.6, 0.1, 1.4, gold, -5, 0.68, -42.6);
  b.collider(-5, 0.4, -42.6, 1.25, 0.4, 0.7);
  b.sphere(0.16, gloss(PALETTE.sky, { roughness: 0.3 }), -5.5, 0.8, -42.6);
  b.sphere(0.13, gloss(PALETTE.gold, { metalness: 0.8 }), -4.5, 0.79, -42.7);
  // Wall TV with neon glow
  b.box(0.2, 1.5, 2.6, gloss(0x2a2140, { metalness: 0.6 }), -9.4, 2, -43.2);
  b.box(0.12, 1.7, 2.8, neonMaterial(PALETTE.neonBlue, 1.4), -9.32, 2, -43.2);

  // Mood light station (interactive)
  const orbMat = new THREE.MeshStandardMaterial({
    color: 0xff5fa8,
    emissive: 0xff5fa8,
    emissiveIntensity: 2.4,
    roughness: 0.25,
    metalness: 0.1,
  });
  b.cyl(0.3, 0.38, 1.05, 10, gold, -7.9, 0.72, -40.7);
  b.sphere(0.46, orbMat, -7.9, 1.55, -40.7);
  const moodLight = new THREE.PointLight(0xff5fa8, 32, 16, 1.6);
  moodLight.position.set(-7.9, 2.3, -40.7);
  b.group.add(moodLight);

  // ---- Kitchen (right-front) ----
  b.box(1.7, 0.95, 7.4, white, 8.7, 0.67, -43.2);
  b.box(1.9, 0.12, 7.6, kitchenTop, 8.7, 1.2, -43.2);
  b.collider(8.7, 0.6, -43.2, 0.9, 0.65, 3.7);
  b.box(5, 0.95, 1.7, white, 4.5, 0.67, -46.4);
  b.box(5.2, 0.12, 1.9, kitchenTop, 4.5, 1.2, -46.4);
  b.collider(4.5, 0.6, -46.4, 2.5, 0.65, 0.9);
  // Island with smoothie station
  b.box(2.4, 0.95, 2.8, pink, 4.5, 0.67, -42.4);
  b.box(2.7, 0.14, 3.1, kitchenTop, 4.5, 1.22, -42.4);
  b.collider(4.5, 0.6, -42.4, 1.3, 0.65, 1.5);
  const blenderBase = gloss(0x2a2140, { metalness: 0.6 });
  b.cyl(0.32, 0.38, 0.5, 10, blenderBase, 4.1, 1.55, -42.4);
  b.cyl(0.28, 0.24, 0.6, 10, glassMaterial(PALETTE.white, 0.5), 4.1, 2.1, -42.4);
  b.cyl(0.3, 0.3, 0.12, 10, gold, 4.1, 2.46, -42.4);
  b.cyl(0.3, 0.36, 0.5, 10, blenderBase, 5.2, 1.55, -43.1);
  b.cyl(0.26, 0.22, 0.55, 10, glassMaterial(PALETTE.sky, 0.5), 5.2, 2.08, -43.1);
  // Fruit bowls
  b.cyl(0.34, 0.26, 0.18, 10, gold, 8.5, 1.35, -41);
  for (const [fx, fz, fc] of [
    [8.4, -40.9, PALETTE.gold],
    [8.65, -41.1, PALETTE.magenta],
    [8.5, -41.2, PALETTE.pastelPink],
  ] as Array<[number, number, number]>) {
    b.sphere(0.14, gloss(fc, { roughness: 0.35 }), fx, 1.52, fz);
  }
  // Stools
  for (const stz of [-41.3, -43.4]) {
    b.cyl(0.32, 0.32, 0.12, 10, cushion, 6.6, 0.68, stz);
    b.cyl(0.09, 0.12, 0.62, 8, gold, 6.6, 0.33, stz);
  }
  // Pendant lamps
  for (const plx of [3.6, 5.4]) {
    b.cyl(0.04, 0.04, 0.7, 6, gold, plx, 3.3, -42.4);
    b.sphere(0.2, neonMaterial(PALETTE.gold, 1.6), plx, 2.9, -42.4);
  }
  const kitchenLight = new THREE.PointLight(0xfff0f8, 22, 14, 1.5);
  kitchenLight.position.set(5.5, 3, -43.5);
  b.group.add(kitchenLight);

  // ---- Stair hall dressing ----
  for (const [px, pz] of [[-4.5, -48.5], [6.5, -48.8], [8.3, -51.8]] as Array<[number, number]>) {
    b.cyl(0.3, 0.36, 0.5, 10, trim, px, 0.27, pz);
    b.cyl(0.05, 0.05, 0.9, 6, gloss(0x2ebd7c, { roughness: 0.6 }), px, 0.95, pz);
    b.sphere(0.42, gloss(0x2ebd7c, { roughness: 0.55 }), px, 1.55, pz);
    b.collider(px, 0.6, pz, 0.4, 0.6, 0.4);
  }
  neonPanel(b, 2.8, 3.3, -47.62, 2.4, 0.24, PALETTE.gold);

  // ---- Loft: Style Studio (walk-in closet) ----
  b.box(8, 0.06, 3.6, gloss(PALETTE.pastelPink, { roughness: 0.4 }), -2, 3.94, -50.4);
  // Vanity + mirror on the back wall
  b.box(2.4, 0.85, 0.9, white, -4.5, 4.33, -52);
  b.box(2.7, 0.1, 1.1, gold, -4.5, 4.8, -52);
  b.box(2, 2.2, 0.14, glassMaterial(PALETTE.white, 0.45), -4.5, 5.6, -52.42);
  b.box(2.2, 2.4, 0.1, gold, -4.5, 5.6, -52.5);
  b.collider(-4.5, 4.35, -52, 1.2, 0.5, 0.5);
  // Lit makeup mirror and cosmetic trays distinguish the vanity from wardrobe.
  for (const x of [-5.47,-3.53]) for(let i=0;i<5;i++) b.sphere(.075,neonMaterial(0xffefcf,.8),x,4.7+i*.43,-52.26);
  for (let i=0;i<4;i++) {
    b.cyl(.07,.07,.2+i*.035,8,gloss([0xff6a9b,0xd54272,0xf2b788,0x9d5cf0][i]),-5.2+i*.25,4.96,-51.87);
    b.cyl(.072,.072,.06,8,gold,-5.2+i*.25,5.09+i*.0175,-51.87);
  }
  b.box(.5,.045,.35,gold,-3.8,4.88,-51.9);
  // Stool at the vanity
  b.cyl(0.3, 0.3, 0.14, 10, cushion, -4.5, 4.12, -50.9);
  b.cyl(0.09, 0.12, 0.6, 8, gold, -4.5, 3.75, -50.9);
  // Dress racks with hanging dresses
  const dressColors = [PALETTE.magenta, PALETTE.pastelPink, PALETTE.gold, PALETTE.sky, PALETTE.purple];
  b.box(0.12, 0.12, 3.4, gold, 3.5, 5.6, -50.4);
  for (let i = 0; i < 5; i += 1) {
    const dress = b.add(
      new THREE.ConeGeometry(0.5, 1.7, 10),
      gloss(dressColors[i], { roughness: 0.32, metalness: 0.3 }),
      3.5,
      4.6,
      -51.9 + i * 0.78
    );
    dress.rotation.x = Math.PI;
  }
  b.box(0.12, 0.12, 3, gold, 6.8, 5.6, -50.6);
  for (let i = 0; i < 4; i += 1) {
    const dress = b.add(
      new THREE.ConeGeometry(0.46, 1.6, 10),
      gloss(dressColors[(i + 2) % 5], { roughness: 0.32, metalness: 0.3 }),
      6.8,
      4.65,
      -51.8 + i * 0.8
    );
    dress.rotation.x = Math.PI;
  }
  for (const rz of [-51.9, -49]) {
    b.cyl(0.08, 0.08, 1.7, 6, gold, 3.5, 4.75, rz);
  }
  for (const rz of [-51.8, -49.4]) {
    b.cyl(0.08, 0.08, 1.7, 6, gold, 6.8, 4.75, rz);
  }
  // Shoe shelves along the right wall
  for (let s = 0; s < 3; s += 1) {
    b.box(0.9, 0.08, 3.4, white, 9, 4.3 + s * 0.55, -50.4);
    for (let sh = 0; sh < 4; sh += 1) {
      b.box(0.24, 0.16, 0.42, gloss(dressColors[(sh + s) % 5], { roughness: 0.4 }), 8.9, 4.42 + s * 0.55, -51.7 + sh * 0.85);
    }
  }
  b.collider(9, 4.8, -50.4, 0.5, 1, 1.7);
  // Neon "STYLE" sign on the loft back wall
  neonPanel(b, 1.5, 6.2, -52.4, 5.5, 0.5, PALETTE.neonBlue);
  neonPanel(b, 1.5, 5.55, -52.4, 4, 0.16, PALETTE.magenta);

  const loftLight = new THREE.PointLight(0xffd9ec, 26, 18, 1.5);
  loftLight.position.set(0, 6.4, -50);
  b.group.add(loftLight);
  const stairLight = new THREE.PointLight(0xfff4dc, 16, 12, 1.5);
  stairLight.position.set(-8, 4.6, -49);
  b.group.add(stairLight);

  // ---- Pool terrace with slide ----
  // A shallow basin with actual animated water; separate coping leaves its centre open.
  b.solid(11.2, .18, 8.2, gloss(0x50bfcf, { roughness: .55 }), 0, .18, -25);
  b.solid(.9, .7, 10, white, -6.05, .35, -25);
  b.solid(.9, .7, 10, white, 6.05, .35, -25);
  b.solid(11.2, .7, .9, white, 0, .35, -29.55);
  b.solid(11.2, .7, .9, white, 0, .35, -20.45);
  const slideCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(5.4, 4.8, -25),
    new THREE.Vector3(4.4, 3.1, -24.2),
    new THREE.Vector3(2.6, 1.5, -24.6),
    new THREE.Vector3(1.1, 0.95, -25.2),
  ]);
  b.add(
    new THREE.TubeGeometry(slideCurve, 20, 0.52, 8, false),
    gloss(PALETTE.magenta, { roughness: 0.3, metalness: 0.3 }),
    0,
    0,
    0
  );
  b.cyl(0.18, 0.18, 4.6, 8, gold, 6.1, 2.3, -26.2);
  b.cyl(0.18, 0.18, 2.4, 8, gold, 5.4, 1.2, -23.6);

  // ---- DJ booth patio ----
  b.solid(4.6, 1.5, 2.3, trim, 11, 0.75, -32);
  b.box(5, 0.24, 2.7, white, 11, 1.62, -32);
  b.cyl(0.52, 0.52, 0.24, 12, blenderBase, 10.2, 1.82, -32);
  b.cyl(0.52, 0.52, 0.24, 12, blenderBase, 11.8, 1.82, -32);
  b.cyl(0.34, 0.34, 0.28, 12, neonMaterial(PALETTE.neonBlue, 1.8), 10.2, 1.86, -32);
  b.cyl(0.34, 0.34, 0.28, 12, neonMaterial(PALETTE.gold, 1.8), 11.8, 1.86, -32);
  b.solid(1.3, 2.8, 1.3, gloss(0x2b2140, { metalness: 0.55 }), 8, 1.4, -32.6);
  b.solid(1.3, 2.8, 1.3, gloss(0x2b2140, { metalness: 0.55 }), 14, 1.4, -32.6);
  b.cyl(0.48, 0.48, 0.12, 12, neonMaterial(PALETTE.magenta, 1.8), 8, 1.9, -31.95).rotation.x =
    Math.PI / 2;
  b.cyl(0.48, 0.48, 0.12, 12, neonMaterial(PALETTE.sky, 1.8), 14, 1.9, -31.95).rotation.x =
    Math.PI / 2;
  b.cyl(0.12, 0.12, 3.4, 8, gold, 7.4, 2.6, -33.4);
  b.cyl(0.12, 0.12, 3.4, 8, gold, 14.6, 2.6, -33.4);
  neonPanel(b, 11, 4.3, -33.4, 7.6, 0.26, PALETTE.magenta);
  neonPanel(b, 11, 3.6, -33.4, 6, 0.16, PALETTE.neonBlue);

  // Patio lounge in front of the house
  b.box(9, 0.12, 6, gloss(PALETTE.pastelPink, { roughness: 0.35, metalness: 0.2 }), -4, 0.09, -34);
  b.box(4.4, 0.7, 1.2, sofa, -4, 0.45, -36.3);
  b.box(4.2, 0.26, 1, cushion, -4, 0.83, -36.3);
  b.box(4.4, 0.5, 1, sofa, -4, 0.35, -31.9);
  b.box(4.2, 0.22, 0.86, cushion, -4, 0.66, -31.9);
  b.box(2.6, 0.34, 1.1, glassMaterial(PALETTE.white, 0.55), -4, 0.55, -34.1);
  b.box(2.7, 0.1, 1.2, gold, -4, 0.72, -34.1);
  b.collider(-4, 0.45, -36.3, 2.2, 0.45, 0.62);
  b.collider(-4, 0.35, -31.9, 2.2, 0.36, 0.52);
  b.collider(-4, 0.4, -34.1, 1.35, 0.4, 0.6);

  // Driveway
  b.box(11, 0.1, 9, gloss(0x40304f, { roughness: 0.4 }), 15, 0.06, -42);
  b.box(4, 0.12, 0.4, white, 15, 0.1, -46.6);

  // Lantern posts along the patio
  for (const lx of [-14, 14]) {
    b.cyl(0.14, 0.2, 3.2, 8, gold, lx, 1.6, -24);
    b.sphere(0.34, neonMaterial(PALETTE.gold, 1.6), lx, 3.4, -24);
  }

  return { light: moodLight, orbMat };
}