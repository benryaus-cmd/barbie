import * as THREE from 'three';
import { createActivityStage } from '@/game/activity-stage';
import { createResidents } from '@/game/residents';
import { createPetCompanion } from '@/game/pet-companion';
import type { ActivityKind, Look, PetAction, PoseId } from '@/game/lifestyle-types';
import { createAvatar } from '@/game/avatar';
import { createCameraRig, type PresentationMode } from '@/game/camera';
import { createCardPickups } from '@/game/card-pickups';
import { createParticles } from '@/game/particles';
import { PALETTE } from '@/game/palette';
import { createPhysics, FEET_OFFSET } from '@/game/physics';
import { nearestSpot, SPOTS, zoneAt } from '@/game/spots';
import { createTokens } from '@/game/tokens';
import type {
  AccessoryId,
  GameEvent,
  HairId,
  OutfitId,
  ShoesId,
  Spot,
  VehicleId,
  ZoneId,
} from '@/game/types';
import { buildVehicles } from '@/game/vehicles';
import { buildWorld } from '@/game/world';

const SPAWN = { x: 7, y: 1.4, z: -13 };
const VEHICLE_IDS: VehicleId[] = ['convertible', 'scooter', 'buggy'];

export type SandboxApi = {
  setPresentation(mode: PresentationMode): void;
  setLook(look: Look): void;
  setPose(pose: PoseId): void;
  setActivity(kind: ActivityKind | null): void;
  setActivityInput(value: number): void;
  setPouring(on: boolean): void;
  setPetAction(action: PetAction): void;
  setPhotoCompanion(id: string | null): void;
  setMove(x: number, y: number): void;
  rotateCamera(dx: number, dy: number): void;
  jump(): void;
  interact(): void;
  setOutfit(id: OutfitId): void;
  setHair(id: HairId): void;
  setAccessory(id: AccessoryId): void;
  setShoes(id: ShoesId): void;
  setMoodLight(color: number): void;
  setDancing(on: boolean): void;
  setCollectedCards(ids: number[]): void;
  celebrate(): void;
  sparkleAtScreen(ndcX: number, ndcY: number): void;
  reset(): void;
};

export type Sandbox = {
  root: THREE.Group;
  api: SandboxApi;
  update(step: number): void;
  dispose(): void;
};

export type SandboxTuning = {
  walkSpeed: number;
  effects: boolean;
  quality?: 'low' | 'balanced' | 'high';
};

export type SandboxOptions = {
  camera: THREE.PerspectiveCamera;
  tuning: SandboxTuning;
  emit: (event: GameEvent) => void;
};

function lerpAngle(from: number, to: number, amount: number) {
  let diff = (to - from) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return from + diff * amount;
}

