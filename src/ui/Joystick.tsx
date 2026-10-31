import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

type JoystickProps = { onChange: (x: number, y: number) => void; disabled?: boolean };

export function Joystick({ onChange, disabled = false }: JoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<number | null>(null);
  const callbackRef = useRef(onChange);
  useLayoutEffect(() => { callbackRef.current = onChange; }, [onChange]);
  const reset = useCallback(() => {
    const pointerId = activeRef.current;
    activeRef.current = null;
    if (knobRef.current) knobRef.current.style.transform = 'translate(0px, 0px)';
    callbackRef.current(0, 0);
    const base = baseRef.current;
    if (pointerId !== null && base?.hasPointerCapture(pointerId)) base.releasePointerCapture(pointerId);
  }, []);
  useEffect(() => {
    const visibility = () => { if (document.hidden) reset(); };
    window.addEventListener('blur', reset);
    window.addEventListener('pagehide', reset);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('blur', reset);
      window.removeEventListener('pagehide', reset);
      document.removeEventListener('visibilitychange', visibility);
      reset();
    };
  }, [reset]);
  useEffect(() => { if (disabled) reset(); }, [disabled, reset]);
  const move = (clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const radius = Math.max(20, rect.width / 2 - 25);
    let dx = clientX - (rect.left + rect.width / 2);
    let dy = clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy);
    if (distance > radius) { dx = (dx / distance) * radius; dy = (dy / distance) * radius; }
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    callbackRef.current(dx / radius, -dy / radius);
  };
  return (
    <div ref={baseRef} className="movement-stick" style={{ touchAction: 'none' }}
      onPointerDown={event => {
        event.preventDefault(); event.stopPropagation();
        if (disabled || activeRef.current !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
        activeRef.current = event.pointerId;
        try { event.currentTarget.setPointerCapture(event.pointerId); } catch { reset(); return; }
        move(event.clientX, event.clientY);
      }}
      onPointerMove={event => { event.preventDefault(); event.stopPropagation(); if (activeRef.current === event.pointerId) move(event.clientX, event.clientY); }}
      onPointerUp={event => { event.preventDefault(); event.stopPropagation(); if (activeRef.current === event.pointerId) reset(); }}
      onPointerCancel={event => { event.stopPropagation(); if (activeRef.current === event.pointerId) reset(); }}
      onLostPointerCapture={event => { event.stopPropagation(); if (activeRef.current === event.pointerId) reset(); }}
      onContextMenu={event => event.preventDefault()}
      role="group" aria-label="Movement joystick. Drag to walk; use WASD or arrow keys on a keyboard." aria-disabled={disabled}>
      <span className="stick-axis stick-axis-x" aria-hidden="true" /><span className="stick-axis stick-axis-y" aria-hidden="true" />
      <div ref={knobRef} className="stick-knob" aria-hidden="true"><span>✦</span></div>
      <span className="stick-label" aria-hidden="true">MOVE</span>
    </div>
  );
}
