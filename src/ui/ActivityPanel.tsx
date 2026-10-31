import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CircleDot, Droplets, Flag, Waves, X } from 'lucide-react';
import type { ActivityKind, ActivityState } from '@/game/lifestyle-types';
import { activityReward } from '../game/activity-model';
import './activities.css';

type Props = {
 rewardMultiplier?:number; kind:ActivityKind; state:ActivityState|null; onInput(value:number):void;
 onPouring(on:boolean):void; onClose():void; onCollect(score:number):void;
};
export function ActivityPanel({rewardMultiplier=1,kind,state,onInput,onPouring,onClose,onCollect}:Props){
 const titleId=useId(),collected=useRef(false),keys=useRef(new Set<string>()),pointers=useRef(new Map<number,number>());
 const callbacks=useRef({onInput,onPouring});callbacks.current={onInput,onPouring};
 const [held,setHeld]=useState(0),[pouring,setPouring]=useState(false);
 const finished=!!state?.finished,steering=kind==='surf'||kind==='netball'||kind==='volley';
 const actionPointers=useRef(new Set<number>());
 const syncAction=useCallback(()=>{const active=keys.current.has(' ')||keys.current.has('Enter')||actionPointers.current.size>0;callbacks.current.onPouring(active);setPouring(active);},[]);
 const release=useCallback(()=>{keys.current.clear();pointers.current.clear();actionPointers.current.clear();callbacks.current.onInput(0);callbacks.current.onPouring(false);setHeld(0);setPouring(false);},[]);
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
   if(steering&&['ArrowLeft','ArrowRight','a','d'].includes(key)){
    event.preventDefault();if(!finished){keys.current.add(key);syncSteering();}
   }
   if(kind!=='surf'&&(key===' '||key==='Enter')){
    event.preventDefault();if(!finished&&!event.repeat){keys.current.add(key);syncAction();}
   }
  };
  const up=(event:KeyboardEvent)=>{
   const key=event.key.length===1?event.key.toLowerCase():event.key;keys.current.delete(key);
   if(steering)syncSteering();
   if(kind!=='surf'&&(key===' '||key==='Enter')){syncAction();}
  };
  const visibility=()=>{if(document.hidden)release();};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',release);document.addEventListener('visibilitychange',visibility);
  return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',release);document.removeEventListener('visibilitychange',visibility);release();};
 },[kind,finished,steering,release,syncSteering,syncAction]);
 useEffect(()=>{if(finished)release();},[finished,release]);
 const close=()=>{release();onClose();};
 const directionProps=(value:number)=>({
  onPointerDown:(event:React.PointerEvent<HTMLButtonElement>)=>{event.preventDefault();if(finished)return;event.currentTarget.setPointerCapture?.(event.pointerId);pointers.current.set(event.pointerId,value);syncSteering();},
  onPointerUp:(event:React.PointerEvent<HTMLButtonElement>)=>{pointers.current.delete(event.pointerId);syncSteering();},
  onPointerCancel:release,onLostPointerCapture:(event:React.PointerEvent<HTMLButtonElement>)=>{pointers.current.delete(event.pointerId);syncSteering();},
 });
 const pourProps={
  onPointerDown:(event:React.PointerEvent<HTMLButtonElement>)=>{event.preventDefault();if(finished)return;event.currentTarget.setPointerCapture?.(event.pointerId);actionPointers.current.add(event.pointerId);syncAction();},
  onPointerUp:(event:React.PointerEvent<HTMLButtonElement>)=>{actionPointers.current.delete(event.pointerId);syncAction();},onPointerCancel:release,onLostPointerCapture:(event:React.PointerEvent<HTMLButtonElement>)=>{actionPointers.current.delete(event.pointerId);syncAction();},
 };
 const netball=kind==='netball',volley=kind==='volley',court=netball||volley;
 const title=kind==='surf'?'Catch your wave':netball?'Your five-shot challenge':volley?'Rally with Coco':'A little liquid sunshine';
 const actionLabel=volley?(pouring?'Ready… release to return':'Hold · release to return'):netball?(pouring?'Charging… release in gold':'Hold · release to shoot'):(pouring?'Pouring… release at the band':'Hold to pour');
 return <div className="dream-panel dream-panel-stage activity-stage-panel">
  <section className="activity-sheet" role="dialog" aria-modal="false" aria-labelledby={titleId}>
   <div className="activity-heading"><div className="activity-icon">{kind==='surf'?<Waves size={19}/>:court?<CircleDot size={19}/>:<Droplets size={19}/>}</div><div><span className="activity-eyebrow">{kind==='surf'?'COAST CLUB · 30 SECOND RIDE':netball?'COAST CLUB · NETBALL COURT':volley?'COAST CLUB · BEACH VOLLEYBALL':'COAST CLUB · PRECISION POUR'}</span><h2 id={titleId}>{title}</h2></div><button className="activity-close" aria-label="Leave activity" onClick={close}><X size={18}/></button></div>
   <div className="activity-stats"><span>{kind==='surf'?`${Math.ceil(state?.timeLeft??30)}s on the wave`:volley?`You ${state?.playerPoints??0} · Coco ${state?.opponentScore??0}`:`${netball?'Shot':'Glass'} ${state?.round??1} of ${netball?5:3}`}</span><strong>{state?.score??0} <small>{kind==='pour'?'PRECISION':'PTS'}</small></strong><span>{kind==='surf'?`${state?.combo??0}× combo`:volley?`${Math.ceil(state?.timeLeft??60)}s · first to 5`:`${Math.ceil(state?.timeLeft??(netball?18:12))}s ${netball?'shot clock':'to pour'}`}</span></div>
   <div className="activity-progress" role="progressbar" aria-label={kind==='surf'?'Ride progress':netball?'Shots completed':volley?'Match progress':'Glasses completed'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((state?.progress??0)*100)}><i style={{width:`${(state?.progress??0)*100}%`}}/></div>
   <p className="activity-feedback" role="status">{state?.feedback??(kind==='surf'?'Steer through gold rings · dodge coral buoys':netball?'Aim the arc at the ring · hold to charge · release in gold':volley?'Move under the ball · hold, then release as it drops':'Hold to pour · release at the gold band')}</p>
   {court&&!finished&&<div className="activity-charge" role="meter" aria-label={volley?"Return power; release near the dropping ball":"Shot power; gold target at 64 percent"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((state?.fill??0)*100)}><i style={{width:`${(state?.fill??0)*100}%`}}/><b/><span>{volley?"HOLD TO READY · RELEASE AS THE BALL DROPS":"SHOT POWER · RELEASE IN GOLD"}</span></div>}
   {rewardMultiplier>1?<p className="activity-follower-bonus">DreamFeed bonus ×{rewardMultiplier.toFixed(2)} included in your reward</p>:null}
   {finished?<button className="activity-collect" disabled={collected.current} onClick={()=>{if(collected.current||!state?.finished)return;collected.current=true;release();onCollect(state.score);}}><Flag size={17}/> Collect {Math.round(activityReward(kind,state?.score??0)*rewardMultiplier)} points</button>:
    <div className={`activity-buttons ${court?'activity-netball-buttons':''}`}>
     {steering&&<><button {...directionProps(-1)} className={held<0?'is-held':''} aria-label={netball?'Hold to aim left':volley?'Hold to move left':'Hold to steer left'} aria-pressed={held<0}><ArrowLeft size={22}/><span>{netball?'Aim left':volley?'Move left':'Carve left'}</span><kbd>A / ←</kbd></button>{court&&<button {...pourProps} className={`activity-pour ${pouring?'is-held':''}`} aria-label={volley?"Hold to jump, release to return ball":"Hold to charge, release to shoot"} aria-pressed={pouring}><CircleDot size={19}/><span>{actionLabel}</span><kbd>SPACE</kbd></button>}<button {...directionProps(1)} className={held>0?'is-held':''} aria-label={netball?'Hold to aim right':volley?'Hold to move right':'Hold to steer right'} aria-pressed={held>0}><span>{netball?'Aim right':volley?'Move right':'Carve right'}</span><ArrowRight size={22}/><kbd>D / →</kbd></button></>}
     {kind==='pour'&&<button {...pourProps} className={`activity-pour ${pouring?'is-held':''}`} aria-label="Hold to pour, release at target band" aria-pressed={pouring}><Droplets size={21}/><span>{actionLabel}</span><kbd>SPACE</kbd></button>}
    </div>}
  </section>
 </div>;
}
