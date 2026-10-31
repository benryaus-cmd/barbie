export type Scope = {
  signal: AbortSignal;
  isActive(): boolean;
  onCleanup(fn: () => void): void;
  listen(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ): void;
  timeout(fn: () => void, ms: number): void;
  dispose(): void;
};

function runCleanup(fn: () => void) {
  try {
    fn();
  } catch {
    // One cleanup must not skip the rest.
  }
}

export function createScope(): Scope {
  const controller = new AbortController();
  const cleanups: Array<() => void> = [];
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let disposed = false;

  return {
    signal: controller.signal,
    isActive: () => !disposed,
    onCleanup(fn) {
      if (disposed) {
        runCleanup(fn);
        return;
      }
      cleanups.push(fn);
    },
    listen(target, type, listener, options) {
      target.addEventListener(type, listener, options);
      const remove = () => target.removeEventListener(type, listener, options);
      if (disposed) {
        remove();
        return;
      }
      cleanups.push(remove);
    },
    timeout(fn, ms) {
      if (disposed) return;
      let cleanup = () => {};
      const id = setTimeout(() => {
        timers.delete(id);
        const index = cleanups.indexOf(cleanup);
        if (index >= 0) cleanups.splice(index, 1);
        if (!disposed) fn();
      }, ms);
      timers.add(id);
      cleanup = () => {
        clearTimeout(id);
        timers.delete(id);
      };
      cleanups.push(cleanup);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      controller.abort();
      for (const id of timers) clearTimeout(id);
      timers.clear();
      for (let index = cleanups.length - 1; index >= 0; index -= 1) {
        runCleanup(cleanups[index]);
      }
      cleanups.length = 0;
    },
  };
}
