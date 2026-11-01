import * as THREE from 'three';
import type { ColliderBox } from '@/game/types';

export type PresentationMode = 'world' | 'style' | 'dance' | 'photo' | 'pet';

export type CameraRig = {
  setPresentation(mode: PresentationMode, facing?: number): void;
  rotate(dx: number, dy: number): void;
  getYaw(): number;
  setWalkHeading(heading: number | null, speed?: number, allowFollow?: boolean): void;
  /** Positive wheel/pinch delta zooms out; negative delta zooms in. */
  zoom(delta: number): void;
  pan(dx:number,dy:number):void;
  resetPhotoFraming():void;
  /** cutaway is only used when the renderer removes presentation occluders. */
  update(dt: number, target: THREE.Vector3, zoomOut: boolean, indoor: boolean, cutaway?: boolean): void;
  reset(): void;
};

const MIN_PITCH = 0.08;
const MAX_PITCH = 1.05;
const CAMERA_RADIUS = 0.22;
const CAMERA_CLEARANCE = 0.12;
const WALK_FOLLOW_DELAY = 0.6;
const WALK_FOLLOW_DISTANCE = 1;
const WALK_FOLLOW_DEADZONE = 0.2;
const WALK_FOLLOW_MIN_SPEED = 0.65;

export function createCameraRig(
  camera: THREE.PerspectiveCamera,
  distance = 6.8,
  blockers: ColliderBox[] = []
): CameraRig {
  let yaw = 0;
  let walkHeading: number | null = null;
  let manualHold = 0;
  let walkSpeed = 0;
  let followAllowed = true;
  let walkTime = 0;
  let walkDistance = 0;
  let previousHeading: number | null = null;
  let hasPreviousTarget = false;
  let pitch = 0.3;
  let presentation: PresentationMode = 'world';
  let presentationYaw = 0;
  let photoPitch = 0.26;
  let photoZoom = 1;
  let currentDistance = distance;
  let started = false;

  const current = new THREE.Vector3(0, 4, 20);
  const desired = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  const photoPan=new THREE.Vector2(),panOffset=new THREE.Vector3();
  let presentationBaseYaw=0;
  const rayDirection = new THREE.Vector3();
  const previousTarget = new THREE.Vector3();

  function clearFollowProgress() {
    walkTime = 0;
    walkDistance = 0;
    previousHeading = null;
  }

  function keepCameraClear(candidate: THREE.Vector3) {
    rayDirection.copy(candidate).sub(lookAt);
    const rayLength = rayDirection.length();
    if (rayLength < 0.001) return;
    rayDirection.divideScalar(rayLength);
    let allowedDistance = rayLength;

    for (const box of blockers) {
      const minX = box.x - box.hx - CAMERA_RADIUS;
      const maxX = box.x + box.hx + CAMERA_RADIUS;
      const minY = box.y - box.hy - CAMERA_RADIUS;
      const maxY = box.y + box.hy + CAMERA_RADIUS;
      const minZ = box.z - box.hz - CAMERA_RADIUS;
      const maxZ = box.z + box.hz + CAMERA_RADIUS;
      let enter = 0;
      let exit = allowedDistance;
      let valid = true;

      if (Math.abs(rayDirection.x) < 0.0001) {
        if (lookAt.x < minX || lookAt.x > maxX) valid = false;
      } else {
        let near = (minX - lookAt.x) / rayDirection.x;
        let far = (maxX - lookAt.x) / rayDirection.x;
        if (near > far) [near, far] = [far, near];
        enter = Math.max(enter, near);
        exit = Math.min(exit, far);
      }
      if (valid && Math.abs(rayDirection.y) < 0.0001) {
        if (lookAt.y < minY || lookAt.y > maxY) valid = false;
      } else if (valid) {
        let near = (minY - lookAt.y) / rayDirection.y;
        let far = (maxY - lookAt.y) / rayDirection.y;
        if (near > far) [near, far] = [far, near];
        enter = Math.max(enter, near);
        exit = Math.min(exit, far);
      }
      if (valid && Math.abs(rayDirection.z) < 0.0001) {
        if (lookAt.z < minZ || lookAt.z > maxZ) valid = false;
      } else if (valid) {
        let near = (minZ - lookAt.z) / rayDirection.z;
        let far = (maxZ - lookAt.z) / rayDirection.z;
        if (near > far) [near, far] = [far, near];
        enter = Math.max(enter, near);
        exit = Math.min(exit, far);
      }

      if (valid && exit >= enter && enter > 0 && enter < allowedDistance) {
        // Never enforce a minimum that can put the lens beyond a nearby wall.
        allowedDistance = Math.max(0, enter - CAMERA_CLEARANCE);
      }
    }

    if (allowedDistance < rayLength) {
      candidate.copy(lookAt).addScaledVector(rayDirection, allowedDistance);
    }
  }

  return {
    setPresentation(mode, facing = 0) {
      if (presentation === mode) return;
      presentation = mode;
      presentationYaw = Number.isFinite(facing) ? facing : 0;
      presentationBaseYaw=presentationYaw;photoPan.set(0,0);
      photoPitch = 0.26;
      photoZoom = 1;
      clearFollowProgress();
      hasPreviousTarget = false;
      started = false;
    },
    rotate(dx: number, dy: number) {
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
      if (presentation === 'photo' || presentation === 'style') {
        presentationYaw -= dx * 0.004;
        photoPitch = THREE.MathUtils.clamp(photoPitch + dy * 0.004, -0.15, 1.05);
        return;
      }
      if (presentation !== 'world') {
        presentationYaw = THREE.MathUtils.clamp(presentationYaw - dx * 0.004, -0.62, 0.62);
        return;
      }
      manualHold = 2;
      clearFollowProgress();
      yaw -= dx * 0.006;
      pitch = THREE.MathUtils.clamp(pitch + dy * 0.004, MIN_PITCH, MAX_PITCH);
    },
    setWalkHeading(heading, speed = 5.4, allowFollow = true) {
      walkHeading = heading !== null && Number.isFinite(heading) ? heading : null;
      walkSpeed = Number.isFinite(speed) ? Math.max(0, speed) : 0;
      followAllowed = allowFollow;
      if (walkHeading === null || !followAllowed || walkSpeed < WALK_FOLLOW_MIN_SPEED) clearFollowProgress();
    },
    zoom(delta) {
      if (!Number.isFinite(delta) || (presentation !== 'photo' && presentation !== 'style')) return;
      photoZoom = THREE.MathUtils.clamp(photoZoom * Math.exp(delta * 0.0015), 0.58, 1.9);
    },
    pan(dx,dy){
      if(presentation!=='photo'||!Number.isFinite(dx)||!Number.isFinite(dy))return;
      photoPan.x=THREE.MathUtils.clamp(photoPan.x-dx*.0035*photoZoom,-1.1,1.1);
      photoPan.y=THREE.MathUtils.clamp(photoPan.y+dy*.0035*photoZoom,-1,1);
    },
    resetPhotoFraming(){photoPan.set(0,0);photoZoom=1;photoPitch=.26;presentationYaw=presentationBaseYaw;},
    getYaw() {
      return yaw;
    },
    update(dt: number, target: THREE.Vector3, zoomOut: boolean, indoor: boolean, cutaway = false) {
      if (presentation !== 'world') {
        // Feet-relative framing reserves the lower 40% for wardrobe and DJ controls.
        // Presentation orbit starts in front of the captured doll heading. It
        // remains independent of both the doll and the exploration camera.
        const companion = presentation === 'pet' || presentation === 'photo';
        const dist = companion ? (camera.aspect < 1 ? 4.7 : 4.3) : camera.aspect < 1 ? 4.25 : 4.4;
        lookAt.set(target.x, target.y + (presentation === 'pet' ? 0 : .25), target.z);
        if (presentation === 'photo' || presentation === 'style') {
          const radius = dist * photoZoom;
          desired.set(
            target.x + Math.sin(presentationYaw) * radius * Math.cos(photoPitch),
            lookAt.y + Math.sin(photoPitch) * radius,
            target.z + Math.cos(presentationYaw) * radius * Math.cos(photoPitch)
          );
        } else {
          desired.set(target.x + Math.sin(presentationYaw) * dist, target.y + 1.4, target.z + Math.cos(presentationYaw) * dist);
        }
        if(presentation==='photo'){
          panOffset.set(Math.cos(presentationYaw)*photoPan.x-Math.sin(presentationYaw)*Math.sin(photoPitch)*photoPan.y,Math.cos(photoPitch)*photoPan.y,-Math.sin(presentationYaw)*photoPan.x-Math.cos(presentationYaw)*Math.sin(photoPitch)*photoPan.y);
          desired.add(panOffset);lookAt.add(panOffset);
        }
        if (!cutaway) keepCameraClear(desired);
        const clearDistance = desired.distanceTo(lookAt);
        if (!cutaway && clearDistance < 2.8) {
          // A close indoor wall may require a portrait crop. Lift the focus
          // toward the face rather than leaving the head above the viewport.
          const closeFocus = THREE.MathUtils.lerp(1.7, .25, THREE.MathUtils.clamp((clearDistance - .45) / 2.35, 0, 1));
          const lift = target.y + closeFocus - lookAt.y;
          lookAt.y += lift;
          desired.y += lift;
          keepCameraClear(desired);
        }
        current.copy(desired);
        camera.position.copy(current);
        camera.lookAt(lookAt);
        started = true;
        return;
      }
      // Follow only after real, sustained travel. Small taps, blocked walking,
      // lateral/backward input, and manual orbit all leave the view in place.
      const elapsed = Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, 0.1) : 0;
      manualHold = Math.max(0, manualHold - elapsed);
      const travelled = hasPreviousTarget ? Math.hypot(target.x - previousTarget.x, target.z - previousTarget.z) : 0;
      previousTarget.copy(target);
      hasPreviousTarget = true;
      if (walkHeading !== null && followAllowed && walkSpeed >= WALK_FOLLOW_MIN_SPEED && manualHold === 0 && travelled > 0.0001) {
        const turn = previousHeading === null ? 0 : Math.atan2(Math.sin(walkHeading - previousHeading), Math.cos(walkHeading - previousHeading));
        if (Math.abs(turn) > 0.6) clearFollowProgress();
        previousHeading = walkHeading;
        walkTime += elapsed;
        // Ignore teleports and target offsets when measuring walking distance.
        walkDistance += Math.min(travelled, walkSpeed * elapsed * 1.5);
        if (walkTime >= WALK_FOLLOW_DELAY && walkDistance >= WALK_FOLLOW_DISTANCE) {
          const wantedYaw = walkHeading + Math.PI;
          const difference = Math.atan2(Math.sin(wantedYaw - yaw), Math.cos(wantedYaw - yaw));
          if (Math.abs(difference) > WALK_FOLLOW_DEADZONE) {
            const turnStep = difference * (1 - Math.exp(-elapsed * 1.65));
            yaw += THREE.MathUtils.clamp(turnStep, -elapsed * 0.8, elapsed * 0.8);
          }
        }
      } else {
        clearFollowProgress();
      }
      const wanted = (indoor ? 3.8 : distance) * (zoomOut ? 1.5 : 1);
      currentDistance += (wanted - currentDistance) * Math.min(1, dt * 5);
      const dist = currentDistance;
      const effectivePitch = indoor ? Math.max(pitch, 0.28) : pitch;
      const cosPitch = Math.cos(effectivePitch);
      offset.set(
        Math.sin(yaw) * dist * cosPitch,
        Math.sin(effectivePitch) * dist + (indoor ? 1.5 : 1.35),
        Math.cos(yaw) * dist * cosPitch
      );
      desired.copy(target).add(offset);
      if (desired.y < 1) desired.y = 1;
      lookAt.set(target.x, target.y + 1.0, target.z);
      keepCameraClear(desired);

      if (!started) {
        current.copy(desired);
        started = true;
      } else {
        current.lerp(desired, Math.min(1, dt * 9));
      }
      keepCameraClear(current);
      camera.position.copy(current);
      camera.lookAt(lookAt);
    },
    reset() {
      yaw = 0;
      walkHeading = null;
      manualHold = 0;
      walkSpeed = 0;
      followAllowed = true;
      clearFollowProgress();
      hasPreviousTarget = false;
      pitch = 0.3;
      presentation = 'world';
      presentationYaw = 0;photoPan.set(0,0);presentationBaseYaw=0;
      photoPitch = 0.26;
      photoZoom = 1;
      currentDistance = distance;
      started = false;
    },
  };
}
