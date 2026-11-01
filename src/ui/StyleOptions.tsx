import {Check,LockKeyhole} from 'lucide-react';
import type {Look,WearableId} from '@/game/lifestyle-types';
import {COLORS,EXTRAS} from '@/game/fashion';
import {FINISHES,PATTERNS} from '@/game/look-style';

type Props={look:Look;onLook:(look:Look)=>void;ownedColors:string[];onBuyColor?:(color:string)=>void};
export function StyleColors({label,value,onChange,ownedColors,onBuyColor}:{label:string;value:string;onChange:(color:string)=>void;ownedColors:string[];onBuyColor?:(color:string)=>void}){
 return <div className="fashion-color-row" role="group" aria-label={label}>{COLORS.map(c=>{const owned=!c.price||ownedColors.includes(c.value),active=value.toLowerCase()===c.value;return <button type="button" key={c.value} aria-label={`${c.label} ${label}${owned?'':`, ${c.price} points to unlock`}`} aria-pressed={active} className={owned?'':'color-locked'} style={{background:c.value}} onClick={()=>owned?onChange(c.value):onBuyColor?.(c.value)}>{active?<Check size={14}/>:!owned?<LockKeyhole size={10}/>:null}</button>;})}</div>;
}
export function FabricOptions({look,onLook,ownedColors,onBuyColor,slot}:{slot:'top'|'bottom'}&Props){
 const finish=look[`${slot}Finish`]||'original',pattern=look[`${slot}Pattern`]||'solid';
 return <section className="fashion-customize" aria-label={`${slot} fabric studio`}>
  <h3>Fabric finish</h3><div className="style-option-row">{FINISHES.map(item=><button type="button" key={item.id} aria-label={`${slot} finish: ${item.label}`} aria-pressed={finish===item.id} onClick={()=>onLook({...look,[`${slot}Finish`]:item.id})}>{item.label}</button>)}</div>
  <h3>Print studio</h3><div className="style-option-row">{PATTERNS.map(item=><button type="button" key={item.id} className={`print-choice print-${item.id}`} aria-label={`${slot} print: ${item.label}`} aria-pressed={pattern===item.id} onClick={()=>onLook({...look,[`${slot}Pattern`]:item.id})}><i aria-hidden="true"/>{item.label}</button>)}</div>
  {pattern!=='solid'?<><h3>Print colour</h3><StyleColors label={`${slot} print color`} value={look[`${slot}Accent`]||'#fffaf3'} onChange={color=>onLook({...look,[`${slot}Accent`]:color})} ownedColors={ownedColors} onBuyColor={onBuyColor}/></>:null}
 </section>;
}
export function AccessoryColors({look,onLook,ownedColors,onBuyColor,target,onTarget}:{target:WearableId;onTarget:(id:WearableId)=>void}&Props){
 const item=EXTRAS.find(x=>x.id===target)!;
 return <section className="fashion-customize" aria-label="Accessory colour studio"><h3>Colour your extras</h3><div className="style-option-row style-extra-targets">{EXTRAS.map(item=><button key={item.id} type="button" aria-label={`Colour ${item.label}`} aria-pressed={target===item.id} onClick={()=>onTarget(item.id)}>{item.label}</button>)}</div><p className="fashion-tip">{item.label} · frame / fabric / metal colour</p><StyleColors label={`${target} color`} value={look.accessoryColors?.[target]||item.color||'#f6c35e'} ownedColors={ownedColors} onBuyColor={onBuyColor} onChange={color=>onLook({...look,accessoryColors:{...look.accessoryColors,[target]:color}})}/><button className="style-reset" type="button" onClick={()=>{const colors={...look.accessoryColors};delete colors[target];onLook({...look,accessoryColors:colors});}}>Restore original {item.label.toLowerCase()} colour</button></section>;
}
