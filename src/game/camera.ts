import * as THREE from 'three';
import type { ColliderBox } from '@/game/types';

export type PresentationMode = 'world' | 'style' | 'dance' | 'photo' | 'pet';

export type CameraRig = {
  setPresentation(mode: PresentationMode): void;
  rotate(dx: number, dy: number): void;
  getYaw(): number;
  setWalkHeading(heading: number | null): void;
  update(dt: number, target: THREE.Vector3, zoomOut: boolean, indoor: boolean): void;
  reset(): void;
};

const MIN_PITCH = 0.08;
const MAX_PITCH = 1.05;
const CAMERA_RADIUS = 0.22;
const CAMERA_CLEARANCE = 0.38;
const MIN_CAMERA_DISTANCE = 1.35;

export function createCameraRig(
  camera: THREE.PerspectiveCamera,
  distance = 6.8,
  blockers: ColliderBox[] = []
): CameraRig {
  const wallBlockers = blockers.filter(
    b => b.hy >= 0.75 && (b.hx >= 0.75 || b.hz >= 0.75)
  );
  let yaw = 0;
  let walkHeading: number | null = null;
  let manualHold = 0;
  let pitch = 0.3;
  let presentation: PresentationMode = 'world';
  let presentationYaw = 0;
  let currentDistance = distance;
  let started = false;

  const current = new THREE.Vector3(0, 4, 20);
  const desired = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  const rayDirection = new THREE.Vector3();

  function keepCameraClear(candidate: THREE.Vector3) {
    rayDirection.copy(candidate).sub(lookAt);
    const rayLength = rayDirection.length();
    if (rayLength < 0.001) return;
    rayDirection.divideScalar(rayLength);
    let allowedDistance = rayLength;

    for (const box of wallBlockers) {
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
        allowedDistance = Math.max(
          MIN_CAMERA_DISTANCE,
          enter - CAMERA_CLEARANCE
        );
      }
    }

    if (allowedDistance < rayLength) {
      candidate.copy(lookAt).addScaledVector(rayDirection, allowedDistance);
    }
  }

  return {
    setPresentation(mode) {
      if (presentation === mode) return;
      presentation = mode;
      presentationYaw = 0;
      started = false;
    },
    rotate(dx: number, dy: number) {
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
      if (presentation !== 'world') {
        presentationYaw = THREE.MathUtils.clamp(presentationYaw - dx * 0.004, -0.62, 0.62);
        return;
      }
      manualHold = 1.25;
      yaw -= dx * 0.006;
      pitch = THREE.MathUtils.clamp(pitch + dy * 0.004, MIN_PITCH, MAX_PITCH);
    },
    setWalkHeading(heading) {
      walkHeading = heading !== null && Number.isFinite(heading) ? heading : null;
    },
    getYaw() {
      return yaw;
    },
    update(dt: number, target: THREE.Vector3, zoomOut: boolean, indoor: boolean) {
      if (presentation !== 'world') {
        // Feet-relative framing reserves the lower 40% for wardrobe and DJ controls.
        // The doll faces +Z while presenting. Preserve the exploration orbit separately.
        const companion = presentation === 'pet' || presentation === 'photo';
        const dist = companion ? (camera.aspect < 1 ? 4.7 : 4.3) : camera.aspect < 1 ? 4.25 : 4.4;
        desired.set(target.x + Math.sin(presentationYaw) * dist, target.y + 1.4, target.z + Math.cos(presentationYaw) * dist);
        lookAt.set(target.x, target.y + (presentation === 'pet' ? 0 : .25), target.z);
        current.copy(desired);
        camera.position.copy(current);
        camera.lookAt(lookAt);
        started = true;
        return;
      }
      // Following changes the view only. Sandbox freezes the movement basis for
      // the current stick gesture, so this cannot steer a held direction into a spiral.
      manualHold = Math.max(0, manualHold - dt);
      if (walkHeading !== null && manualHold === 0) {
        const wantedYaw = walkHeading + Math.PI;
        const difference = Math.atan2(Math.sin(wantedYaw - yaw), Math.cos(wantedYaw - yaw));
        yaw += difference * (1 - Math.exp(-dt * 2.7));
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
      pitch = 0.3;
      presentation = 'world';
      presentationYaw = 0;
      started = false;
    },
  };
}