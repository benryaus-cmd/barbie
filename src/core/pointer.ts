type PointerCaptor = EventTarget & {
  setPointerCapture?(pointerId: number): void;
  hasPointerCapture?(pointerId: number): boolean;
  releasePointerCapture?(pointerId: number): void;
};

export type PointerSurface = PointerCaptor & {
  dataset: { pointerHeld?: string };
  contains?(target: EventTarget | null): boolean;
};

type Listen = (
  target: EventTarget,
  type: string,
  listener: EventListener
) => void;

function pointerId(event: Event): number | null {
  const id = (event as Partial<PointerEvent>).pointerId;
  return typeof id === 'number' ? id : null;
}

export function bindPointerHeld(
  surface: PointerSurface,
  listen: Listen,
  onHeld: (held: boolean) => void,
  releaseTarget: EventTarget
) {
  const active = new Set<number>();
  const captors = new Map<number, PointerCaptor>();

  const publish = (held: boolean) => {
    surface.dataset.pointerHeld = held ? '1' : '0';
    onHeld(held);
  };

  const captorFor = (event: Event): PointerCaptor => {
    const target = event.target;
    if (
      !target ||
      typeof (target as PointerCaptor).setPointerCapture !== 'function'
    ) {
      return surface;
    }
    const element = target as PointerCaptor;
    if (element === surface || surface.contains?.(element)) return element;
    return surface;
  };

  const releaseCapture = (id: number) => {
    const captor = captors.get(id);
    captors.delete(id);
    if (captor?.hasPointerCapture?.(id)) captor.releasePointerCapture?.(id);
  };

  const remember = (event: Event) => {
    const id = pointerId(event);
    if (id === null) return;
    const captor = captorFor(event);
    try {
      captor.setPointerCapture?.(id);
      captors.set(id, captor);
    } catch {
      // The pointer is already inactive.
    }
    active.add(id);
    publish(true);
  };

  const forget = (event: Event) => {
    const id = pointerId(event);
    if (id === null) return;
    active.delete(id);
    releaseCapture(id);
    publish(active.size > 0);
  };

  const clear = () => {
    for (const id of active) releaseCapture(id);
    active.clear();
    publish(false);
  };

  publish(false);
  listen(surface, 'pointerdown', remember);
  listen(surface, 'pointerup', forget);
  listen(surface, 'pointercancel', forget);
  if (releaseTarget !== surface) {
    listen(releaseTarget, 'pointerup', forget);
    listen(releaseTarget, 'pointercancel', forget);
  }

  return { clear };
}
