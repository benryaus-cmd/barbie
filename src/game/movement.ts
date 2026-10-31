/** Hold a world heading while the stick is steady; deliberately changing its
 * angle reanchors it to the view. The camera alone cannot curve a held walk. */
export function createSteering() {
 let basis:number|null=null,anchor=0;
 return {
  reset(){basis=null;},
  direction(x:number,y:number,yaw:number){
   const magnitude=Math.hypot(x,y);
   if(!Number.isFinite(magnitude)||magnitude<=.12){basis=null;return {x:0,z:0,follow:false};}
   const angle=Math.atan2(x,y);
   const change=Math.atan2(Math.sin(angle-anchor),Math.cos(angle-anchor));
   if(basis===null||Math.abs(change)>.18){basis=yaw;anchor=angle;}
   const scale=Math.max(1,magnitude);
   return {x:(Math.cos(basis)*x-Math.sin(basis)*y)/scale,z:(-Math.sin(basis)*x-Math.cos(basis)*y)/scale,follow:true};
  },
 };
}
