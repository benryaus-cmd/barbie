import { useState } from 'react';
import { Check, Crown, Footprints, Glasses, Heart, LockKeyhole, Scissors, Shirt, Sparkles } from 'lucide-react';
import type { AccessoryId, HairId, OutfitId, ShoesId } from '@/game/types';
import type { Look } from '@/game/lifestyle-types';
import { BOTTOMS, COLORS, EXTRAS, TOPS } from '@/game/fashion';
import { ChoiceRow, Panel } from '@/ui/Panel';
import './fashion.css';

type WardrobeSheetProps = {
  title:string; outfit:OutfitId; hair:HairId; accessory:AccessoryId; shoes:ShoesId;
  unlocked:OutfitId[]; points:number; notice:string|null;
  onOutfit:(id:OutfitId)=>void; onHair:(id:HairId)=>void;
  onAccessory:(id:AccessoryId)=>void; onShoes:(id:ShoesId)=>void; onClose:()=>void;
  look:Look; ownedFashion:string[]; followers:number;
  onFashion:(slot:'top'|'bottom'|'accessory',id:string)=>void;
  onColor:(slot:'top'|'bottom',color:string)=>void;
};
const OUTFITS = [
  {id:'glam',label:'Glam Party',emoji:'👗',price:0},
  {id:'beach',label:'Beach Day',emoji:'🩱',price:0},
  {id:'popstar',label:'Popstar',emoji:'🎤',price:40},
  {id:'casual',label:'Designer',emoji:'🕶️',price:25},
];
const HAIRS = [
  {id:'blonde',label:'Golden waves',emoji:'👱‍♀️'}, {id:'pink',label:'Bubble pony',emoji:'🎀'},
  {id:'updo',label:'Chic updo',emoji:'💇‍♀️'}, {id:'bob',label:'Glossy bob',emoji:'💇‍♀️'},
  {id:'curls',label:'Copper curls',emoji:'💇‍♀️'},
];
const SHOES = [
  {id:'heels',label:'Pink heels',emoji:'👠'}, {id:'sneakers',label:'Sneakers',emoji:'👟'},
  {id:'boots',label:'Gold boots',emoji:'🥾'}, {id:'sandals',label:'Gold sandals',emoji:'🩴'},
  {id:'platforms',label:'Lilac platforms',emoji:'👡'},
];
const CATEGORIES=['Tops','Bottoms','Extras','Hair','Shoes','Sets'] as const;
export function WardrobeSheet({title,outfit,hair,shoes,unlocked,points,notice,onOutfit,onHair,onShoes,onClose,look,ownedFashion,followers,onFashion,onColor}:WardrobeSheetProps) {
  const [category,setCategory]=useState<typeof CATEGORIES[number]>('Tops');
  const slot=category==='Tops'?'top':category==='Bottoms'?'bottom':'accessory';
  const catalog=slot==='top'?TOPS:slot==='bottom'?BOTTOMS:EXTRAS;
  return <Panel title={title} subtitle={`${points} style points · ${followers} followers`} onClose={onClose} variant="wardrobe">
    <div className="wardrobe-tabs fashion-tabs" role="tablist" aria-label="Style category">
      {CATEGORIES.map(item=><button key={item} type="button" role="tab" aria-selected={category===item} aria-controls="wardrobe-options" id={`wardrobe-tab-${item}`} onClick={()=>setCategory(item)}>{item}</button>)}
    </div>
    {notice?<p className="wardrobe-notice" role="status">{notice}</p>:null}
    <div id="wardrobe-options" className="fashion-options" role="tabpanel" aria-labelledby={`wardrobe-tab-${category}`}>
      {category==='Tops'||category==='Bottoms'||category==='Extras'?<>
        <div className="fashion-section-heading"><h3>{category==='Extras'?'Layer your finishing touches':`Mix & match ${category.toLowerCase()}`}</h3><span>{category==='Extras'?'Wear any together':'8 silhouettes'}</span></div>
        <div className="fashion-grid">
          {catalog.map(item=>{
            const owned=item.price===0||ownedFashion.includes(`${slot}:${item.id}`);
            const active=slot==='top'?look.top===item.id:slot==='bottom'?look.bottom===item.id:look.accessories.some(id=>id===item.id);
            const eligible=followers>=(item.followers??0);
            const affordable=points>=item.price;
            const Icon=item.id==='tiara'?Crown:item.id==='sunglasses'?Glasses:item.id==='necklace'?Heart:slot==='accessory'?Sparkles:Shirt;
            const status=owned?(active?'Wearing':'Owned'):!eligible?`${item.followers} followers needed`:`${item.price} pts${affordable?' · Unlock':' · Save up'}`;
            return <button key={item.id} type="button" className={`fashion-card ${active?'is-wearing':''} ${owned?'':'is-locked'}`} aria-pressed={active} aria-label={`${item.label}, ${status}${owned||eligible?'':`, ${item.price} points`}`} onClick={()=>onFashion(slot,item.id)}>
              <span className={`fashion-swatch fashion-swatch-${slot} fashion-swatch-${item.id}`} style={{backgroundColor:item.color}} aria-hidden="true"><Icon size={23} strokeWidth={1.5}/>{active?<span className="fashion-check"><Check size={10}/></span>:null}</span>
              <span className="fashion-item-copy"><strong>{item.label}</strong><small>{!owned?<LockKeyhole size={10}/>:active?<Check size={10}/>:null}{status}</small>{!owned&&!!item.followers&&eligible?<small>{item.followers} followers ✓</small>:null}</span>
            </button>;
          })}
        </div>
        {slot==='top'||slot==='bottom'?<section className="fashion-colors" aria-label={`${category} color`}><div className="fashion-section-heading"><h3>{category==='Tops'?'Top':'Bottom'} color</h3><span>Free · independent</span></div><div className="fashion-color-row">{COLORS.map(color=><button key={color.value} type="button" title={color.label} aria-label={`${color.label} ${slot} color`} aria-pressed={look[slot==='top'?'topColor':'bottomColor'].toLowerCase()===color.value.toLowerCase()} onClick={()=>onColor(slot,color.value)} style={{backgroundColor:color.value}}>{look[slot==='top'?'topColor':'bottomColor'].toLowerCase()===color.value.toLowerCase()?<Check size={15}/>:null}</button>)}</div></section>:<p className="fashion-tip">Tap an extra to put it on or take it off. Tiara, shades, jewelry and bow can all be worn together.</p>}
      </>:null}
      {category==='Sets'?<><ChoiceRow title="Complete looks · choose then customize" items={OUTFITS} activeId={outfit} unlockedIds={unlocked} points={points} onSelect={id=>onOutfit(id as OutfitId)}/><p className="fashion-tip">A set changes your top and bottom together. Open Tops or Bottoms to make the look your own.</p></>:null}
      {category==='Hair'?<div className="fashion-basics"><h3><Scissors size={14}/> A fresh point of view</h3><ChoiceRow title="Five signature hairstyles" items={HAIRS} activeId={hair} onSelect={id=>onHair(id as HairId)}/></div>:null}
      {category==='Shoes'?<div className="fashion-basics"><h3><Footprints size={14}/> A perfect pair</h3><ChoiceRow title="From beach strolls to the runway" items={SHOES} activeId={shoes} onSelect={id=>onShoes(id as ShoesId)}/></div>:null}
    </div>
  </Panel>;
}
