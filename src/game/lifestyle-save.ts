import type { Profile } from './profile';
import type { HairId, ShoesId } from './types';
import type { Look, TopId, BottomId, WearableId, MakeupId } from './lifestyle-types';
export type SavedLook = { id:string; name:string; look:Look; hair:HairId; shoes:ShoesId };
export type LifestyleSave = { look:Look; ownedFashion:string[]; ownedColors:string[]; savedLooks:SavedLook[]; toys:string[]; petBond:number; lastPetReward:number; friends:Record<string,number>; topics:Record<string,string[]> };
export const LIFESTYLE_KEY='barbie-ultimate-dreamland:lifestyle-v2';
const tops:TopId[]=['glam','beach','popstar','casual','sunset','denim','sport','midnight'];
const bottoms:BottomId[]=['gown','wrap','pleated','shorts','palazzo','tennis','denim-skirt','satin-mini'];
const extras:WearableId[]=['tiara','sunglasses','earrings','necklace','bow','round-shades','star-shades','sunhat','beret','headband','choker','bracelets'];
const hairs:HairId[]=['blonde','pink','updo','bob','curls','braids','pixie','twin-buns','straight'];
const shoes:ShoesId[]=['heels','sneakers','boots','sandals','platforms'];
const makeup:MakeupId[]=['fresh','rose','glam','sunset','bold'];
const freeColors=['#ec4899','#ffb3d6','#fffaf3','#b898f0','#53dbe4','#658fda','#ff9878','#493355','#98d7ad','#c52e56'];
const premiumColors=['#e8c77b','#4058ef','#c25ddb','#248c73','#a51f45','#bdc9d9','#674639','#ffc28b'];
const preset={glam:['glam','gown'],beach:['beach','wrap'],popstar:['popstar','pleated'],casual:['casual','shorts']} as const;
const presetColors={glam:['#ec4899','#ec4899'],beach:['#ffb3d6','#fffaf3'],popstar:['#fffaf3','#b898f0'],casual:['#fffaf3','#658fda']} as const;
const colors=/^#[0-9a-f]{6}$/i;
export function migrateLifestyle(profile:Profile,value?:unknown):LifestyleSave {
 const p=value&&typeof value==='object'?value as Partial<LifestyleSave>:{};
 const pair=preset[profile.outfit]||preset.glam;
 const validOwned=new Set([...tops.map(x=>'top:'+x),...bottoms.map(x=>'bottom:'+x),...extras.map(x=>'accessory:'+x)]);
 const owned=[...new Set([...profile.unlocked.flatMap(x=>['top:'+preset[x][0],'bottom:'+preset[x][1]]),'accessory:tiara','accessory:sunglasses','accessory:earrings',...(Array.isArray(p.ownedFashion)?p.ownedFashion.filter(x=>validOwned.has(x)):[])])];
 const ownedColors=[...new Set([...freeColors,...(Array.isArray(p.ownedColors)?p.ownedColors.filter(x=>typeof x==='string'&&premiumColors.includes(x.toLowerCase())).map(x=>x.toLowerCase()):[])])];
 const sanitizeLook=(value:unknown):Look=>{
  const input=value&&typeof value==='object'?value as Partial<Look>:{};
  const color=(value:unknown,fallback:string)=>typeof value==='string'&&colors.test(value)&&(!premiumColors.includes(value.toLowerCase())||ownedColors.includes(value.toLowerCase()))?value:fallback;
  const look:Look={top:tops.includes(input.top)&&owned.includes('top:'+input.top)?input.top:pair[0],bottom:bottoms.includes(input.bottom)&&owned.includes('bottom:'+input.bottom)?input.bottom:pair[1],accessories:Array.isArray(input.accessories)?[...new Set(input.accessories.filter(x=>extras.includes(x)&&owned.includes('accessory:'+x)))]:profile.accessory==='none'?[]:[profile.accessory],topColor:color(input.topColor,presetColors[profile.outfit][0]),bottomColor:color(input.bottomColor,presetColors[profile.outfit][1])};
  if(typeof input.hairColor==='string'&&colors.test(input.hairColor))look.hairColor=input.hairColor;
  if(makeup.includes(input.makeup))look.makeup=input.makeup;
  if(['soft','almond','wide'].includes(input.eyeStyle))look.eyeStyle=input.eyeStyle;
  if(['smile','soft','full'].includes(input.mouthStyle))look.mouthStyle=input.mouthStyle;
  if(typeof input.eyeColor==='string'&&colors.test(input.eyeColor))look.eyeColor=input.eyeColor;
  return look;
 };
 const look=sanitizeLook(p.look);
 const setIds=new Set<string>();
 const savedLooks:SavedLook[]=(Array.isArray(p.savedLooks)?p.savedLooks:[]).filter((item):item is SavedLook=>!!item&&typeof item==='object'&&typeof item.id==='string'&&/^[a-zA-Z0-9_-]{1,60}$/.test(item.id)&&typeof item.name==='string').filter(item=>{if(setIds.has(item.id))return false;setIds.add(item.id);return true;}).slice(0,8).map(item=>({id:item.id,name:item.name.replace(/\p{Cc}/gu,'').trim().slice(0,32)||'My dream look',look:sanitizeLook(item.look),hair:hairs.includes(item.hair)?item.hair:profile.hair,shoes:shoes.includes(item.shoes)?item.shoes:profile.shoes}));
 const friends=Object.fromEntries(Object.entries(p.friends||{}).filter(([id,v])=>/^[a-z-]{1,30}$/.test(id)&&typeof v==='number'&&Number.isFinite(v)).slice(0,20).map(([id,v])=>[id,Math.min(100,Math.max(0,v))]));
 const topics=Object.fromEntries(Object.entries(p.topics||{}).filter(([id,v])=>/^[a-z-]{1,30}$/.test(id)&&Array.isArray(v)).slice(0,20).map(([id,v])=>[id,[...new Set(v.filter(x=>['meet','style','plans'].includes(x)))]]));
 return {look,ownedFashion:owned,ownedColors,savedLooks,lastPetReward:typeof p.lastPetReward==='number'&&Number.isFinite(p.lastPetReward)?Math.max(0,p.lastPetReward):0,toys:Array.isArray(p.toys)?[...new Set(p.toys.filter(x=>['ball','frisbee','treat'].includes(x)))]:[],petBond:typeof p.petBond==='number'&&Number.isFinite(p.petBond)?Math.min(100,Math.max(0,p.petBond)):0,friends,topics};
}
export function loadLifestyle(profile:Profile):LifestyleSave {try{return migrateLifestyle(profile,JSON.parse(localStorage.getItem(LIFESTYLE_KEY)||'null'))}catch{return migrateLifestyle(profile)}}
export function saveLifestyle(value:LifestyleSave){try{localStorage.setItem(LIFESTYLE_KEY,JSON.stringify(value));return true}catch{return false}}
