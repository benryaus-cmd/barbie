const fs = require('node:fs'), assert = require('node:assert/strict');
const ts = require('typescript'), THREE = require('three');
function load(path) {
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(require, mod, mod.exports);
  return mod.exports;
}
const scene = new THREE.Group(), hip = new THREE.Bone(), knee = new THREE.Bone(), ankle = new THREE.Bone();
scene.add(hip); hip.add(knee); knee.position.y = -.425; knee.add(ankle); ankle.position.y = -.397;
const skin = new THREE.MeshStandardMaterial();
const limb = load('src/game/character/limb-rig.ts').createLimbSkin(hip, knee, skin, 'leg');
const skinMesh = hip.children.find(n => n.isSkinnedMesh), skinPositions = skinMesh.geometry.attributes.position;
// Reproduce the old radius failure against actual generated calf vertices.
let oldPenetrations = 0;
for (let i = 0; i < skinPositions.count; i++) {
  const y = skinPositions.getY(i) + .822;
  if (y > .08 && y < .25 && Math.hypot(skinPositions.getX(i), skinPositions.getZ(i)) > .044) oldPenetrations++;
}
assert(oldPenetrations > 30, 'fixture must reproduce skin outside the former .044 boot shaft');
assert(fs.existsSync('src/game/character/boot-rig.ts'), 'fitted articulated boot rig must exist');
const materials = { fabric: new THREE.MeshStandardMaterial({ color: 0xb898f0 }), trim: new THREE.MeshStandardMaterial({ color: 0xf6c35e }), lining: new THREE.MeshStandardMaterial({ color: 0xfffaf3 }) };
const originals = Object.values(materials).map(m => ({ material: m, side: m.side, color: m.color.getHex() }));
const rig = load('src/game/character/boot-rig.ts').createBootRig(knee, ankle, materials);
assert.equal(rig.root.parent, knee, 'boot root follows shin joint');
assert(rig.soleHeight > .08 && rig.soleHeight < .11, 'sole uses original foot clearance');
const meshes = []; rig.root.traverse(n => { if (n.isSkinnedMesh) meshes.push(n); });
assert(meshes.length >= 4, 'weighted shaft, sole, cuff and seam must exist');
const shell = meshes.find(m => m.name === 'boot fitted shell'); assert(shell, 'one continuous weighted shaft/foot shell');
assert.equal(new Set(meshes.map(m => m.skeleton)).size, 1, 'all boot parts share one disposable skeleton');
let mixed = 0;
for (const mesh of meshes) {
  const p = mesh.geometry.attributes.position, n = mesh.geometry.attributes.normal, w = mesh.geometry.attributes.skinWeight;
  assert.equal(p.count, w.count);
  for (let i = 0; i < p.count; i++) {
    assert([p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i)].every(Number.isFinite));
    assert(Math.abs(w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i) - 1) < 1e-6);
    if (w.getX(i) > 0 && w.getY(i) > 0) mixed++;
  }
}
assert(mixed > 60, 'actual ankle shell and seam have smooth intermediate skinning weights');
// Weld the duplicate UV seam and ignore collapsed cap triangles: only the cuff
// aperture may be a boundary. There must be no hole between shaft and vamp.
const shellGeo = shell.geometry, edgeUses = new Map();
const vertexKey = i => [shellGeo.attributes.position.getX(i), shellGeo.attributes.position.getY(i), shellGeo.attributes.position.getZ(i)].map(v => Math.round(v * 1e6)).join(',');
for (let i = 0; i < shellGeo.index.count; i += 3) {
  const ids = [0, 1, 2].map(j => shellGeo.index.getX(i + j)), keys = ids.map(vertexKey);
  if (new Set(keys).size < 3) continue;
  for (let e = 0; e < 3; e++) {
    const key = [keys[e], keys[(e + 1) % 3]].sort().join('|');
    const edge = edgeUses.get(key) || { count: 0, ids: [ids[e], ids[(e + 1) % 3]] }; edge.count++; edgeUses.set(key, edge);
  }
}
let openingEdges = 0;
for (const edge of edgeUses.values()) if (edge.count !== 2) {
  assert.equal(edge.count, 1, 'shell has no nonmanifold intersections');
  for (const i of edge.ids) assert(Math.abs(shellGeo.attributes.position.getY(i) - (ankle.position.y + .25)) < 1e-6, 'only top cuff aperture may be open');
  openingEdges++;
}
assert.equal(openingEdges, 32, 'continuous shaft/ankle/foot has exactly one cuff opening');
function update() { limb.update(); rig.update(); scene.updateMatrixWorld(true); for (const m of meshes) m.skeleton.update(); }
function worldVertex(mesh, index) { return mesh.localToWorld(mesh.getVertexPosition(index, new THREE.Vector3())); }
function localVertex(mesh, index) { return knee.worldToLocal(worldVertex(mesh, index)); }
const shellPositions = shell.geometry.attributes.position;
let cuff = 0, toe = 0;
for (let i = 0; i < shellPositions.count; i++) {
  if (shellPositions.getY(i) > shellPositions.getY(cuff)) cuff = i;
  if (shellPositions.getZ(i) > shellPositions.getZ(toe)) toe = i;
}
update(); const restCuff = localVertex(shell, cuff), restToe = worldVertex(shell, toe);
const ray = new THREE.Raycaster(); let fitSamples = 0;
for (const [label, hipAngle, kneeAngle, ankleAngle] of [['stance', 0, 0, 0], ['walk', -.38, .5, .22], ['heel roll', 0, .25, -.35], ['toe roll', 0, .25, .35], ['sit', -1.3, 1.4, .18]]) {
  hip.rotation.x = hipAngle; knee.rotation.x = kneeAngle; ankle.rotation.x = ankleAngle; update();
  shell.computeBoundingSphere(); skinMesh.computeBoundingSphere();
  const cuffMesh = meshes.find(m => m.name === 'boot gold rolled cuff'); cuffMesh.computeBoundingSphere();
  const skinSide = skin.side; skin.side = THREE.DoubleSide;
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2;
    const origin = knee.localToWorld(new THREE.Vector3(0, ankle.position.y + .247, 0));
    const direction = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)).transformDirection(knee.matrixWorld);
    ray.set(origin, direction);
    const calfHit = ray.intersectObject(skinMesh, false)[0], cuffHit = ray.intersectObject(cuffMesh, false)[0];
    assert(calfHit && cuffHit, `${label}: actual calf and annular cuff both intersect`);
    const clearance = cuffHit.distance - calfHit.distance;
    assert(clearance > .0015 && clearance < .010, `${label}: cuff opening clears actual calf by ${clearance}`);
  }
  skin.side = skinSide;
  for (let i = 0; i < skinPositions.count; i++) {
    const restY = skinPositions.getY(i) + .822;
    if (restY < .007 || restY > .245) continue;
    const origin = worldVertex(skinMesh, i);
    const local = knee.worldToLocal(origin.clone());
    const direction = new THREE.Vector3(local.x, 0, local.z).normalize().transformDirection(knee.matrixWorld);
    ray.set(origin, direction);
    const hit = ray.intersectObject(shell, false)[0];
    assert(hit, `${label}: actual calf vertex ${i} must be enclosed by shaft`);
    assert(hit.distance > .001 && hit.distance < .023, `${label}: fitted skin clearance ${hit.distance}`);
    fitSamples++;
  }
  assert(localVertex(shell, cuff).distanceTo(restCuff) < 1e-6, `${label}: cuff stays with shin when ankle moves`);
  for (const mesh of meshes) for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
    const v = worldVertex(mesh, i); assert([v.x, v.y, v.z].every(Number.isFinite));
  }
}
hip.rotation.set(0, 0, 0); knee.rotation.set(0, 0, 0); ankle.rotation.x = .35; update();
const expectedToe = restToe.clone().applyMatrix4(new THREE.Matrix4().makeTranslation(0, .822, 0)).applyAxisAngle(new THREE.Vector3(1, 0, 0), .35).add(new THREE.Vector3(0, -.822, 0));
assert(worldVertex(shell, toe).distanceTo(expectedToe) < 1e-6, 'toe fully follows ankle rotation');
assert(worldVertex(shell, toe).distanceTo(restToe) > .04, 'foot visibly articulates independently of cuff');
ankle.rotation.x = 0; update(); assert(worldVertex(shell, toe).distanceTo(restToe) < 1e-6, 'boot returns exactly to rest');
for (const { material, side, color } of originals) { assert.equal(material.side, side); assert.equal(material.color.getHex(), color); }
console.log(`PASS: old shaft exposes ${oldPenetrations} actual calf vertices; fitted weighted boots enclose ${fitSamples} posed skin samples with independent cuff/toe motion`);
