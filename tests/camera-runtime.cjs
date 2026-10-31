const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
const THREE = require('three');
const mod = {exports: {}};
const code = ts.transpileModule(fs.readFileSync('src/game/camera.ts', 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText;
new Function('require', 'module', 'exports', code)(require, mod, mod.exports);
const {createCameraRig} = mod.exports;
const frame = 1 / 60;
function setup(blockers = []) {
  const camera = new THREE.PerspectiveCamera(58, .6, .1, 900);
  const rig = createCameraRig(camera, 6.8, blockers);
  const target = new THREE.Vector3();
  rig.update(frame, target, false, false);
  return {camera, rig, target};
}
function walk(state, seconds, heading = Math.PI / 2, speed = 5.4, allowFollow = true) {
  state.rig.setWalkHeading(heading, speed, allowFollow);
  for (let i = 0; i < Math.round(seconds / frame); i++) {
    state.target.x += Math.sin(heading) * speed * frame;
    state.target.z += Math.cos(heading) * speed * frame;
    state.rig.update(frame, state.target, false, false);
  }
}
let state = setup();
walk(state, .55);
assert.equal(state.rig.getYaw(), 0, 'a short walking gesture does not recenter');
walk(state, .2);
assert(state.rig.getYaw() < 0, 'sustained walking starts to recenter');
assert(Math.abs(state.rig.getYaw()) < .15, 'follow eases in with a capped turn rate');
walk(state, 5);
const yawError = Math.atan2(Math.sin(state.rig.getYaw() + Math.PI / 2), Math.cos(state.rig.getYaw() + Math.PI / 2));
assert(Math.abs(yawError) <= .21, 'follow settles inside its angular deadzone');
state = setup();
walk(state, 3, Math.PI + .1);
assert.equal(state.rig.getYaw(), 0, 'small heading changes stay inside the angular deadzone');
state = setup();
walk(state, 1, Math.PI / 2, .7);
assert.equal(state.rig.getYaw(), 0, 'walking delay alone is insufficient before one metre of travel');
walk(state, .6, Math.PI / 2, .7);
assert(state.rig.getYaw() < 0, 'one metre of slow sustained travel activates follow');
state = setup();
walk(state, 3, Math.PI / 2, .5);
assert.equal(state.rig.getYaw(), 0, 'small movement stays below follow speed deadzone');
walk(state, 3, 0, 5.4, false);
assert.equal(state.rig.getYaw(), 0, 'walking toward camera or sideways can explicitly suppress follow');
state.rig.setWalkHeading(Math.PI / 2);
for (let i = 0; i < 240; i++) state.rig.update(frame, state.target, false, false);
assert.equal(state.rig.getYaw(), 0, 'blocked or stationary input does not count as walking');
state = setup();
walk(state, .4);
walk(state, .3, Math.PI);
assert.equal(state.rig.getYaw(), 0, 'a sudden turn restarts the sustained walking delay');
state.rig.rotate(60, 0);
const manualYaw = state.rig.getYaw();
walk(state, 2.4);
assert.equal(state.rig.getYaw(), manualYaw, 'manual orbit gets two seconds of hold plus walking delay');
walk(state, .4);
assert.notEqual(state.rig.getYaw(), manualYaw, 'walking follow resumes after manual hold and delay');
state.rig.setWalkHeading(null);
const stoppedYaw = state.rig.getYaw();
for (let i = 0; i < 120; i++) state.rig.update(frame, state.target, false, false);
assert.equal(state.rig.getYaw(), stoppedYaw, 'stopping keeps the selected camera angle');
state.rig.rotate(NaN, 0);
assert.equal(state.rig.getYaw(), stoppedYaw, 'invalid orbit input is ignored');
state = setup();
state.rig.setPresentation('photo');
state.rig.update(frame, state.target, false, false);
const initial = state.camera.position.clone();
const photoFocus = new THREE.Vector3(0, .25, 0);
state.rig.rotate(850, 90);
state.rig.update(frame, state.target, false, false);
assert(state.camera.position.z < 0, 'photo orbit can reach the back of the avatar');
assert(state.camera.position.y > initial.y + .5, 'photo drag changes vertical viewing angle');
const distance = state.camera.position.distanceTo(photoFocus);
state.rig.zoom(-250);
state.rig.update(frame, state.target, false, false);
assert(state.camera.position.distanceTo(photoFocus) < distance, 'negative photo zoom moves closer');
state.rig.zoom(-1e6);
state.rig.update(frame, state.target, false, false);
assert(state.camera.position.distanceTo(photoFocus) > 2, 'photo zoom is bounded');
state.rig.zoom(NaN);
state.rig.reset();
assert.equal(state.rig.getYaw(), 0, 'reset restores world heading');
state.rig.setPresentation('photo');
state.rig.update(frame, state.target, false, false);
assert(state.camera.position.distanceTo(initial) < 1e-6, 'reset restores photo orbit, angle and zoom');
console.log('PASS camera follow delay/distance/deadzones, turning/manual hold, actual travel, full photo orbit, vertical angle, zoom and reset');

for (const mode of ['photo', 'style']) {
  state = setup();
  const heading = Math.PI / 2;
  state.rig.setPresentation(mode, heading);
  state.rig.update(frame, state.target, false, false);
  assert(state.camera.position.x > 4 && Math.abs(state.camera.position.z) < .001, `${mode} opens in front of the actual heading`);
  const start = state.camera.position.clone();
  state.rig.rotate(850, 90);
  state.rig.update(frame, state.target, false, false);
  assert(state.camera.position.x < 0, `${mode} supports a complete horizontal orbit`);
  assert(state.camera.position.y > start.y + .5, `${mode} supports vertical orbit`);
  const beforeZoom = state.camera.position.distanceTo(photoFocus);
  state.rig.zoom(-250);
  state.rig.update(frame, state.target, false, false);
  assert(state.camera.position.distanceTo(photoFocus) < beforeZoom, `${mode} supports zoom`);
  const selected = state.camera.position.clone();
  state.rig.setPresentation(mode, 0);
  state.rig.update(frame, state.target, false, false);
  assert(state.camera.position.distanceTo(selected) < .001, 'repeated presentation state does not reset its orbit');
}
// A thin decorated wall is shorter than the previous blocker filter. Its near
// face is .95m from the doll, inside the previous forced 1.35m camera distance.
const wardrobeWall = {x: 0, y: 1, z: -.98, hx: 4, hy: .7, hz: .03};
for (const mode of ['photo', 'style', 'world']) {
  state = setup([wardrobeWall]);
  if (mode === 'world') state.rig.rotate(Math.PI / .006, 0);
  else state.rig.setPresentation(mode, Math.PI);
  state.rig.update(frame, state.target, false, true);
  assert(state.camera.position.z > -.73, `${mode} stays in front of a nearby thin wardrobe wall`);
  if (mode !== 'world') {
    state.camera.updateMatrixWorld(true);
    const head = new THREE.Vector3(0, 1.85, 0).project(state.camera);
    assert(head.y > -1 && head.y < 1, `${mode} keeps the head visible when a wall compresses the camera`);
  }
}
console.log('PASS heading-relative photo/style orbit, zoom and thin indoor wall clearance');

state = setup([wardrobeWall]);
state.rig.setPresentation('style', Math.PI);
state.rig.update(frame, state.target, false, true, true);
assert(state.camera.position.z < -4, 'an explicitly cutaway presentation keeps full-body camera distance');
state.rig.zoom(-1e6);
state.rig.update(frame, state.target, false, true, true);
assert(state.camera.position.z < -2, 'cutaway still keeps the selected zoom near a wall');
