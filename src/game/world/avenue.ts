import * as THREE from 'three';
import type { Builder } from '@/game/builder';
import { PALETTE, gloss, glassMaterial, neonMaterial } from '@/game/palette';
import { lamp, neonPanel, palm } from '@/game/world/props';
import { surface, signTexture } from '@/game/world/materials';

export function buildAvenue(b: Builder) {
  const road = gloss(PALETTE.plum, { roughness: 0.42, metalness: 0.3 });
  const shopWall = surface(PALETTE.blush, 'plaster', { roughness: 0.72, metalness: 0.04 });
  const trim = gloss(PALETTE.magenta, { roughness: 0.26, metalness: 0.35 });
  const gold = gloss(PALETTE.gold, { metalness: 0.92, roughness: 0.14 });
  const white = gloss(PALETTE.white, { roughness: 0.2, metalness: 0.4 });

  b.box(20, 0.06, 38, road, -46, 0.05, 14);
  for (let i = 0; i < 7; i += 1) {
    b.box(0.5, 0.06, 2.4, gold, -46, 0.09, -2 + i * 5);
  }

  // Boutiques along the avenue
  for (let i = 0; i < 3; i += 1) {
    const z = -1 + i * 13;
    b.solid(9, 7, 8, shopWall, -58, 3.5, z);
    b.box(9.6, 0.5, 8.6, trim, -58, 7.1, z);
    b.box(0.3, 3, 6.4, glassMaterial(PALETTE.sky, 0.55), -53.35, 2.4, z);
    b.box(1.6, 0.3, 6.8, i % 2 === 0 ? trim : gloss(PALETTE.purple), -53.1, 4.3, z);
    for (let stripe = 0; stripe < 6; stripe += 1) {
      b.box(1.7, 0.08, 0.56, white, -53.08, 4.49, z - 2.8 + stripe * 1.12);
    }
    neonPanel(b, -53.45, 5.6, z, 5.6, 0.9, i === 1 ? PALETTE.neonBlue : PALETTE.gold, Math.PI / 2);
    if(typeof document!=='undefined') {
      const sign=b.add(new THREE.PlaneGeometry(6.2,.88),new THREE.MeshStandardMaterial({map:signTexture(['DREAM COUTURE','THE GLAM EDIT','ROSE & GOLD'][i]),roughness:.6}),-53.28,5.6,z);
      sign.rotation.y=Math.PI/2;
    }
    for(const edge of [-3.5,3.5]) {
      b.box(.4,6.8,.3,gold,-53.42,3.5,z+edge);
      b.box(.42,.25,.8,white,-53.4,6.1,z+edge);
    }
    // Raised pilasters and cornice give the street a recognisable boutique silhouette.
    b.box(9.8,.2,9.1,white,-58,7.48,z);
    b.cyl(0.16, 0.16, 2.6, 8, gold, -53, 5.6, z + 3.2);
  }

  // Runway with stage, pose targets and seating
  b.box(9, 0.1, 26, gloss(0xd0184f, { roughness: 0.35, metalness: 0.2 }), -46, 0.08, 6);
  b.box(0.5, 0.12, 26, gold, -50.6, 0.12, 6);
  b.box(0.5, 0.12, 26, gold, -41.4, 0.12, 6);
  b.solid(11, 1, 8, white, -46, 0.5, 22);
  b.box(11.4, 0.3, 8.4, gold, -46, 1.05, 22);
  b.box(11, 5.2, 0.5, gloss(PALETTE.pastelPink, { roughness: 0.24, metalness: 0.4 }), -46, 3.6, 26);
  neonPanel(b, -46, 5.6, 25.7, 10, 0.5, PALETTE.magenta);
  for (let i = 0; i < 3; i += 1) {
    const ring = b.add(
      new THREE.TorusGeometry(0.95, 0.14, 8, 18),
      neonMaterial(i === 1 ? PALETTE.gold : PALETTE.neonBlue, 1.7),
      -46 + (i - 1) * 3,
      2.4,
      23.4
    );
    ring.rotation.x = 0;
  }
  for (let i = 0; i < 4; i += 1) {
    b.box(1.1, 0.7, 1.1, gloss(PALETTE.white, { roughness: 0.3, metalness: 0.3 }), -54.5, 0.35, 0 + i * 2.6);
    b.box(1.1, 0.7, 1.1, gloss(PALETTE.white, { roughness: 0.3, metalness: 0.3 }), -37.5, 0.35, 0 + i * 2.6);
  }

  // Pet salon
  b.solid(8, 5, 7, gloss(PALETTE.pastelPink, { roughness: 0.24, metalness: 0.35 }), -32, 2.5, 8);
  b.box(8.6, 0.4, 7.6, trim, -32, 5.2, 8);
  b.box(0.3, 2.8, 6, glassMaterial(PALETTE.white, 0.5), -27.85, 2.1, 8);
  for (let i = 0; i < 4; i += 1) {
    b.box(1.6, 0.26, 1.6, i % 2 === 0 ? trim : white, -28.1, 4.05, 5.3 + i * 1.8);
  }
  b.box(0.18, 0.9, 2.6, neonMaterial(PALETTE.gold, 1.4), -27.9, 4.4, 8);
  b.box(0.5, 0.16, 2.8, gold, -28.1, 5.6, 8);

  // Street lamps and palms
  lamp(b, -40, 24);
  lamp(b, -40, 4);
  lamp(b, -52, -8);
  lamp(b, -52, 30);
  palm(b, -36, 30, 1);
  palm(b, -50, -14, 0.9);
}