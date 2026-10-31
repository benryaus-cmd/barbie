import { useState } from 'react';
import { Check, Palette, Scissors, Sparkles } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { HairId } from '@/game/types';
import type { Look } from '@/game/lifestyle-types';
import { HAIR_COLORS, HAIRSTYLES, MAKEUP_LOOKS } from '@/game/fashion';
import { ChoiceRow, Panel } from '@/ui/Panel';
import './beauty.css';

type BeautyStudioProps = { hair:HairId; look:Look; points:number; onHair:(id:HairId)=>void; onLook:(look:Look)=>void; onClose:()=>void; mode?:'hair'|'makeup' };
const naturalHair:Record<HairId,string>={blonde:'#eec86b',pink:'#f378b7',updo:'#69412f',bob:'#412a39',curls:'#9c5837',braids:'#69412f',pixie:'#412a39','twin-buns':'#b69ae4',straight:'#eec86b'};
export function BeautyStudio({hair,look,points,onHair,onLook,onClose,mode='hair'}:BeautyStudioProps) {
 const [tab,setTab]=useState<'hair'|'makeup'>(mode);
 const color=look.hairColor||naturalHair[hair];
 const selected=MAKEUP_LOOKS.find(item=>item.id===(look.makeup||'rose'))||MAKEUP_LOOKS[1];
 return <div className="beauty-studio"><Panel title={tab==='hair'?'The Dream Salon':'Glow Makeup Studio'} subtitle={`A little beauty break · ${points} style points`} onClose={onClose} variant="wardrobe">
  <div className="beauty-tabs" role="tablist" aria-label="Beauty station"><button role="tab" aria-selected={tab==='hair'} onClick={()=>setTab('hair')}><Scissors size={14}/> Hair salon</button><button role="tab" aria-selected={tab==='makeup'} onClick={()=>setTab('makeup')}><Sparkles size={14}/> Makeup station</button></div>
  <div className="beauty-intro"><div className="beauty-mirror" style={{'--beauty-hair':color,'--beauty-lip':selected.lip,'--beauty-blush':selected.blush,'--beauty-shadow':selected.shadow} as CSSProperties} aria-hidden="true"><div className="beauty-face"><i className="beauty-eye left"/><i className="beauty-eye right"/><i className="beauty-cheek left"/><i className="beauty-cheek right"/><i className="beauty-lips"/></div></div><div><span className="beauty-eyebrow">YOUR CHAIR IS READY</span><h3>{tab==='hair'?'A new mood, strand by strand':'Find your signature glow'}</h3><p>{tab==='hair'?'Choose a silhouette, then make it yours with a fresh color.':'Five complete looks, from a soft day glow to a red carpet moment.'}</p><span className="beauty-free">All beauty services are complimentary</span></div></div>
  <div className="beauty-options" role="tabpanel">
  {tab==='hair'?<><ChoiceRow title="Choose your hairstyle" items={HAIRSTYLES} activeId={hair} onSelect={id=>onHair(id as HairId)}/><section className="beauty-color-section"><h3><Palette size={13}/> Hair color</h3><div className="beauty-color-grid">{HAIR_COLORS.map(item=><button type="button" key={item.value} aria-pressed={color===item.value} onClick={()=>onLook({...look,hairColor:item.value})}><span style={{background:item.value}}>{color===item.value?<Check size={14}/>:null}</span><small>{item.label}</small></button>)}</div><button type="button" className="beauty-reset" onClick={()=>{const next={...look};delete next.hairColor;onLook(next);}}>Use this hairstyle’s original color</button></section></>:<div className="beauty-makeup-grid">{MAKEUP_LOOKS.map(item=><button type="button" key={item.id} className={selected.id===item.id?'is-selected':''} aria-pressed={selected.id===item.id} onClick={()=>onLook({...look,makeup:item.id})}><span className="makeup-palette" aria-hidden="true"><i style={{background:item.shadow}}/><i style={{background:item.blush}}/><i style={{background:item.lip}}/></span><span><strong>{item.label}</strong><small>{item.description}</small></span>{selected.id===item.id?<Check size={16}/>:null}</button>)}</div>}
  </div>
 </Panel></div>;
}
