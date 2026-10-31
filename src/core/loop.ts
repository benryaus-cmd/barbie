export type LoopHost = {
  setAnimationLoop(callback: ((time: number) => void) | null): void;
};

export type LoopClock = {
  now(): number;
};

type LoopOptions = {
  host: LoopHost;
  clock?: LoopClock;
  fixedStep?: number;
  maxDelta?: number;
  maxSteps?: number;
  update?: (step: number) => void;
  render?: () => void;
};

const DEFAULT_STEP = 1 / 60;

export function createLoop(options: LoopOptions) {
  const fixedStep = options.fixedStep ?? DEFAULT_STEP;
  const maxDelta = options.maxDelta ?? 0.1;
  const maxSteps = options.maxSteps ?? 5;
  const clock = options.clock ?? { now: () => performance.now() / 1000 };

  let started = false;
  let disposed = false;
  let halted = false;
  let userPaused = false;
  let hidden = false;
  let lastTime: number | null = null;
  let accumulator = 0;

  function resetTime() {
    lastTime = null;
    accumulator = 0;
  }

  function simulating() {
    return started && !disposed && !halted && !userPaused && !hidden;
  }

  function onFrame() {
    if (disposed) return;
    if (!simulating()) {
      resetTime();
      options.render?.();
      return;
    }

    const now = clock.now();
    if (lastTime === null) {
      lastTime = now;
      options.render?.();
      return;
    }

    const elapsed = Math.min(Math.max(0, now - lastTime), maxDelta);
    lastTime = now;
    accumulator += elapsed;

    let steps = 0;
    while (accumulator + 1e-6 >= fixedStep && steps < maxSteps) {
      options.update?.(fixedStep);
      accumulator -= fixedStep;
      steps += 1;
    }
    if (accumulator < 1e-6) accumulator = 0;
    if (steps === maxSteps) {
      accumulator %= fixedStep;
      if (accumulator > fixedStep - 1e-8) accumulator = 0;
    }
    options.render?.();
  }

  return {
    start() {
      if (disposed || started) return;
      started = true;
      resetTime();
      options.host.setAnimationLoop(onFrame);
    },
    pause() {
      userPaused = true;
      resetTime();
    },
    resume() {
      if (disposed || halted) return;
      userPaused = false;
      resetTime();
    },
    restart() {
      resetTime();
    },
    setHidden(next: boolean) {
      hidden = next;
      resetTime();
    },
    halt() {
      halted = true;
      resetTime();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      started = false;
      resetTime();
      options.host.setAnimationLoop(null);
    },
  };
}
