import * as THREE from 'three';
import type { ColliderBox } from '@/game/types';

export type Builder = {
  group: THREE.Group;
  add(
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x?: number,
    y?: number,
    z?: number
  ): THREE.Mesh;
  box(
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    ry?: number
  ): THREE.Mesh;
  cyl(
    topRadius: number,
    bottomRadius: number,
    height: number,
    segments: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number
  ): THREE.Mesh;
  sphere(
    radius: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number
  ): THREE.Mesh;
  solid(
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    ry?: number
  ): THREE.Mesh;
  collider(
    x: number,
    y: number,
    z: number,
    hx: number,
    hy: number,
    hz: number
  ): void;
};

export function createBuilder(colliders: ColliderBox[]): Builder {
  const group = new THREE.Group();

  function add(
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x = 0,
    y = 0,
    z = 0
  ) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }

  function box(
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    ry = 0
  ) {
    const mesh = add(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
    mesh.rotation.y = ry;
    return mesh;
  }

  function collider(
    x: number,
    y: number,
    z: number,
    hx: number,
    hy: number,
    hz: number
  ) {
    colliders.push({ x, y, z, hx, hy, hz });
  }

  function solid(
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    ry = 0
  ) {
    const mesh = box(w, h, d, mat, x, y, z, ry);
    const c = Math.abs(Math.cos(ry));
    const s = Math.abs(Math.sin(ry));
    collider(x, y, z, (w * c + d * s) / 2, h / 2, (w * s + d * c) / 2);
    return mesh;
  }

  return {
    group,
    add,
    box,
    solid,
    collider,
    cyl(topRadius, bottomRadius, height, segments, mat, x, y, z) {
      return add(
        new THREE.CylinderGeometry(topRadius, bottomRadius, height, segments),
        mat,
        x,
        y,
        z
      );
    },
    sphere(radius, mat, x, y, z) {
      return add(new THREE.SphereGeometry(radius, 14, 10), mat, x, y, z);
    },
  };
}