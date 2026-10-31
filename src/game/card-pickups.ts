import * as THREE from 'three';
import { COLLECTOR_CARDS } from '@/game/card-collection';
import { PALETTE } from '@/game/palette';

const LOCATIONS: Array<[number, number, number]> = [
  [0, 0.16, -37.8], [-2.5, 0.16, -42.2], [4.3, 0.72, -21.3],
  [-41.5, 0.1, -5], [-39.5, 0.1, 14], [30, 0.28, 30],
  [44, 0.08, 32], [56, 0.08, 35],
];
const RARITY_COLORS: Record<string, number> = {
  Signature: PALETTE.sky, Rare: PALETTE.purple, Limited: PALETTE.hotPink, Iconic: PALETTE.gold,
};

export type CardPickupField = {
  group: THREE.Group;
  update(dt: number, x: number, y: number, z: number, onCollect: (id: number, x: number, y: number, z: number) => void): void;
  setCollected(ids: number[]): void;
  dispose(): void;
};

function fallbackFace(title: string, color: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 256, 384);
    gradient.addColorStop(0, '#fff5fb');
    gradient.addColorStop(1, `#${color.toString(16).padStart(6, '0')}`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 384);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, 232, 360);
    ctx.fillStyle = '#a92773';
    ctx.font = 'bold 27px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('Dreamland', 128, 57);
    ctx.font = 'bold 94px Georgia';
    ctx.fillText('✧', 128, 214);
    ctx.font = 'bold 20px sans-serif';
    const words = title.split(' ');
    ctx.fillText(words.slice(0, -1).join(' '), 128, 306, 222);
    ctx.fillText(words[words.length - 1] ?? '', 128, 334, 222);
  }
  return canvas;
}

export function createCardPickups(camera?: THREE.Camera): CardPickupField {
  const group = new THREE.Group();
  group.name = 'collector-card-pickups';
  const frameGeometry = new THREE.BoxGeometry(0.84, 1.2, 0.065);
  const faceGeometry = new THREE.PlaneGeometry(0.75, 1.1);
  const ringGeometry = new THREE.RingGeometry(0.55, 0.64, 32);
  const gemGeometry = new THREE.OctahedronGeometry(0.085, 0);
  const textures = new Set<THREE.Texture>();
  const haloCanvas = document.createElement('canvas');
  haloCanvas.width = 64;
  haloCanvas.height = 64;
  const haloContext = haloCanvas.getContext('2d');
  if (haloContext) {
    const fade = haloContext.createRadialGradient(32, 32, 8, 32, 32, 32);
    fade.addColorStop(0, 'rgba(255,255,255,0.8)');
    fade.addColorStop(0.45, 'rgba(255,255,255,0.3)');
    fade.addColorStop(1, 'rgba(255,255,255,0)');
    haloContext.fillStyle = fade;
    haloContext.fillRect(0, 0, 64, 64);
  }
  const haloTexture = new THREE.CanvasTexture(haloCanvas);
  textures.add(haloTexture);
  const haloGeometry = new THREE.PlaneGeometry(1.6, 1.9);
  const loader = new THREE.TextureLoader();
  let disposed = false;
  const look = new THREE.Vector3();
  const items = LOCATIONS.map(([x, y, z], id) => {
    const color = RARITY_COLORS[(COLLECTOR_CARDS[id] as { rarity?: string }).rarity ?? 'Signature'] ?? PALETTE.sky;
    const card = new THREE.Group();
    const foil = new THREE.MeshStandardMaterial({ color, metalness: 0.62, roughness: 0.26, emissive: color, emissiveIntensity: 0.22 });
    const frame = new THREE.Mesh(frameGeometry, foil);
    const fallback = new THREE.CanvasTexture(fallbackFace(COLLECTOR_CARDS[id].title, color));
    fallback.colorSpace = THREE.SRGBColorSpace;
    textures.add(fallback);
    const print = new THREE.MeshStandardMaterial({ map: fallback, roughness: 0.58, metalness: 0.02, emissive: 0xffffff, emissiveIntensity: 0.22 });
    // Two printed faces stay legible while the foil rocks in the breeze.
    const front = new THREE.Mesh(faceGeometry, print);
    front.position.z = 0.038;
    const back = new THREE.Mesh(faceGeometry, print);
    back.position.z = -0.038;
    back.rotation.y = Math.PI;
    const gem = new THREE.Mesh(gemGeometry, foil);
    gem.position.set(0.35, 0.57, 0.05);
    const halo = new THREE.Mesh(haloGeometry, new THREE.MeshBasicMaterial({ map: haloTexture, color, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    halo.position.z = -0.045;
    card.add(halo, frame, front, back, gem);
    card.position.set(x, y + 1.02, z);
    const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, y + 0.05, z);
    group.add(card, ring);
    // Eight images maximum, downsampled to <=512px before GPU upload.
    const loadingTexture = loader.load(COLLECTOR_CARDS[id].image, texture => {
      if (disposed) { texture.dispose(); return; }
      const image = texture.image as HTMLImageElement;
      const longest = Math.max(image.width, image.height);
      if (longest > 512) {
        const reduced = document.createElement('canvas');
        reduced.width = Math.max(1, Math.round(image.width * 512 / longest));
        reduced.height = Math.max(1, Math.round(image.height * 512 / longest));
        const context = reduced.getContext('2d');
        if (context) {
          context.drawImage(image, 0, 0, reduced.width, reduced.height);
          texture.image = reduced;
        }
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      print.map = texture;
      print.needsUpdate = true;
    }, undefined, () => { /* Keep the title face visible offline. */ });
    textures.add(loadingTexture);
    return { id, card, ring, x, y, z, phase: id * 0.78, taken: false };
  });
  let clock = 0;
  return {
    group,
    update(dt, x, y, z, onCollect) {
      clock += dt;
      for (const item of items) {
        if (item.taken) continue;
        item.card.position.y = item.y + 1.02 + Math.sin(clock * 2.1 + item.phase) * 0.1;
        if (camera) {
          look.set(camera.position.x, item.card.position.y, camera.position.z);
          item.card.lookAt(look);
        }
        item.card.rotation.y += Math.sin(clock * 1.3 + item.phase) * 0.16;
        item.card.rotation.z = Math.sin(clock * 1.6 + item.phase) * 0.06;
        item.ring.scale.setScalar(1 + Math.sin(clock * 2 + item.phase) * 0.09);
        const dx = x - item.x;
        const dz = z - item.z;
        if (dx * dx + dz * dz < 2.8 && Math.abs(y - item.y) < 2.2) {
          item.taken = true;
          item.card.visible = false;
          item.ring.visible = false;
          onCollect(item.id, item.x, item.y + 0.85, item.z);
        }
      }
    },
    setCollected(ids) {
      const collected = new Set(ids);
      for (const item of items) {
        item.taken = collected.has(item.id);
        item.card.visible = !item.taken;
        item.ring.visible = !item.taken;
      }
    },
    dispose() {
      disposed = true;
      textures.forEach(texture => texture.dispose());
      textures.clear();
    },
  };
}
