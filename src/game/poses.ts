import type { PoseId } from './lifestyle-types';

/** Shared choices keep player, friend and saved-photo poses in agreement. */
export const PHOTO_POSES: { id:PoseId; label:string; symbol:string }[] = [
  {id:'wave',label:'Wave',symbol:'↗'}, {id:'peace',label:'Peace',symbol:'V'},
  {id:'heart',label:'Heart',symbol:'♡'}, {id:'kiss',label:'Kiss',symbol:'✧'},
  {id:'salute',label:'Salute',symbol:'⌁'}, {id:'curtsy',label:'Curtsy',symbol:'⋈'},
  {id:'jump',label:'Jump',symbol:'↑'}, {id:'dance',label:'Dance',symbol:'♪'},
  {id:'confident',label:'Confident',symbol:'♛'}, {id:'look-back',label:'Over shoulder',symbol:'⤾'},
  {id:'cheer',label:'Cheer',symbol:'★'}, {id:'shy',label:'Sweet',symbol:'❀'},
  {id:'point',label:'Over there',symbol:'☞'}, {id:'stretch',label:'Stretch',symbol:'⌒'},
];
