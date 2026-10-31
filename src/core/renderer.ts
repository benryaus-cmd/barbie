import * as THREE from 'three';

const WEBGL_ERROR = 'WebGL failed to start. Refresh the page to try again.';

type RendererOptions = {
  container: HTMLElement;
  pixelRatio: number;
  onResize: (width: number, height: number) => void;
  onError: (message: string) => void;
  createContext?: () => THREE.WebGLRenderer;
};

export type RendererHandle = {
  renderer: THREE.WebGLRenderer;
  setPixelRatio(pixelRatio: number): void;
  dispose(): void;
};

export function cappedPixelRatio(requested: number): number {
  const device =
    typeof window === 'undefined' ? 2 : window.devicePixelRatio || 1;
  const safe = Number.isFinite(requested)
    ? Math.min(2, Math.max(.75, requested))
    : 1.5;
  return Math.min(safe, device, 2);
}

export function createRenderer(
  options: RendererOptions
): RendererHandle | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = options.createContext
      ? options.createContext()
      : new THREE.WebGLRenderer({ antialias: true, alpha: false });
  } catch {
    options.onError(WEBGL_ERROR);
    return null;
  }

  // Filmic colour without postprocessing render targets or full-screen passes.
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.touchAction = 'none';

  let pixelRatio = options.pixelRatio;
  let stopped = false;
  let observer: ResizeObserver | null = null;

  function applySize() {
    if (stopped) return;
    const width = options.container.clientWidth;
    const height = options.container.clientHeight;
    if (width < 1 || height < 1) return;
    renderer.setPixelRatio(cappedPixelRatio(pixelRatio));
    renderer.setSize(width, height, false);
    options.onResize(width, height);
  }

  try {
    options.container.appendChild(canvas);
    observer = new ResizeObserver(() => applySize());
    observer.observe(options.container);
    applySize();
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      stopped = true;
      renderer.setAnimationLoop(null);
      options.onError(
        'Graphics context was lost. Refresh the page to continue.'
      );
    });
  } catch {
    stopped = true;
    observer?.disconnect();
    canvas.remove();
    renderer.dispose();
    options.onError(WEBGL_ERROR);
    return null;
  }

  return {
    renderer,
    setPixelRatio(next) {
      pixelRatio = next;
      applySize();
    },
    dispose() {
      stopped = true;
      observer?.disconnect();
      renderer.setAnimationLoop(null);
      renderer.dispose();
      canvas.remove();
    },
  };
}
