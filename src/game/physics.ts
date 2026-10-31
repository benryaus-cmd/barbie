import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d';
import type { ColliderBox } from '@/game/types';
import { GROUND_FOOTPRINTS } from '@/game/world/ground';

export const CAPSULE_HALF = 0.55;
export const CAPSULE_RADIUS = 0.3;
export const FEET_OFFSET = CAPSULE_HALF + CAPSULE_RADIUS;

const GRAVITY = 21;
const JUMP_SPEED = 17.5;
const MAX_FALL = 36;

export type PhysicsRig = {
  position: THREE.Vector3;
  readonly grounded: boolean;
  step(
    dirX: number,
    dirZ: number,
    speed: number,
    jump: boolean,
    dt: number
  ): void;
  teleport(x: number, y: number, z: number): void;
  free(): void;
};

export function createPhysics(
  colliders: ColliderBox[],
  spawn: { x: number; y: number; z: number }
): PhysicsRig {
  const world = new RAPIER.World({ x: 0, y: -GRAVITY, z: 0 });
  world.timestep = 1 / 60;

  // Rendered district extensions are walkable too; share their exact footprints.
  for (const ground of GROUND_FOOTPRINTS) {
    // A planar triangle cap is exact at every radius; very wide, shallow
    // cylinders produced visibly sunken contact points near district edges.
    const vertices: number[] = [ground.x, ground.elevation, ground.z];
    const indices: number[] = [];
    for (let i = 0; i < 64; i += 1) {
      const a = i * Math.PI * 2 / 64;
      vertices.push(ground.x + Math.cos(a) * ground.radius, ground.elevation, ground.z + Math.sin(a) * ground.radius);
      indices.push(0, (i + 1) % 64 + 1, i + 1);
    }
    world.createCollider(RAPIER.ColliderDesc.trimesh(new Float32Array(vertices), new Uint32Array(indices)));
  }
  for (const box of colliders) {
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(box.hx, box.hy, box.hz).setTranslation(
        box.x,
        box.y,
        box.z
      )
    );
  }

  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(spawn.x, spawn.y, spawn.z)
      .lockRotations()
  );
  const collider = world.createCollider(
    RAPIER.ColliderDesc.capsule(CAPSULE_HALF, CAPSULE_RADIUS),
    body
  );
  const controller = world.createCharacterController(0.02);
  controller.enableAutostep(0.4, 0.08, true);
  // Keep the capsule on descending treads without enabling snap during jumps.
  controller.enableSnapToGround(0.2);
  controller.setMaxSlopeClimbAngle((52 * Math.PI) / 180);
  controller.setMinSlopeSlideAngle((38 * Math.PI) / 180);

  let velocityX = 0;
  let velocityY = 0;
  let velocityZ = 0;
  let grounded = false;
  let airTime = 0;
  let jumpBuffer = 0;
  const position = new THREE.Vector3(spawn.x, spawn.y, spawn.z);

  return {
    position,
    get grounded() {
      return grounded;
    },
    step(dirX, dirZ, speed, jump, dt) {
      if (!Number.isFinite(dt) || dt <= 0) return;
      dt = Math.min(dt, 1 / 30);
      const blend = Math.min(1, dt * 12);
      velocityX += (dirX * speed - velocityX) * blend;
      velocityZ += (dirZ * speed - velocityZ) * blend;

      if (grounded) {
        airTime = 0;
      } else {
        airTime += dt;
      }

      if (jump) {
        jumpBuffer = 0.16;
      } else {
        jumpBuffer = Math.max(0, jumpBuffer - dt);
      }

      const canJump = (grounded || airTime < 0.14) && jumpBuffer > 0;
      if (canJump) {
        velocityY = JUMP_SPEED;
        grounded = false;
        airTime = 1;
        jumpBuffer = 0;
      } else {
        velocityY = Math.max(-MAX_FALL, velocityY - GRAVITY * dt);
      }

      controller.computeColliderMovement(collider, {
        x: velocityX * dt,
        y: velocityY * dt,
        z: velocityZ * dt,
      });
      const moved = controller.computedMovement();
      const current = body.translation();
      body.setNextKinematicTranslation({
        x: current.x + moved.x,
        y: current.y + moved.y,
        z: current.z + moved.z,
      });

      grounded = controller.computedGrounded();
      if (grounded && velocityY < 0) velocityY = 0;

      world.step();
      const next = body.translation();
      position.set(next.x, next.y, next.z);

      if (next.y < -4) {
        body.setTranslation({ x: spawn.x, y: spawn.y, z: spawn.z }, true);
        position.set(spawn.x, spawn.y, spawn.z);
        velocityX = 0;
        velocityY = 0;
        velocityZ = 0;
      }
    },
    teleport(x, y, z) {
      body.setTranslation({ x, y, z }, true);
      body.setNextKinematicTranslation({ x, y, z });
      world.propagateModifiedBodyPositionsToColliders();
      position.set(x, y, z);
      velocityX = 0;
      velocityY = 0;
      velocityZ = 0;
      grounded = false;
      airTime = 1;
      jumpBuffer = 0;
    },
    free() {
      world.free();
    },
  };
}