import * as THREE from 'three';

type Materials = { fabric: THREE.MeshStandardMaterial; trim: THREE.MeshStandardMaterial; lining: THREE.MeshStandardMaterial };
type Section = { y: number; x: number; z: number; center?: number };

/** A fitted calf sleeve and foot share vertices across a softly weighted ankle. */
export function createBootRig(knee: THREE.Object3D, ankle: THREE.Object3D, materials: Materials): {
  root: THREE.Group; update(): void; soleHeight: number;
} {
  const root = new THREE.Group();
  root.name = 'boots'; knee.add(root);
  const shin = new THREE.Bone(), foot = new THREE.Bone();
  shin.name = 'boot.shin'; foot.name = 'boot.ankle';
  foot.position.copy(ankle.position); shin.add(foot); root.add(shin);
  const ankleY = ankle.position.y, radialSegments = 32;
  const skeleton = new THREE.Skeleton([shin, foot]);
  // The sleeve is visible inside its open cuff. Never change a wardrobe material.
  const fabric = materials.fabric.clone(); fabric.side = THREE.DoubleSide;
  const lining = materials.lining.clone(); lining.side = THREE.DoubleSide;
  const meshes: THREE.SkinnedMesh[] = [];
  const footWeight = (y: number) => 1 - THREE.MathUtils.smoothstep(y - ankleY, -.025, .040);

  function weighted(geometry: THREE.BufferGeometry, name: string, material: THREE.MeshStandardMaterial, rigid?: 0 | 1) {
    const p = geometry.getAttribute('position'), indices: number[] = [], weights: number[] = [];
    for (let i = 0; i < p.count; i++) {
      const weight = rigid === undefined ? footWeight(p.getY(i)) : rigid;
      indices.push(0, 1, 0, 0); weights.push(1 - weight, weight, 0, 0);
    }
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
    const mesh = new THREE.SkinnedMesh(geometry, material);
    mesh.name = name; mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
    root.add(mesh); meshes.push(mesh); return mesh;
  }

  function loft(sections: Section[]) {
    const positions: number[] = [], indices: number[] = [];
    for (const section of sections) for (let j = 0; j <= radialSegments; j++) {
      const a = j / radialSegments * Math.PI * 2;
      positions.push(Math.sin(a) * section.x, ankleY + section.y, Math.cos(a) * section.z + (section.center ?? 0));
    }
    for (let i = 0; i < sections.length - 1; i++) for (let j = 0; j < radialSegments; j++) {
      const a = i * (radialSegments + 1) + j, b = a + 1, c = a + radialSegments + 1, d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices);
    geometry.computeVertexNormals(); return geometry;
  }

  // Match the real continuous leg profile, including its fuller upper calf.
  // Values are ankle-relative; skin depth is .87 of its horizontal radius.
  const calf: Array<[number, number]> = [[0, 0], [.007, .032], [.072, .037], [.172, .050], [.282, .061]];
  function calfRadius(y: number) {
    for (let i = 1; i < calf.length; i++) if (y <= calf[i][0]) {
      const a = calf[i - 1], b = calf[i];
      return THREE.MathUtils.lerp(a[1], b[1], (y - a[0]) / (b[0] - a[0]));
    }
    return calf[calf.length - 1][1];
  }
  const sections: Section[] = [
    { y: -.082, x: 0, z: 0, center: .045 },
    { y: -.082, x: .050, z: .100, center: .045 },
    { y: -.065, x: .055, z: .108, center: .045 },
    { y: -.045, x: .058, z: .113, center: .045 },
    { y: -.025, x: .053, z: .099, center: .041 },
    { y: -.010, x: .046, z: .073, center: .025 },
    { y: 0, x: .043, z: .055, center: .012 },
    { y: .015, x: .0415, z: .042, center: .003 },
    { y: .030, x: .0415, z: .038 },
    { y: .045, x: .0415, z: .0365 },
  ];
  for (let i = 0; i <= 16; i++) {
    const y = .055 + (.25 - .055) * i / 16, radius = calfRadius(y);
    sections.push({ y, x: radius + .007, z: radius * .87 + .0065 });
  }
  weighted(loft(sections), 'boot fitted shell', fabric);

  // A closed annular rim has a genuine calf opening and an ivory inner return.
  const cuffRadius = calfRadius(.25), outerX = cuffRadius + .010, outerZ = cuffRadius * .87 + .009;
  weighted(loft([
    { y: .241, x: outerX, z: outerZ }, { y: .252, x: outerX, z: outerZ },
    { y: .252, x: cuffRadius + .0035, z: cuffRadius * .87 + .0035 },
    { y: .241, x: cuffRadius + .0035, z: cuffRadius * .87 + .0035 },
    { y: .241, x: outerX, z: outerZ },
  ]), 'boot gold rolled cuff', materials.trim, 0);
  weighted(loft([
    { y: .231, x: cuffRadius + .004, z: cuffRadius * .87 + .004 },
    { y: .250, x: cuffRadius + .004, z: cuffRadius * .87 + .004 },
  ]), 'boot ivory cuff lining', lining, 0);

  // Welt and outsole use the same foot influence, so foot roll cannot peel them off.
  weighted(loft([
    { y: -.094, x: 0, z: 0, center: .045 },
    { y: -.094, x: .048, z: .099, center: .045 },
    { y: -.087, x: .057, z: .111, center: .045 },
    { y: -.077, x: .057, z: .111, center: .045 },
    { y: -.074, x: .053, z: .106, center: .045 },
    { y: -.074, x: 0, z: 0, center: .045 },
  ]), 'boot sculpted ivory sole', materials.lining, 1);
  weighted(loft([
    { y: -.078, x: .0565, z: .1105, center: .045 },
    { y: -.073, x: .0575, z: .1115, center: .045 },
  ]), 'boot gold welt', materials.trim, 1);
  const heel = new THREE.BoxGeometry(.049, .028, .043);
  heel.translate(0, ankleY - .079, -.025);
  weighted(heel, 'boot gold heel', materials.trim, 1);

  const seamPoints = sections.filter(s => s.y >= 0).map(s => new THREE.Vector3(0, ankleY + s.y, (s.center ?? 0) + s.z + .0017));
  seamPoints.unshift(new THREE.Vector3(0, ankleY - .024, .142));
  weighted(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(seamPoints), 36, .0022, 6, false), 'boot ivory front seam', materials.lining);
  knee.updateWorldMatrix(true, true);
  skeleton.calculateInverses();
  for (const mesh of meshes) mesh.bind(skeleton);
  return {
    root, soleHeight: .094,
    update() {
      foot.position.copy(ankle.position); foot.quaternion.copy(ankle.quaternion); foot.scale.copy(ankle.scale);
      root.updateWorldMatrix(true, true);
    },
  };
}
