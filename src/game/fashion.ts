import {EXTRA_STYLE_COLORS} from './look-style.ts';
import type { HairId, OutfitId } from '@/game/types';
import type { BottomId, Look, TopId, WearableId, MakeupId } from '@/game/lifestyle-types';

export type FashionItem<T extends string> = { id:T; label:string; price:number; followers?:number; color?:string };
export const TOPS:FashionItem<TopId>[] = [
  {id:'glam',label:'Satin corset',price:0,color:'#ec4899'},
  {id:'beach',label:'Riviera bikini',price:0,color:'#ffb3d6'},
  {id:'popstar',label:'Star puff top',price:40,color:'#fffaf3'},
  {id:'casual',label:'Heart tank',price:25,color:'#fffaf3'},
  {id:'sunset',label:'Sunset halter',price:35,color:'#ff9878'},
  {id:'denim',label:'Cropped jacket',price:50,color:'#658fda'},
  {id:'sport',label:'Court polo',price:30,color:'#53dbe4'},
  {id:'midnight',label:'Velvet one shoulder',price:70,followers:100,color:'#493355'},
];
export const BOTTOMS:FashionItem<BottomId>[] = [
  {id:'gown',label:'Satin ballgown',price:0,color:'#ec4899'},
  {id:'wrap',label:'Riviera wrap',price:0,color:'#fffaf3'},
  {id:'pleated',label:'Stage pleats',price:35,color:'#b898f0'},
  {id:'shorts',label:'Denim shorts',price:20,color:'#658fda'},
  {id:'palazzo',label:'Palazzo trousers',price:50,color:'#ff9878'},
  {id:'tennis',label:'Court skirt',price:30,color:'#fffaf3'},
  {id:'denim-skirt',label:'Denim pencil',price:40,color:'#658fda'},
  {id:'satin-mini',label:'Midnight mini',price:60,followers:40,color:'#493355'},
];
export const EXTRAS:FashionItem<WearableId>[] = [
  {id:'tiara',label:'Crystal tiara',price:0,color:'#f6c35e'},
  {id:'sunglasses',label:'Cat eye shades',price:0,color:'#59355c'},
  {id:'earrings',label:'Pearl hoops',price:15,color:'#f6c35e'},
  {id:'necklace',label:'Heart pendant',price:25,color:'#f6c35e'},
  {id:'bow',label:'Silk hair bow',price:20,color:'#ffb3d6'},
  {id:'round-shades',label:'Round sun lenses',price:25,color:'#b898f0'},
  {id:'star-shades',label:'Starlet shades',price:40,color:'#53dbe4'},
  {id:'sunhat',label:'Riviera sunhat',price:45,color:'#f6d99c'},
  {id:'beret',label:'Parisian beret',price:35,color:'#ec4899'},
  {id:'headband',label:'Pearl headband',price:20,color:'#fffaf3'},
  {id:'choker',label:'Velvet choker',price:30,color:'#493355'},
  {id:'bracelets',label:'Rainbow bangles',price:25,color:'#98d7ad'},
];
export const COLORS:{label:string;value:string;price?:number}[] = [
  ...EXTRA_STYLE_COLORS,
  {label:'Rose',value:'#ec4899'}, {label:'Blush',value:'#ffb3d6'},
  {label:'Pearl',value:'#fffaf3'}, {label:'Lilac',value:'#b898f0'},
  {label:'Lagoon',value:'#53dbe4'}, {label:'Denim',value:'#658fda'},
  {label:'Sunset',value:'#ff9878'}, {label:'Midnight',value:'#493355'},
  {label:'Mint',value:'#98d7ad'}, {label:'Cherry',value:'#c52e56'},
  {label:'Champagne',value:'#e8c77b',price:30}, {label:'Electric blue',value:'#4058ef',price:35},
  {label:'Orchid',value:'#c25ddb',price:35}, {label:'Emerald',value:'#248c73',price:40},
  {label:'Ruby',value:'#a51f45',price:40}, {label:'Starlight silver',value:'#bdc9d9',price:50},
  {label:'Espresso',value:'#674639',price:30}, {label:'Peach sorbet',value:'#ffc28b',price:30},
];
export const DEFAULT_LOOK:Look = {top:'glam',bottom:'gown',accessories:[],topColor:'#ec4899',bottomColor:'#ec4899'};
export function presetLook(outfit:OutfitId,beauty?:Look):Look {
  const combinations:Record<OutfitId,[TopId,BottomId,string,string]> = {
    glam:['glam','gown','#ec4899','#ec4899'], beach:['beach','wrap','#ffb3d6','#fffaf3'],
    popstar:['popstar','pleated','#fffaf3','#b898f0'],casual:['casual','shorts','#fffaf3','#658fda'],
  };
  const [top,bottom,topColor,bottomColor] = combinations[outfit];
  return {top,bottom,topColor,bottomColor,accessories:[],...(beauty?{hairColor:beauty.hairColor,hairSecondaryColor:beauty.hairSecondaryColor,hairBlend:beauty.hairBlend,accessoryColors:beauty.accessoryColors,makeup:beauty.makeup,eyeStyle:beauty.eyeStyle,mouthStyle:beauty.mouthStyle,eyeColor:beauty.eyeColor}:{})};
}

