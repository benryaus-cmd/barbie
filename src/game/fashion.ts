import type { OutfitId } from '@/game/types';
import type { BottomId, Look, TopId, WearableId } from '@/game/lifestyle-types';

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
];
export const COLORS = [
  {label:'Rose',value:'#ec4899'}, {label:'Blush',value:'#ffb3d6'},
  {label:'Pearl',value:'#fffaf3'}, {label:'Lilac',value:'#b898f0'},
  {label:'Lagoon',value:'#53dbe4'}, {label:'Denim',value:'#658fda'},
  {label:'Sunset',value:'#ff9878'}, {label:'Midnight',value:'#493355'},
  {label:'Mint',value:'#98d7ad'}, {label:'Cherry',value:'#c52e56'},
];
export const DEFAULT_LOOK:Look = {top:'glam',bottom:'gown',accessories:[],topColor:'#ec4899',bottomColor:'#ec4899'};
export function presetLook(outfit:OutfitId):Look {
  const combinations:Record<OutfitId,[TopId,BottomId,string,string]> = {
    glam:['glam','gown','#ec4899','#ec4899'], beach:['beach','wrap','#ffb3d6','#fffaf3'],
    popstar:['popstar','pleated','#fffaf3','#b898f0'],casual:['casual','shorts','#fffaf3','#658fda'],
  };
  const [top,bottom,topColor,bottomColor] = combinations[outfit];
  return {top,bottom,topColor,bottomColor,accessories:[]};
}
