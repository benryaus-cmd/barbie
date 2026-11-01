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
  {id:'chin-frame',label:'Chin frame',symbol:'❀'}, {id:'hair-touch',label:'Hair touch',symbol:'⌁'},
  {id:'crossed-arms',label:'Folded arms',symbol:'⋈'}, {id:'leg-pop',label:'Leg pop',symbol:'⌁'},
  {id:'kneel',label:'Kneel',symbol:'◇'}, {id:'side-sit',label:'Side sit',symbol:'◡'},
];

export const PAIR_POSES: { id:PoseId; label:string; symbol:string }[] = [
  {id:'hug',label:'Hug',symbol:'♡'}, {id:'arm-around',label:'Arm around',symbol:'⌒'},
  {id:'half-heart',label:'Half heart',symbol:'♡'}, {id:'back-to-back',label:'Back to back',symbol:'⋈'},
  {id:'linked-arms',label:'Linked arms',symbol:'∞'}, {id:'high-five',label:'High five',symbol:'✋'},
  {id:'shoulder-lean',label:'Shoulder lean',symbol:'❀'}, {id:'editorial',label:'Editorial',symbol:'✧'},
];

type PairLayout = {spacing:number;depth:number;playerYaw:number;friendYaw:number;mirror:boolean;playerPose:PoseId;friendPose:PoseId};
const pairLayouts: Record<string,PairLayout> = {
  hug:{spacing:.62,depth:-.04,playerYaw:-Math.PI/2,friendYaw:Math.PI/2,mirror:false,playerPose:'hug',friendPose:'hug'},
  'arm-around':{spacing:.62,depth:-.04,playerYaw:0,friendYaw:-.1,mirror:true,playerPose:'arm-around',friendPose:'arm-around'},
  'half-heart':{spacing:.62,depth:-.04,playerYaw:0,friendYaw:-.1,mirror:true,playerPose:'half-heart',friendPose:'half-heart'},
  'back-to-back':{spacing:.38,depth:0,playerYaw:Math.PI/2,friendYaw:-Math.PI/2,mirror:false,playerPose:'back-to-back',friendPose:'back-to-back'},
  'linked-arms':{spacing:.57,depth:0,playerYaw:0,friendYaw:0,mirror:true,playerPose:'linked-arms',friendPose:'linked-arms'},
  'high-five':{spacing:.66,depth:0,playerYaw:0,friendYaw:0,mirror:true,playerPose:'high-five',friendPose:'high-five'},
  'shoulder-lean':{spacing:.50,depth:0,playerYaw:0,friendYaw:.08,mirror:false,playerPose:'arm-around',friendPose:'shoulder-lean'},
  editorial:{spacing:.69,depth:.08,playerYaw:.22,friendYaw:-.22,mirror:false,playerPose:'editorial',friendPose:'hair-touch'},
};
/** Friend is on the player's negative local X. Return a copy so callers cannot
 * accidentally alter a later photo's composition. Unknown saved IDs are inert. */
export function getPairLayout(pair:string|null):PairLayout|null {
  return pair && Object.prototype.hasOwnProperty.call(pairLayouts,pair) ? {...pairLayouts[pair]} : null;
}

/** Shared thigh/shin paths keep floor poses and their skirt drapes in agreement.
 * Directions are in pelvis space; the soles and knee skin rest above y=0. */
export const FLOOR_POSE_SUPPORT = {
  kneel:{pelvisY:.47,thigh:[0,-.8352941176,.5498031733],shin:[0,0,-1]},
  'side-sit':{pelvisY:.15,thigh:[.56,-.13,.8182297953],shin:[.78,.05,-.6237788062]},
} as const;
