import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createBuilder } from '@/game/builder';
import type { ColliderBox } from '@/game/types';
import { buildAvenue } from '@/game/world/avenue';
import { buildBeach } from '@/game/world/beach';
import { buildDreamhouse, type DreamhouseMood } from '@/game/world/dreamhouse';
import { buildStations, type Bobber } from '@/game/world/stations';
import { createWorldAmbience } from '@/game/world/ambience';
import { buildTerrain } from '@/game/world/terrain';

export type World = {
  root: THREE.Group;
  colliders: ColliderBox[];
  ocean: THREE.Object3D | null;
  mood: DreamhouseMood | null;
  bobbers: Bobber[];
  pulses: THREE.MeshStandardMaterial[];
  setHoverSpot(id: string | null): void;
  update(dt: number, effects: boolean): void;
};

// Batch only direct, static scenery. Animated beacons, floats and material pulses
// retain their object identity; collider data never depends on render geometry.
function batchScenery(group: THREE.Group, animated: Set<THREE.Object3D>) {
  const batches = new Map<THREE.Material, THREE.Mesh[]>();
  for (const object of [...group.children]) {
    if (!(object instanceof THREE.Mesh) || (object as THREE.InstancedMesh).isInstancedMesh || animated.has(object) || object.name || Array.isArray(object.material)) continue;
    const meshes = batches.get(object.material) ?? [];
    meshes.push(object);
    batches.set(object.material, meshes);
  }
  const obsolete = new Set<THREE.BufferGeometry>();
  for (const [material, meshes] of batches) {
    if (meshes.length < 2) continue;
    const transformed = meshes.map(mesh => {
      mesh.updateMatrix();
      return mesh.geometry.clone().applyMatrix4(mesh.matrix);
    });
    const merged = mergeGeometries(transformed, false);
    transformed.forEach(geometry => geometry.dispose());
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, material);
    mesh.receiveShadow = true;
    group.add(mesh);
    for (const source of meshes) {
      obsolete.add(source.geometry);
      group.remove(source);
    }
  }
  obsolete.forEach(geometry => geometry.dispose());
}

export function buildWorld(): World {
  const colliders: ColliderBox[] = [];
  const builder = createBuilder(colliders);

  buildTerrain(builder);
  const mood = buildDreamhouse(builder);
  buildAvenue(builder);
  buildBeach(builder);
  const stations = buildStations(builder);
  const ambience = createWorldAmbience();
  builder.group.add(ambience.root);
  const pointLights: THREE.PointLight[] = [];
  builder.group.traverse(object => {if (object instanceof THREE.PointLight) pointLights.push(object);});
  const tiles: THREE.MeshStandardMaterial[] = [];
  builder.group.traverse(object => {if(object.name === 'party tile' && object instanceof THREE.Mesh) tiles.push(object.material as THREE.MeshStandardMaterial);});
  let clock = 0;

  batchScenery(builder.group, new Set(stations.bobbers.map(bobber => bobber.obj)));
  builder.group.traverse(object => {
    if ((object as THREE.Mesh).isMesh) object.receiveShadow = true;
  });

  return {
    root: builder.group,
    colliders,
    ocean: builder.group.getObjectByName('ocean') ?? null,
    mood,
    bobbers: stations.bobbers,
    pulses: stations.pulses,
    setHoverSpot: id => stations.setActiveSpot(id),
    update(dt, effects) {
      clock += dt;
      ambience.update(dt, effects);
      pointLights.forEach(light => {light.visible = effects;});
      tiles.forEach((material, index) => {
        material.color.setHSL((clock * .09 + index * .14) % 1, .8, .59);
        material.emissive.copy(material.color);
        material.emissiveIntensity = .65 + (Math.sin(clock * 3.8 + index * 1.6) * .5 + .5) * 1.1;
      });
    },
  };
}