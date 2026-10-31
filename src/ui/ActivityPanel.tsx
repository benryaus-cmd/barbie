import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Droplets, Flag, Waves, X } from 'lucide-react';
import type { ActivityKind, ActivityState } from '@/game/lifestyle-types';
import './activities.css';

type Props = {
 kind:ActivityKind; state:ActivityState|null; onInput(value:number):void;
 onPouring(on:boolean):void; onClose():void; onCollect(score:number):void;
};
export function ActivityPanel({kind,state,onInput,onPouring,onClose,onCollect}:Props){
 const titleId=useId(),collected=useRef(false),keys=useRef(new Set<string>()),pointers=useRef(new Map<number,number>());
 const callbacks=useRef({onInput,onPouring});callbacks.current={onInput,onPouring};
 const [held,setHeld]=useState(0),[pouring,setPouring]=useState(false);
 const finished=!!state?.finished;
 const release=useCallback(()=>{keys.current.clear();pointers.current.clear();callbacks.current.onInput(0);callbacks.current.onPouring(false);setHeld(0);setPouring(false);},[]);
 const syncSteering=useCallback(()=>{
  const left=keys.current.has('ArrowLeft')||keys.current.has('a')||[...pointers.current.values()].includes(-1);
  const right=keys.current.has('ArrowRight')||keys.current.has('d')||[...pointers.current.values()].includes(1);
  const value=Number(right)-Number(left);callbacks.current.onInput(value);setHeld(value);
 },[]);
 useEffect(()=>{collected.current=false;release();},[kind,release]);
 useEffect(()=>{
  const down=(event:KeyboardEvent)=>{
   if(event.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;
   const key=event.key.length===1?event.key.toLowerCase():event.key;
   if(kind==='surf'&&['ArrowLeft','ArrowRight','a','d'].includes(key)){
    event.preventDefault();if(!finished){keys.current.add(key);syncSteering();}
   }
   if(kind==='pour'&&(key===' '||key==='Enter')){
    event.preventDefault();if(!finished&&!event.repeat){keys.current.add(key);callbacks.current.onPouring(true);setPouring(true);}
   }
  };
  const up=(event:KeyboardEvent)=>{
   const key=event.key.length===1?event.key.toLowerCase():event.key;keys.current.delete(key);
   if(kind==='surf')syncSteering();
   if(kind==='pour'&&(key===' '||key==='Enter')){callbacks.current.onPouring(false);setPouring(false);}
  };
  const visibility=()=>{if(document.hidden)release();};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',release);document.addEventListener('visibilitychange',visibility);
  return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',release);document.removeEventListener('visibilitychange',visibility);release();};
 },[kind,finished,release,syncSteering]);
 useEffect(()=>{if(finished)release();},[finished,release]);
 const close=()=>{release();onClose();};
 const directionProps=(value:number)=>({
  onPointerDown:(event:React.PointerEvent<HTMLButtonElement>)=>{event.preventDefault();if(finished)return;event.currentTarget.setPointerCapture?.(event.pointerId);pointers.current.set(event.pointerId,value);syncSteering();},
  onPointerUp:(event:React.PointerEvent<HTMLButtonElement>)=>{pointers.current.delete(event.pointerId);syncSteering();},
  onPointerCancel:release,onLostPointerCapture:(event:React.PointerEvent<HTMLButtonElement>)=>{pointers.current.delete(event.pointerId);syncSteering();},
 });
 const pourProps={
  onPointerDown:(event:React.PointerEvent<HTMLButtonElement>)=>{event.preventDefault();if(finished)return;event.currentTarget.setPointerCapture?.(event.pointerId);callbacks.current.onPouring(true);setPouring(true);},
  onPointerUp:()=>{callbacks.current.onPouring(false);setPouring(false);},onPointerCancel:release,onLostPointerCapture:()=>{callbacks.current.onPouring(false);setPouring(false);},
 };
 return <div className="dream-panel dream-panel-stage activity-stage-panel">
  <section className="activity-sheet" role="dialog" aria-modal="false" aria-labelledby={titleId}>
   <div className="activity-heading"><div className="activity-icon">{kind==='surf'?<Waves size={19}/>:<Droplets size={19}/>}</div><div><span className="activity-eyebrow">{kind==='surf'?'COAST CLUB · 30 SECOND RIDE':'COAST CLUB · PRECISION POUR'}</span><h2 id={titleId}>{kind==='surf'?'Catch your wave':'A little liquid sunshine'}</h2></div><button className="activity-close" aria-label="Leave activity" onClick={close}><X size={18}/></button></div>
   <div className="activity-stats"><span>{kind==='surf'?`${Math.ceil(state?.timeLeft??30)}s on the wave`:`Glass ${state?.round??1} of 3`}</span><strong>{state?.score??0} <small>PTS</small></strong><span>{kind==='surf'?`${state?.combo??0}× combo`:`${Math.ceil(state?.timeLeft??12)}s to pour`}</span></div>
   <div className="activity-progress" role="progressbar" aria-label={kind==='surf'?'Ride progress':'Glasses completed'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((state?.progress??0)*100)}><i style={{width:`${(state?.progress??0)*100}%`}}/></div>
   <p className="activity-feedback" role="status">{state?.feedback??(kind==='surf'?'Steer through gold rings · dodge coral buoys':'Hold to pour · release at the gold band')}</p>
   {finished?<button className="activity-collect" disabled={collected.current} onClick={()=>{if(collected.current||!state?.finished)return;collected.current=true;release();onCollect(state.score);}}><Flag size={17}/> Collect {state?.score??0} points</button>:
    <div className="activity-buttons">{kind==='surf'?<><button {...directionProps(-1)} className={held<0?'is-held':''} aria-label="Hold to steer left" aria-pressed={held<0}><ArrowLeft size={22}/><span>Carve left</span><kbd>A / ←</kbd></button><button {...directionProps(1)} className={held>0?'is-held':''} aria-label="Hold to steer right" aria-pressed={held>0}><span>Carve right</span><ArrowRight size={22}/><kbd>D / →</kbd></button></>:<button {...pourProps} className={`activity-pour ${pouring?'is-held':''}`} aria-label="Hold to pour, release at target band" aria-pressed={pouring}><Droplets size={21}/><span>{pouring?'Pouring… release at the band':'Hold to pour'}</span><kbd>SPACE</kbd></button>}</div>}
  </section>
 </div>;
}
