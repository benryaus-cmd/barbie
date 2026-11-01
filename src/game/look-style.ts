import type { Look, WearableId, FabricFinish, FabricPattern } from './lifestyle-types';

export const FINISHES:{id:FabricFinish;label:string}[]=[{id:'original',label:'Original'},{id:'matte',label:'Soft matte'},{id:'satin',label:'Satin'},{id:'gloss',label:'Gloss'},{id:'metallic',label:'Metallic'},{id:'glitter',label:'Sparkle'}];
export const PATTERNS:{id:FabricPattern;label:string}[]=[{id:'solid',label:'Solid'},{id:'stripes',label:'Stripes'},{id:'dots',label:'Polka dots'},{id:'gingham',label:'Gingham'},{id:'stars',label:'Stars'},{id:'floral',label:'Petals'}];
export const EXTRA_STYLE_COLORS=[{label:'Ink',value:'#17131f'},{label:'Pure white',value:'#ffffff'},{label:'Sky blue',value:'#8bd7ff'},{label:'Sunflower',value:'#ffda4f'},{label:'Tangerine',value:'#f47d35'},{label:'Forest',value:'#36765b'},{label:'Grape',value:'#734baf'},{label:'Ice lilac',value:'#d6b6ff'}];
const extras:WearableId[]=['tiara','sunglasses','earrings','necklace','bow','round-shades','star-shades','sunhat','beret','headband','choker','bracelets'];
const hex=(v:unknown):v is string=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
/** Shared optional fields: absent/default values never rewrite legacy look identities. */
export function readLookStyle(input:unknown,allowed:(color:string)=>boolean=()=>true):Partial<Look>{
 if(!input||typeof input!=='object')return{};
 const v=input as Record<string,unknown>,out:Partial<Look>={};
 for(const key of ['topFinish','bottomFinish'] as const)if(FINISHES.some(x=>x.id===v[key]))out[key]=v[key] as FabricFinish;
 for(const key of ['topPattern','bottomPattern'] as const)if(PATTERNS.some(x=>x.id===v[key]))out[key]=v[key] as FabricPattern;
 for(const key of ['topAccent','bottomAccent'] as const)if(hex(v[key])&&allowed(v[key].toLowerCase()))out[key]=v[key].toLowerCase();
 if(hex(v.hairSecondaryColor))out.hairSecondaryColor=v.hairSecondaryColor.toLowerCase();
 if(['streaks','ombre','split'].includes(String(v.hairBlend)))out.hairBlend=v.hairBlend as Look['hairBlend'];
 if(v.accessoryColors&&typeof v.accessoryColors==='object'&&!Array.isArray(v.accessoryColors)){
  const colors:Partial<Record<WearableId,string>>={};
  for(const id of extras){const color=(v.accessoryColors as Record<string,unknown>)[id];if(hex(color)&&allowed(color.toLowerCase()))colors[id]=color.toLowerCase();}
  if(Object.keys(colors).length)out.accessoryColors=colors;
 }
 return out;
}
/** Only visible customisation extends signatures; old photo reward ledgers stay valid. */
export function lookStyleIdentity(look:Look):unknown[]|null{
 const v=readLookStyle(look),parts:unknown[]=[];
 for(const slot of ['top','bottom'] as const){const finish=v[`${slot}Finish`],pattern=v[`${slot}Pattern`];if(finish&&finish!=='original')parts.push(slot,'finish',finish);if(pattern&&pattern!=='solid')parts.push(slot,'print',pattern,v[`${slot}Accent`]||'#fffaf3');}
 const colors=Object.entries(v.accessoryColors||{}).filter(([id])=>look.accessories.includes(id as WearableId)).sort(([a],[b])=>a.localeCompare(b));
 if(colors.length)parts.push('extras',colors);
 if(v.hairSecondaryColor&&v.hairSecondaryColor!==look.hairColor?.toLowerCase())parts.push('hair2',v.hairSecondaryColor,v.hairBlend||'streaks');
 return parts.length?parts:null;
}
