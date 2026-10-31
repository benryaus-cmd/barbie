import * as THREE from 'three';

export const PALETTE = {
  magenta: 0xff2d8f,
  hotPink: 0xff63b6,
  pastelPink: 0xffb8dc,
  blush: 0xffd9ec,
  gold: 0xffcf5c,
  sky: 0x5ecbff,
  ocean: 0x27a5dd,
  white: 0xfdf8ff,
  cream: 0xfff3e4,
  sand: 0xffe6bd,
  sandDeep: 0xf5d3a1,
  mint: 0x7ee2b8,
  purple: 0x9d5cf0,
  plum: 0x5a1040,
  neonBlue: 0x54f0ff,
  wood: 0xc98b62,
};

export type GlossOptions = {
  roughness?: number;
  metalness?: number;
  emissive?: number;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  side?: THREE.Side;
};

export function gloss(color: number, options: GlossOptions = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.46,
    metalness: options.metalness ?? 0.08,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 1,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    side: options.side ?? THREE.FrontSide,
  });
}

export function neonMaterial(color: number, intensity = 1.6) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.45,
    metalness: 0.1,
    toneMapped: false,
  });
}

export function glassMaterial(color = PALETTE.sky, opacity = 0.55) {
  return new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity,
    roughness: 0.08,
    metalness: 0.18,
    emissive: color,
    emissiveIntensity: 0.25,
  });
}