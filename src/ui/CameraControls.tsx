import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { ZoomIn, ZoomOut, Move, RotateCcw, Focus } from 'lucide-react';
import './camera-controls.css';

export type CameraControlsProps = {
  onOrbit?(dx: number, dy: number): void;
  onZoom?(delta: number): void;
  onPan?(dx:number,dy:number):void;
  onResetFrame?():void;
  hideControls?:boolean;
  disabled?: boolean;
  className?: string;
};

/** Transparent shared camera surface above the style/photo sheet. */
export function CameraControls({ onOrbit, onZoom, onPan,onResetFrame,hideControls=false, disabled = false, className = '' }: CameraControlsProps) {
  const [panMode,setPanMode]=useState(false);
  const region = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const zoom = useRef(onZoom);
  useEffect(() => { zoom.current = onZoom; }, [onZoom]);
  const reset = useCallback(() => {
    const ids = [...pointers.current.keys()];
    pointers.current.clear();
    for (const id of ids) {
      if (region.current?.hasPointerCapture?.(id)) region.current.releasePointerCapture(id);
    }
  }, []);
  useEffect(() => {
    if (disabled) reset();
    const element = region.current;
    const wheel = (event: WheelEvent) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();
      zoom.current?.(event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element?.clientHeight ?? 100 : 1));
    };
    const visibility = () => { if (document.hidden) reset(); };
    element?.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      reset();
      element?.removeEventListener('wheel', wheel);
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [disabled, reset]);
  const start = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0 || pointers.current.size >= 2) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (disabled || !previous) return;
    const next = { x: event.clientX, y: event.clientY };
    const other = [...pointers.current.entries()].find(([id]) => id !== event.pointerId)?.[1];
    if (other) {onZoom?.((Math.hypot(previous.x-other.x,previous.y-other.y)-Math.hypot(next.x-other.x,next.y-other.y))*3);onPan?.((next.x-previous.x)/2,(next.y-previous.y)/2);}
    else if(panMode&&onPan)onPan(next.x-previous.x,next.y-previous.y);
    else onOrbit?.(next.x-previous.x,next.y-previous.y);
    pointers.current.set(event.pointerId, next);
    event.preventDefault();
    event.stopPropagation();
  };
  const end = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(event.pointerId)) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    event.stopPropagation();
  };
  return <div ref={region} className={`camera-controls ${className}`} role="region" tabIndex={disabled ? -1 : 0} aria-disabled={disabled} aria-label="Camera: drag to orbit, pinch or use plus and minus to zoom. Arrow keys rotate."
    onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
    onKeyDown={event => {
      if (disabled || event.target !== event.currentTarget) return;
      const delta = event.shiftKey ? 40 : 15;
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      const drag=panMode&&onPan?onPan:onOrbit;
      if (event.key === 'ArrowLeft') drag?.(-delta, 0);
      if (event.key === 'ArrowRight') drag?.(delta, 0);
      if (event.key === 'ArrowUp') drag?.(0, -delta);
      if (event.key === 'ArrowDown') drag?.(0, delta);
      if (event.key === '+' || event.key === '=') onZoom?.(-100);
      if (event.key === '-') onZoom?.(100);
    }}>
    {!hideControls?<div className="camera-zoom-controls" onPointerDown={event => event.stopPropagation()}>
      {onPan?<button type="button" disabled={disabled} aria-label={panMode?'Switch to orbit':'Switch to pan'} aria-pressed={panMode} onClick={()=>{reset();setPanMode(!panMode);}}>{panMode?<Move size={17}/>:<RotateCcw size={17}/>}</button>:null}
      {onResetFrame?<button type="button" aria-label="Reset photo framing" onClick={onResetFrame}><Focus size={17}/></button>:null}
      <button type="button" disabled={disabled} aria-label="Zoom in" onClick={() => onZoom?.(-100)}><ZoomIn size={17}/></button>
      <button type="button" disabled={disabled} aria-label="Zoom out" onClick={() => onZoom?.(100)}><ZoomOut size={17}/></button>
    </div>:null}
  </div>;
}
