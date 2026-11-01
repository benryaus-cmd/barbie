import * as THREE from 'three';

export type CharacterSurface = 'skin' | 'satin' | 'cotton' | 'denim' | 'hair';
const textures = new Map<CharacterSurface, THREE.DataTexture>();
const settings: Record<CharacterSurface, { bump: number; repeat: number }> = {
  skin: { bump: .00017, repeat: 5 }, satin: { bump: .00014, repeat: 8 },
  cotton: { bump: .00038, repeat: 7 }, denim: { bump: .00065, repeat: 7 }, hair: { bump: .0002, repeat: 5 },
};

function surfaceTexture(kind: CharacterSurface) {
  const cached = textures.get(kind);
  if (cached) return cached;
  const size = 64, data = new Uint8Array(size * size * 4);
  let seed = 137 + Object.keys(settings).indexOf(kind) * 953;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = (seed >>> 24) / 255 - .5;
    const weave = kind === 'denim' ? Math.sin((x + y) * Math.PI / 2) * .7 :
      kind === 'cotton' ? ((x % 2) - .5) * ((y % 2) - .5) * 2 :
      kind === 'satin' ? Math.sin(y * Math.PI / 2) * .32 :
      kind === 'hair' ? Math.sin(x * Math.PI / 2) * .6 : 0;
    const offset = (y * size + x) * 4;
    // Bump uses red, roughness uses green: one compact shared texture serves both.
    data[offset] = Math.round(128 + noise * 22 + weave * 18);
    data[offset + 1] = Math.round(247 + noise * 10 + weave * 3);
    data[offset + 2] = 255; data[offset + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.name = `character ${kind} micro surface`;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.setScalar(settings[kind].repeat);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  textures.set(kind, texture);
  return texture;
}

/** Add shared, restrained micro detail without changing wardrobe or resident colors. */
export function applyCharacterSurface(material: THREE.MeshStandardMaterial, kind: CharacterSurface): void {
  material.bumpMap = material.roughnessMap = surfaceTexture(kind);
  material.bumpScale = settings[kind].bump;
  material.needsUpdate = true;
}
