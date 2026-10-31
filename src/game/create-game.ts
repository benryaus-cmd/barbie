import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createLoop } from '@/core/loop';
import { releaseRunRoot } from '@/core/release-root';
import { createRenderer } from '@/core/renderer';
import type { PresentationMode } from '@/game/camera';
import { createScope } from '@/core/scope';
import { createSandbox, type Sandbox, type SandboxTuning } from '@/game/sandbox';
import type {
  AccessoryId,
  GameEvent,
  HairId,
  OutfitId,
  ShoesId,
} from '@/game/types';

export type GameConfig = {
  backgroundColor: string;
  pixelRatio: number;
  walkSpeed: number;
  sparkleFx: boolean;
  quality?: 'low' | 'balanced' | 'high';
  cameraSensitivity?: number;
};

export type GameHandle = {
  pause(): void;
  resume(): void;
  restart(): void;
  updateConfig(config: GameConfig): void;
  dispose(): void;
  setPresentation(mode: PresentationMode): void;
  setInputEnabled(enabled: boolean): void;
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
};

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const FALLBACK_COLOR = '#8fd8f5';

export function sanitizeConfig(config: GameConfig): GameConfig {
  const pixelRatio = Number(config.pixelRatio);
  const walkSpeed = Number(config.walkSpeed);
  return {
    backgroundColor: HEX_COLOR.test(config.backgroundColor)
      ? config.backgroundColor
      : FALLBACK_COLOR,
    pixelRatio: Number.isFinite(pixelRatio)
      ? Math.min(2, Math.max(.75, pixelRatio))
      : 1.35,
    walkSpeed: Number.isFinite(walkSpeed)
      ? Math.min(12, Math.max(2.5, walkSpeed))
      : 5.4,
    sparkleFx: config.sparkleFx !== false,
    quality: config.quality === 'low' || config.quality === 'high' ? config.quality : 'balanced',
    cameraSensitivity: Number.isFinite(config.cameraSensitivity) ? Math.min(1.5,Math.max(.5,config.cameraSensitivity)) : 1,
  };
}

const noop: GameHandle = {
  pause() {},
  resume() {},
  restart() {},
  updateConfig() {},
  dispose() {},
  setPresentation() {},
  setInputEnabled() {},
  setMove() {},
  rotateCamera() {},
  jump() {},
  interact() {},
  setOutfit() {},
  setHair() {},
  setAccessory() {},
  setShoes() {},
  setMoodLight() {},
  setDancing() {},
  setCollectedCards() {},
  celebrate() {},
};

export function updateCameraProjection(
  camera: THREE.Camera,
  width: number,
  height: number
) {
  if (!(camera as THREE.PerspectiveCamera).isPerspectiveCamera) return;
  const perspective = camera as THREE.PerspectiveCamera;
  perspective.aspect = width / Math.max(height, 1);
  perspective.fov = 58;
  perspective.updateProjectionMatrix();
}

