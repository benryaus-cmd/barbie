import type { Profile } from './profile';
import type { Look, TopId, BottomId, WearableId } from './lifestyle-types';
export type LifestyleSave = { look:Look; ownedFashion:string[]; toys:string[]; petBond:number; lastPetReward:number; friends:Record<string,number>; topics:Record<string,string[]> };
export const LIFESTYLE_KEY='barbie-ultimate-dreamland:lifestyle-v2';
const tops:TopId[]=['glam','beach','popstar','casual','sunset','denim','sport','midnight'];
const bottoms:BottomId[]=['gown','wrap','pleated','shorts','palazzo','tennis','denim-skirt','satin-mini'];
const extras:WearableId[]=['tiara','sunglasses','earrings','necklace','bow'];
const preset={glam:['glam','gown'],beach:['beach','wrap'],popstar:['popstar','pleated'],casual:['casual','shorts']} as const;
const presetColors={glam:['#ec4899','#ec4899'],beach:['#ffb3d6','#fffaf3'],popstar:['#fffaf3','#b898f0'],casual:['#fffaf3','#658fda']} as const;
const colors=/^#[0-9a-f]{6}$/i;
export function migrateLifestyle(profile:Profile,value?:unknown):LifestyleSave {
 const p=value&&typeof value==='object'?value as Partial<LifestyleSave>:{};
 const pair=preset[profile.outfit]||preset.glam;
 const validOwned=new Set([...tops.map(x=>'top:'+x),...bottoms.map(x=>'bottom:'+x),...extras.map(x=>'accessory:'+x)]);
 const owned=[...new Set([...profile.unlocked.flatMap(x=>['top:'+preset[x][0],'bottom:'+preset[x][1]]),'accessory:tiara','accessory:sunglasses','accessory:earrings',...(Array.isArray(p.ownedFashion)?p.ownedFashion.filter(x=>validOwned.has(x)):[])])];
 const input=p.look&&typeof p.look==='object'?p.look:{} as Partial<Look>;
 const look:Look={top:tops.includes(input.top)&&owned.includes('top:'+input.top)?input.top:pair[0],bottom:bottoms.includes(input.bottom)&&owned.includes('bottom:'+input.bottom)?input.bottom:pair[1],accessories:Array.isArray(input.accessories)?[...new Set(input.accessories.filter(x=>extras.includes(x)&&owned.includes('accessory:'+x)))]:profile.accessory==='none'?[]:[profile.accessory],topColor:colors.test(input.topColor||'')?input.topColor:presetColors[profile.outfit][0],bottomColor:colors.test(input.bottomColor||'')?input.bottomColor:presetColors[profile.outfit][1]};
 const friends=Object.fromEntries(Object.entries(p.friends||{}).filter(([id,v])=>/^[a-z-]{1,30}$/.test(id)&&typeof v==='number'&&Number.isFinite(v)).slice(0,20).map(([id,v])=>[id,Math.min(100,Math.max(0,v))]));
 const topics=Object.fromEntries(Object.entries(p.topics||{}).filter(([id,v])=>/^[a-z-]{1,30}$/.test(id)&&Array.isArray(v)).slice(0,20).map(([id,v])=>[id,[...new Set(v.filter(x=>['meet','style','plans'].includes(x)))]]));
 return {look,ownedFashion:owned,lastPetReward:typeof p.lastPetReward==='number'&&Number.isFinite(p.lastPetReward)?Math.max(0,p.lastPetReward):0,toys:Array.isArray(p.toys)?[...new Set(p.toys.filter(x=>['ball','frisbee','treat'].includes(x)))]:[],petBond:typeof p.petBond==='number'&&Number.isFinite(p.petBond)?Math.min(100,Math.max(0,p.petBond)):0,friends,topics};
}
export function loadLifestyle(profile:Profile):LifestyleSave {try{return migrateLifestyle(profile,JSON.parse(localStorage.getItem(LIFESTYLE_KEY)||'null'))}catch{return migrateLifestyle(profile)}}
export function saveLifestyle(value:LifestyleSave){try{localStorage.setItem(LIFESTYLE_KEY,JSON.stringify(value));return true}catch{return false}}
