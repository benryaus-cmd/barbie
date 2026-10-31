import * as THREE from 'three';

const MAX = 150;
const HIDDEN_Y = -900;

export type Particles = {
  points: THREE.Points;
  sparkle(x: number, y: number, z: number, color?: number, count?: number): void;
  burst(x: number, y: number, z: number, count?: number): void;
  update(dt: number): void;
  dispose(): void;
};

const CONFETTI_COLORS = [0xff2d8f, 0xffcf5c, 0x54f0ff, 0xfff8ff, 0x9d5cf0];

export function createParticles(): Particles {
  const positions = new Float32Array(MAX * 3);
  const colors = new Float32Array(MAX * 3);
  const baseColors = new Float32Array(MAX * 3);
  const velocity = new Float32Array(MAX * 3);
  const life = new Float32Array(MAX);
  const total = new Float32Array(MAX);

  for (let i = 0; i < MAX; i += 1) {
    positions[i * 3 + 1] = HIDDEN_Y;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.3,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  const color = new THREE.Color();
  let cursor = 0;

  function emit(
    x: number,
    y: number,
    z: number,
    spread: number,
    lift: number,
    ttl: number,
    count: number,
    palette: number[]
  ) {
    for (let n = 0; n < count; n += 1) {
      const index = cursor;
      cursor = (cursor + 1) % MAX;
      const p = index * 3;
      positions[p] = x + (Math.random() - 0.5) * spread;
      positions[p + 1] = y + Math.random() * spread * 0.6;
      positions[p + 2] = z + (Math.random() - 0.5) * spread;
      velocity[p] = (Math.random() - 0.5) * spread * 1.6;
      velocity[p + 1] = lift * (0.6 + Math.random() * 0.9);
      velocity[p + 2] = (Math.random() - 0.5) * spread * 1.6;
      color.setHex(palette[Math.floor(Math.random() * palette.length)]);
      baseColors[p] = color.r;
      baseColors[p + 1] = color.g;
      baseColors[p + 2] = color.b;
      colors[p] = color.r;
      colors[p + 1] = color.g;
      colors[p + 2] = color.b;
      total[index] = ttl;
      life[index] = ttl;
    }
  }

  return {
    points,
    sparkle(x, y, z, particleColor = 0xffe27a, count = 8) {
      emit(x, y, z, 0.5, 2.4, 0.55, count, [particleColor, 0xffffff]);
    },
    burst(x, y, z, count = 34) {
      emit(x, y, z, 2.6, 5.2, 1.5, count, CONFETTI_COLORS);
    },
    update(dt) {
      let visible = false;
      for (let i = 0; i < MAX; i += 1) {
        if (life[i] <= 0) continue;
        visible = true;
        const p = i * 3;
        life[i] -= dt;
        if (life[i] <= 0) {
          positions[p + 1] = HIDDEN_Y;
          colors[p] = 0;
          colors[p + 1] = 0;
          colors[p + 2] = 0;
          continue;
        }
        velocity[p + 1] -= 7.5 * dt;
        positions[p] += velocity[p] * dt;
        positions[p + 1] += velocity[p + 1] * dt;
        positions[p + 2] += velocity[p + 2] * dt;
        if (positions[p + 1] < 0.05) {
          positions[p + 1] = 0.05;
          velocity[p + 1] *= -0.32;
          velocity[p] *= 0.7;
          velocity[p + 2] *= 0.7;
        }
        const fade = Math.min(1, life[i] / total[i]);
        colors[p] = baseColors[p] * fade;
        colors[p + 1] = baseColors[p + 1] * fade;
        colors[p + 2] = baseColors[p + 2] * fade;
      }
      if (visible) {
        const attr = geometry.getAttribute('position') as THREE.BufferAttribute;
        attr.needsUpdate = true;
        const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
        colorAttr.needsUpdate = true;
      }
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}