export function createGame(
  container: HTMLElement,
  config: GameConfig,
  onError: (message: string) => void,
  onEvent: (event: GameEvent) => void
): GameHandle {
  const safe = sanitizeConfig(config);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);
  camera.position.set(0, 8, 28);

  const tuning: SandboxTuning = {
    walkSpeed: safe.walkSpeed,
    effects: safe.sparkleFx,
  };

  const view = createRenderer({
    container,
    pixelRatio: safe.pixelRatio,
    onResize: (width, height) => updateCameraProjection(camera, width, height),
    onError: message => onError(message),
  });
  if (!view) return noop;

  let disposed = false;
  const room = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(view.renderer);
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture;
  scene.environmentIntensity = .35;
  room.dispose();
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0xc9eaff, 0xb66e91, 1.1));
  const sun = new THREE.DirectionalLight(0xffe4bc, 1.9);
  sun.position.set(15, 24, 12);
  // One bounded shadow map follows the doll; only the character casts into it.
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 70 });
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 3;
  scene.add(sun.target);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xc9d9ff, 0.4);
  fill.position.set(-32, 22, -28);
  scene.add(fill);

  let cameraSensitivity = 1;
  function applyConfig(next: GameConfig) {
    const clean = sanitizeConfig(next);
    scene.background = new THREE.Color(clean.backgroundColor);
    scene.fog = new THREE.Fog(clean.backgroundColor, 90, 320);
    view.setPixelRatio(clean.pixelRatio);
    tuning.walkSpeed = clean.walkSpeed;
    tuning.effects = clean.sparkleFx;
    view.renderer.shadowMap.enabled = clean.quality !== 'low';
    sun.castShadow = clean.quality !== 'low';
    cameraSensitivity = clean.cameraSensitivity;
  }
  applyConfig(config);

  let sandbox: Sandbox;
  try {
    sandbox = createSandbox({ camera, tuning, emit: onEvent });
  } catch {
    environment.dispose();
    view.dispose();
    onError('The 3D dreamland could not start. Please refresh and try again.');
    return noop;
  }
  scene.add(sandbox.root);

  const sunOffset = new THREE.Vector3(15, 24, 12);
  const doll = sandbox.root.getObjectByName('doll');
  const loop = createLoop({
    host: {
      setAnimationLoop(callback) {
        view.renderer.setAnimationLoop(callback);
      },
    },
    update(step) {
      sandbox.update(step);
    },
    render() {
      if (doll) {
        sun.target.position.copy(doll.position);
        sun.position.copy(doll.position).add(sunOffset);
      }
      view.renderer.render(scene, camera);
    },
  });

  const app = createScope();
  const canvas = view.renderer.domElement;
  let cameraPointer: { id: number; x: number; y: number } | null = null;
  let inputEnabled = true;
  let paused = false;
  const keys = new Set<string>();
  const touchMove = { x: 0, y: 0 };
  const movementCodes = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);

  function applyMove() {
    const x = touchMove.x + Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
    const y = touchMove.y + Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
    const length = Math.max(1, Math.hypot(x, y));
    sandbox.api.setMove(inputEnabled && !paused ? x / length : 0, inputEnabled && !paused ? y / length : 0);
  }

  function clearInput() {
    keys.clear();
    touchMove.x = 0;
    touchMove.y = 0;
    sandbox.api.setMove(0, 0);
    const pointer = cameraPointer;
    cameraPointer = null;
    if (pointer && canvas.hasPointerCapture?.(pointer.id)) canvas.releasePointerCapture(pointer.id);
  }

  // The joystick owns its own pointer on a sibling UI element. The canvas captures
  // just one independent camera finger, including drags that leave its bounds.
  app.listen(canvas, 'pointerdown', event => {
    const pointer = event as PointerEvent;
    if (!inputEnabled || paused || cameraPointer || (pointer.pointerType === 'mouse' && pointer.button !== 0)) return;
    event.preventDefault();
    cameraPointer = { id: pointer.pointerId, x: pointer.clientX, y: pointer.clientY };
    canvas.setPointerCapture?.(pointer.pointerId);
    const rect = canvas.getBoundingClientRect();
    sandbox.api.sparkleAtScreen(
      ((pointer.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1,
      1 - ((pointer.clientY - rect.top) / Math.max(rect.height, 1)) * 2
    );
  });
  app.listen(canvas, 'pointermove', event => {
    const pointer = event as PointerEvent;
    if (!cameraPointer || cameraPointer.id !== pointer.pointerId || !inputEnabled || paused) return;
    event.preventDefault();
    sandbox.api.rotateCamera((pointer.clientX - cameraPointer.x) * cameraSensitivity, (pointer.clientY - cameraPointer.y) * cameraSensitivity);
    cameraPointer.x = pointer.clientX;
    cameraPointer.y = pointer.clientY;
  });
  const releaseCamera = (event: Event) => {
    const id = (event as PointerEvent).pointerId;
    if (cameraPointer?.id !== id) return;
    cameraPointer = null;
    if (canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id);
  };
  app.listen(canvas, 'pointerup', releaseCamera);
  app.listen(canvas, 'pointercancel', releaseCamera);
  app.listen(canvas, 'lostpointercapture', releaseCamera);
  app.listen(window, 'pointerup', releaseCamera);
  app.listen(window, 'pointercancel', releaseCamera);
  app.listen(window, 'blur', clearInput);
  app.listen(window, 'keydown', event => {
    const key = event as KeyboardEvent;
    const target = key.target as HTMLElement | null;
    if (!inputEnabled || paused || target?.isContentEditable || target?.closest?.('input, textarea, select, [role="dialog"]')) return;
    if (!movementCodes.has(key.code) && key.code !== 'Space' && key.code !== 'KeyE') return;
    event.preventDefault();
    if (movementCodes.has(key.code)) {
      keys.add(key.code);
      applyMove();
    } else if (!key.repeat) {
      if (key.code === 'Space') sandbox.api.jump();
      if (key.code === 'KeyE') sandbox.api.interact();
    }
  });
  app.listen(window, 'keyup', event => {
    const key = event as KeyboardEvent;
    if (keys.delete(key.code)) {
      event.preventDefault();
      applyMove();
    }
  });
  app.listen(document, 'visibilitychange', () => {
    loop.setHidden(document.hidden);
    if (document.hidden) clearInput();
  });
  app.onCleanup(clearInput);

  if (document.hidden) loop.setHidden(true);
  loop.start();

  return {
    pause() {
      if (!disposed) {
        paused = true;
        clearInput();
        loop.pause();
      }
    },
    resume() {
      if (!disposed) {
        paused = false;
        loop.resume();
      }
    },
    restart() {
      if (disposed) return;
      clearInput();
      loop.restart();
      sandbox.api.reset();
    },
    updateConfig(next) {
      if (!disposed) applyConfig(next);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      loop.dispose();
      app.dispose();
      sandbox.dispose();
      scene.remove(sandbox.root);
      sun.shadow.dispose();
      environment.dispose();
      releaseRunRoot(
        sandbox.root,
        new Set<THREE.BufferGeometry | THREE.Material>()
      );
      view.dispose();
    },
    setPresentation(mode) {
      if (disposed) return;
      clearInput();
      sandbox.api.setPresentation(mode);
    },
    setInputEnabled(enabled) {
      inputEnabled = enabled;
      if (!enabled) clearInput();
    },
    setMove(x, y) {
      if (disposed) return;
      touchMove.x = Number.isFinite(x) ? x : 0;
      touchMove.y = Number.isFinite(y) ? y : 0;
      applyMove();
    },
    rotateCamera(dx, dy) {
      sandbox.api.rotateCamera(dx * cameraSensitivity, dy * cameraSensitivity);
    },
    jump() {
      if (!inputEnabled || paused || disposed) return;
      sandbox.api.jump();
    },
    interact() {
      if (!inputEnabled || paused || disposed) return;
      sandbox.api.interact();
    },
    setOutfit(id) {
      sandbox.api.setOutfit(id);
    },
    setHair(id) {
      sandbox.api.setHair(id);
    },
    setAccessory(id) {
      sandbox.api.setAccessory(id);
    },
    setShoes(id) {
      sandbox.api.setShoes(id);
    },
    setMoodLight(color) {
      sandbox.api.setMoodLight(color);
    },
    setDancing(on) {
      sandbox.api.setDancing(on);
    },
    setCollectedCards(ids) {
      sandbox.api.setCollectedCards(ids);
    },
    celebrate() {
      sandbox.api.celebrate();
    },
  };
}