export function createSandbox(options: SandboxOptions): Sandbox {
  const root = new THREE.Group();
  const world = buildWorld();
  root.add(world.root);

  const avatar = createAvatar();
  avatar.group.name = 'doll';
  avatar.group.traverse(object => {
    if ((object as THREE.Mesh).isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  avatar.group.rotation.y = Math.PI;
  root.add(avatar.group);

  const contactCanvas = document.createElement('canvas');
  contactCanvas.width = 64;
  contactCanvas.height = 64;
  const contactContext = contactCanvas.getContext('2d');
  if (contactContext) {
    const fade = contactContext.createRadialGradient(32, 32, 4, 32, 32, 32);
    fade.addColorStop(0, 'rgba(48,18,57,0.38)');
    fade.addColorStop(0.5, 'rgba(48,18,57,0.16)');
    fade.addColorStop(1, 'rgba(48,18,57,0)');
    contactContext.fillStyle = fade;
    contactContext.fillRect(0, 0, 64, 64);
  }
  const contactTexture = new THREE.CanvasTexture(contactCanvas);
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.85),
    new THREE.MeshBasicMaterial({
      map: contactTexture,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    })
  );
  blob.rotation.x = -Math.PI / 2;
  root.add(blob);

  const particles = createParticles();
  root.add(particles.points);

  const vehicles = buildVehicles();
  for (const id of VEHICLE_IDS) root.add(vehicles[id].group);

  const tokens = createTokens();
  root.add(tokens.group);

  const cards = createCardPickups(options.camera);
  root.add(cards.group);

  const residents = createResidents();
  const pet = createPetCompanion();
  root.add(residents.root, pet.root);
  const activity = createActivityStage(options.camera, avatar, options.emit);
  root.add(activity.root);
  activity.root.visible = false;
  const normalObjects: THREE.Object3D[] = [world.root, residents.root, pet.root, blob, particles.points, tokens.group, cards.group, ...VEHICLE_IDS.map(id => vehicles[id].group)];
  let activityRunning = false;
  let activityKind: ActivityKind | null = null;
  let photoCompanion: string | null = null;
  let steeringYaw: number | null = null;
  const petTarget = new THREE.Vector3();

  const spots: Spot[] = SPOTS.map(spot => ({ ...spot }));
  const physics = createPhysics(world.colliders, SPAWN);
  const cameraRig = createCameraRig(options.camera, 6.8, world.colliders);

  const move = { x: 0, y: 0 };
  let clock = 0;
  let jumpQueued = false;
  let facing = Math.PI;
  let dancing = false;
  let presentation: PresentationMode = 'world';
  let mounted: VehicleId | null = null;
  let lastSpot: string | null = '__none';
  let lastZone: ZoneId | null = null;

  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ndc = new THREE.Vector2();
  const hitPoint = new THREE.Vector3();
  const cameraTarget = new THREE.Vector3();

  function effectBurst(x: number, y: number, z: number, count: number) {
    if (options.tuning.effects) particles.burst(x, y, z, count);
  }

  function mount(id: VehicleId) {
    const spot = spots.find(item => item.id === id);
    if (!spot) return;
    mounted = id;
    options.emit({ type: 'vehicle', vehicle: id });
    effectBurst(spot.x, 0.6, spot.z, 16);
  }

  function dismount() {
    if (!mounted) return;
    const id = mounted;
    const rig = vehicles[id];
    const parkX = physics.position.x - Math.sin(facing) * 1.1;
    const parkZ = physics.position.z - Math.cos(facing) * 1.1;
    rig.home.set(parkX, 0, parkZ);
    rig.group.position.copy(rig.home);
    const spot = spots.find(item => item.id === id);
    if (spot) {
      spot.x = parkX;
      spot.z = parkZ;
    }
    mounted = null;
    options.emit({ type: 'vehicle', vehicle: null });
  }

  function interact() {
    if (activityRunning || presentation !== 'world') return;
    if (mounted) {
      dismount();
      return;
    }
    const feetY = physics.position.y - FEET_OFFSET;
    const neighbour = residents.nearest(physics.position.x, feetY, physics.position.z);
    if (neighbour) {options.emit({type: 'resident', id: neighbour.id}); return;}
    const spot = nearestSpot(physics.position.x, feetY, physics.position.z, spots);
    if (!spot) return;
    if (spot.kind === 'vehicle') {
      mount(spot.id as VehicleId);
      return;
    }
    options.emit({ type: 'spot', id: spot.id });
    effectBurst(spot.x, 0.8, spot.z, 14);
  }

  function update(step: number) {
    if (activityRunning) {activity.update(step);return;}
    // Lock the movement basis until the current gesture ends. Auto-follow then
    // changes the view without feeding back into character steering.
    const hasInput = Math.hypot(move.x, move.y) > .055 && presentation === 'world' && !dancing;
    if (!hasInput) steeringYaw = null;
    else if (steeringYaw === null) steeringYaw = cameraRig.getYaw();
    const yaw = steeringYaw ?? cameraRig.getYaw();
    const forwardX = -Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);
    let dirX = rightX * move.x + forwardX * move.y;
    let dirZ = rightZ * move.x + forwardZ * move.y;
    if (!hasInput) {dirX = 0;dirZ = 0;}
    const magnitude = Math.hypot(dirX, dirZ);
    if (magnitude > 1) {
      dirX /= magnitude;
      dirZ /= magnitude;
    }

    const walkSpeed = options.tuning.walkSpeed;
    const speed = dancing || presentation !== 'world' ? 0 : mounted ? walkSpeed * 2.7 : walkSpeed;
    const jumpNow = jumpQueued && presentation === 'world';
    jumpQueued = false;
    physics.step(dirX, dirZ, speed, jumpNow, step);

    const position = physics.position;
    const feetY = position.y - FEET_OFFSET;
    const travel = Math.hypot(dirX, dirZ) * speed;
    const moving = travel > 0.3;
    if (moving) {
      facing = lerpAngle(facing, Math.atan2(dirX, dirZ), Math.min(1, step * 10));
    }

    const seatHeight = mounted ? vehicles[mounted].seatY : 0;
    avatar.group.position.set(position.x, feetY + seatHeight + 0.02, position.z);
    avatar.group.rotation.y = presentation === 'world' ? facing : 0;
    avatar.update(step, {
      moving,
      speed: travel,
      grounded: physics.grounded,
      dancing,
      sitting: mounted !== null,
    });

    blob.visible = mounted === null;
    if (blob.visible) {
      blob.position.set(position.x, feetY + 0.035, position.z);
      blob.material.opacity = physics.grounded ? 0.8 : 0.28;
    }

    if (!physics.grounded && options.tuning.effects) {
      if (Math.random() < 0.6) {
        particles.sparkle(
          position.x + (Math.random() - 0.5) * 0.28,
          feetY + 0.18,
          position.z + (Math.random() - 0.5) * 0.28,
          Math.random() < 0.5 ? PALETTE.hotPink : PALETTE.gold,
          2
        );
      }
    }
    if (jumpNow && options.tuning.effects) {
      particles.sparkle(position.x, feetY + 0.2, position.z, PALETTE.gold, 14);
      particles.burst(position.x, feetY + 0.2, position.z, 8);
    }

    for (const id of VEHICLE_IDS) {
      const rig = vehicles[id];
      if (mounted === id) {
        rig.group.position.set(position.x, Math.max(0, feetY), position.z);
        rig.group.rotation.y = facing;
        const spin = speed * step * 2.6;
        for (const wheel of rig.wheels) wheel.rotation.x -= spin;
        const spot = spots.find(item => item.id === id);
        if (spot) {
          spot.x = position.x;
          spot.z = position.z;
        }
      } else {
        rig.group.position.copy(rig.home);
      }
    }

    petTarget.set(position.x, feetY, position.z);
    residents.update(step, petTarget, presentation === 'photo', options.tuning.effects && options.tuning.quality !== 'low' ? 3 : 1);
    pet.update(step, petTarget, facing, presentation === 'pet' || presentation === 'photo', presentation === 'photo' && photoCompanion === 'pet');
    pet.root.visible = presentation !== 'photo' || photoCompanion === 'pet';
    cameraTarget.set(position.x + (presentation === 'photo' && photoCompanion && photoCompanion !== 'pet' ? .42 : presentation === 'pet' || presentation === 'photo' && photoCompanion === 'pet' ? -.28 : 0), feetY, position.z);
    cameraRig.setWalkHeading(moving ? Math.atan2(dirX, dirZ) : null);
    const insideDreamhouse =
      position.x > -9.5 && position.x < 9.5 &&
      position.z > -52 && position.z < -39;
    cameraRig.update(step, cameraTarget, mounted !== null, insideDreamhouse);
    particles.points.visible = options.tuning.effects && options.tuning.quality !== 'low';
    particles.update(step);
    world.update(step, options.tuning.effects && options.tuning.quality !== 'low');

    clock += step;
    for (const bobber of world.bobbers) {
      bobber.obj.position.y = bobber.baseY + Math.sin(clock * 2.2 + bobber.phase) * 0.16;
      bobber.obj.rotation.y += step * bobber.spin;
    }
    for (let i = 0; i < world.pulses.length; i += 1) {
      world.pulses[i].emissiveIntensity =
        0.7 + (Math.sin(clock * 3 + i * 0.85) * 0.5 + 0.5) * 1.5;
    }

    if (!mounted) {
      const grabbed = tokens.update(step, position.x, feetY, position.z, (tx, ty, tz) => {
        effectBurst(tx, ty, tz, 10);
      });
      if (grabbed > 0) {
        options.emit({ type: 'token', points: grabbed * 3, count: grabbed });
      }
    }

    cards.update(step, position.x, feetY, position.z, (id, x, y, z) => {
      effectBurst(x, y, z, 18);
      options.emit({ type: 'collectorCard', id });
    });

    const spot = mounted ? null : nearestSpot(position.x, feetY, position.z, spots);
    const neighbour = mounted || presentation !== 'world' ? null : residents.nearest(position.x, feetY, position.z);
    const spotKey = neighbour ? `resident:${neighbour.id}` : spot ? spot.id : null;
    if (spotKey !== lastSpot) {
      lastSpot = spotKey;
      world.setHoverSpot(spotKey);
      options.emit({
        type: 'near',
        spot: neighbour
          ? {id: 'resident', label: neighbour.name, hint: `Talk · ${neighbour.role}`, kind: 'social'}
          : spot
          ? { id: spot.id, label: spot.label, hint: spot.hint, kind: spot.kind }
          : null,
      });
    }
    const zone = zoneAt(position.x, position.z);
    if (zone !== lastZone) {
      lastZone = zone;
      options.emit({ type: 'zone', zone });
    }
  }

  function setActivity(kind: ActivityKind | null) {
    if (kind === activityKind) return;
    activityKind = kind;
    move.x = move.y = 0;
    steeringYaw = null;
    jumpQueued = false;
    if (activityRunning) activity.stop();
    activityRunning = kind !== null;
    for (const object of normalObjects) object.visible = !activityRunning;
    activity.root.visible = activityRunning;
    if (kind) {
      if (mounted) dismount();
      dancing = false;
      presentation = 'world';
      avatar.setPose('idle');
      options.emit({type: 'near', spot: null});
      activity.start(kind);
    } else {
      const feetY = physics.position.y - FEET_OFFSET;
      avatar.group.position.set(physics.position.x, feetY + .02, physics.position.z);
      avatar.group.rotation.set(0, facing, 0);
      avatar.group.scale.setScalar(1);
      avatar.setPose('idle');
      cameraRig.setPresentation('world');
      cameraRig.setWalkHeading(null);
      presentation = 'world';
      lastSpot = '__none';
    }
  }

  return {
    root,
    update,
    api: {
      setLook(look) {avatar.setLook(look);},
      setPose(pose) {avatar.setPose(pose);},
      setActivity,
      setActivityInput(value) {activity.setInput(Number.isFinite(value) ? THREE.MathUtils.clamp(value,-1,1) : 0);},
      setPouring(on) {activity.setPouring(on);},
      setPetAction(action) {pet.setAction(action); if (action === 'pat' || action === 'treat') avatar.setPose('pet');},
      setPhotoCompanion(id) {photoCompanion = id;residents.setPhotoCompanion(id);},
      setPresentation(mode) {
        if (activityRunning && mode === 'world') return;
        if (activityRunning) setActivity(null);
        presentation = mode;
        if (mode === 'world') {avatar.setPose('idle');photoCompanion = null;residents.setPhotoCompanion(null);}
        steeringYaw = null;
        move.x = 0;
        move.y = 0;
        jumpQueued = false;
        if (mode !== 'world' && mounted) dismount();
        cameraRig.setPresentation(mode);
      },
      setMove(x, y) {
        move.x = Number.isFinite(x) ? THREE.MathUtils.clamp(x, -1, 1) : 0;
        move.y = Number.isFinite(y) ? THREE.MathUtils.clamp(y, -1, 1) : 0;
      },
      rotateCamera(dx, dy) {
        cameraRig.rotate(dx, dy);
      },
      jump() {
        jumpQueued = true;
      },
      interact,
      setOutfit(id) {
        avatar.setOutfit(id);
      },
      setHair(id) {
        avatar.setHair(id);
      },
      setAccessory(id) {
        avatar.setAccessory(id);
      },
      setShoes(id) {
        avatar.setShoes(id);
      },
      setMoodLight(color) {
        if (!world.mood) return;
        world.mood.light.color.setHex(color);
        world.mood.orbMat.color.setHex(color);
        world.mood.orbMat.emissive.setHex(color);
        effectBurst(physics.position.x, 1.4, physics.position.z, 12);
      },
      setDancing(on) {
        dancing = on;
        if (on) avatar.celebrate();
      },
      setCollectedCards(ids) {
        cards.setCollected(ids);
      },
      celebrate() {
        avatar.celebrate();
        effectBurst(physics.position.x, 1.6, physics.position.z, 30);
      },
      sparkleAtScreen(x, y) {
        if (!options.tuning.effects) return;
        ndc.set(x, y);
        raycaster.setFromCamera(ndc, options.camera);
        if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
          particles.sparkle(hitPoint.x, 0.25, hitPoint.z, PALETTE.gold, 9);
        }
      },
      reset() {
        if(activityRunning) setActivity(null);
        pet.reset();
        residents.setPhotoCompanion(null);
        photoCompanion=null;
        steeringYaw=null;
        avatar.setPose('idle');
        mounted = null;
        dancing = false;
        presentation = 'world';
        cameraRig.reset();
        tokens.reset();
        move.x = 0;
        move.y = 0;
        physics.teleport(SPAWN.x, SPAWN.y, SPAWN.z);
        options.emit({ type: 'vehicle', vehicle: null });
      },
    },
    dispose() {
      if(activityRunning)activity.stop();
      residents.dispose();
      contactTexture.dispose();
      cards.dispose();
      particles.dispose();
      physics.free();
    },
  };
}