export const HAIRSTYLES:{id:HairId;label:string;emoji:string}[] = [
 {id:'blonde',label:'Golden waves',emoji:'✨'}, {id:'pink',label:'Bubble pony',emoji:'🎀'},
 {id:'updo',label:'Chic updo',emoji:'💎'}, {id:'bob',label:'Glossy bob',emoji:'✂️'},
 {id:'curls',label:'Soft curls',emoji:'🌀'}, {id:'braids',label:'Twin braids',emoji:'🎀'},
 {id:'pixie',label:'Feathered pixie',emoji:'✂️'}, {id:'twin-buns',label:'Space buns',emoji:'🪐'},
 {id:'straight',label:'Silk cascade',emoji:'✨'},
];
export const HAIR_COLORS = [
 {label:'Jet black',value:'#14131e'},{label:'Snow white',value:'#ffffff'},{label:'Cobalt',value:'#4058ef'},{label:'Crimson',value:'#be2145'},{label:'Lime',value:'#a9dc61'},{label:'Hot pink',value:'#ed278e'},{label:'Periwinkle',value:'#8b9dee'},{label:'Silver',value:'#b9c7d6'},
 {label:'Golden blonde',value:'#eec86b'}, {label:'Espresso',value:'#412a39'},
 {label:'Chestnut',value:'#69412f'}, {label:'Copper',value:'#b86c43'},
 {label:'Bubblegum',value:'#f378b7'}, {label:'Lavender',value:'#b69ae4'},
 {label:'Platinum',value:'#f5ecce'}, {label:'Ocean teal',value:'#388c94'},
];
export const MAKEUP_LOOKS:{id:MakeupId;label:string;lip:string;blush:string;shadow:string;description:string}[] = [
 {id:'fresh',label:'Fresh glow',lip:'#e87994',blush:'#f4b4a7',shadow:'#e5b9ac',description:'Soft peach cheeks · natural lip'},
 {id:'rose',label:'Rosy romantic',lip:'#e84a82',blush:'#f39bb3',shadow:'#c98cab',description:'Petal pink eyes · rose gloss'},
 {id:'glam',label:'Party shimmer',lip:'#c63676',blush:'#e68dab',shadow:'#b79bea',description:'Lilac shimmer · berry gloss'},
 {id:'sunset',label:'Golden hour',lip:'#db7255',blush:'#f0a278',shadow:'#d9a35f',description:'Warm gold eyes · coral lip'},
 {id:'bold',label:'Red carpet',lip:'#ae254f',blush:'#df8f9b',shadow:'#79638f',description:'Smoky plum eyes · cherry lip'},
];

export const EYE_STYLES = [{id:'soft',label:'Soft sparkle'},{id:'almond',label:'Almond flick'},{id:'wide',label:'Bright eyes'}] as const;
export const MOUTH_STYLES = [{id:'smile',label:'Easy smile'},{id:'soft',label:'Petal lips'},{id:'full',label:'Cupid gloss'}] as const;
export const EYE_COLORS = [{label:'Lagoon',value:'#278eae'},{label:'Hazel',value:'#827246'},{label:'Cocoa',value:'#765438'},{label:'Jade',value:'#4b896c'},{label:'Violet',value:'#8671af'},{label:'Slate',value:'#617c92'}];
