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
import { buildSalon } from '@/game/world/salon';
import { buildClimbingFlowers } from '@/game/world/vistas';

export type World = {
  root: THREE.Group;
  colliders: ColliderBox[];
  ocean: THREE.Object3D | null;
  mood: DreamhouseMood | null;
  bobbers: Bobber[];
  pulses: THREE.MeshStandardMaterial[];
  setHoverSpot(id: string | null): void;
  setMarkersVisible(visible: boolean): void;
  update(dt: number, effects: boolean): void;
};

// Batch only direct, static scenery. Animated beacons, floats and material pulses
// retain their object identity; collider data never depends on render geometry.
function batchScenery(group: THREE.Group, animated: Set<THREE.Object3D>, animatedMaterials: Set<THREE.Material>) {
  const equivalent = new Map<string, THREE.Material>();
  const cellSize=12;
  const batches = new Map<string, Array<{ material: THREE.Material; meshes: THREE.Mesh[]; cellX: number; cellZ: number; bounds: THREE.Box3 }>>();
  const bounds=new THREE.Box3(),size=new THREE.Vector3(),center=new THREE.Vector3();
  for (const object of [...group.children]) {
    if (!(object instanceof THREE.Mesh) || (object as THREE.InstancedMesh).isInstancedMesh || animated.has(object) || object.name || Array.isArray(object.material)) continue;
    object.updateMatrix();
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
    bounds.copy(object.geometry.boundingBox!).applyMatrix4(object.matrix);
    bounds.getSize(size);
    // Broad ground, routes and decks remain independent. A small occluder must
    // never share a hideable render mesh with a distant venue or a whole island.
    if (size.x > cellSize || size.z > cellSize) continue;
    bounds.getCenter(center);
    const cellX=Math.floor(center.x/cellSize),cellZ=Math.floor(center.z/cellSize);
    let material=object.material;
    // Reuse equivalent static surfaces across landmarks. Each palm and bench
    // used to retain a separate material and draw call despite matching colours.
    if (material instanceof THREE.MeshStandardMaterial && !animatedMaterials.has(material)) {
      const key=[material.type,material.color.getHex(),material.emissive.getHex(),material.emissiveIntensity,material.roughness,material.metalness,material.transparent,material.opacity,material.side,material.depthWrite,material.toneMapped,material.map?.uuid ?? ''].join(':');
      const existing=equivalent.get(key);
      if (existing) material=existing; else equivalent.set(key,material);
    }
    const key=`${cellX}:${cellZ}:${material.uuid}`;
    const clusters=batches.get(key) ?? [];
    let batch=clusters.find(candidate =>
      Math.max(candidate.bounds.max.x,bounds.max.x)-Math.min(candidate.bounds.min.x,bounds.min.x) <= cellSize &&
      Math.max(candidate.bounds.max.z,bounds.max.z)-Math.min(candidate.bounds.min.z,bounds.min.z) <= cellSize);
    if (!batch) {batch={material,meshes:[],cellX,cellZ,bounds:bounds.clone()};clusters.push(batch);}
    batch.meshes.push(object);
    batch.bounds.union(bounds);
    batches.set(key,clusters);
  }
  const obsolete = new Set<THREE.BufferGeometry>();
  for (const {material,meshes,cellX,cellZ} of [...batches.values()].flat()) {
    if (meshes.length < 2) continue;
    const transformed = meshes.map(mesh => {
      mesh.updateMatrix();
      return mesh.geometry.clone().applyMatrix4(mesh.matrix);
    });
    const merged = mergeGeometries(transformed, false);
    transformed.forEach(geometry => geometry.dispose());
    if (!merged) continue;
    merged.computeBoundingBox();
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, material);
    mesh.name=`scenery cell: ${cellX},${cellZ}`;
    mesh.userData.sceneryCell=[cellX,cellZ];
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
  buildSalon(builder);
  buildClimbingFlowers(builder);
  const stations = buildStations(builder);
  const ambience = createWorldAmbience();
  builder.group.add(ambience.root);
  const pointLights: THREE.PointLight[] = [];
  builder.group.traverse(object => {if (object instanceof THREE.PointLight) pointLights.push(object);});
  const tiles: THREE.MeshStandardMaterial[] = [];
  builder.group.traverse(object => {if(object.name === 'party tile' && object instanceof THREE.Mesh) tiles.push(object.material as THREE.MeshStandardMaterial);});
  let clock = 0;

  batchScenery(builder.group, new Set(stations.bobbers.map(bobber => bobber.obj)), new Set([...stations.pulses, mood.orbMat]));
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
    setMarkersVisible(visible) {
      for (const beacon of Object.values(stations.beacons)) beacon.group.visible=visible;
    },
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