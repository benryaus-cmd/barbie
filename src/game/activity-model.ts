/** Deterministic activity rules. Rendering and input devices cannot award points directly. */
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export const normalizedInput = (value: number) => Number.isFinite(value) ? clamp(value, -1, 1) : 0;
export const SURF_DURATION = 30;
export const POUR_TARGETS = [.64, .79, .55];
export type CourseItem = { kind: 'ring' | 'obstacle'; x: number; distance: number; passed: boolean };
export class SurfSession {
 elapsed = 0; distance = 0; x = 0; heading = 0; balance = 1; score = 0; combo = 0; wipeout = 0; finished = false;
 feedback = 'Steer through golden rings · dodge coral buoys';
 private feedbackTime = 0;
 items: CourseItem[] = Array.from({length: 26}, (_,i) => ({kind:i%4===2?'obstacle':'ring',x:[0,-2.8,2.8,0,2.8,-2.8][i%6],distance:18+i*9,passed:false}));
 update(dt: number, value = 0) {
  if (this.finished) return;
  dt = Math.min(.1, Math.max(0, Number.isFinite(dt)?dt:0));
  const input=normalizedInput(value), remaining=SURF_DURATION-this.elapsed;
  dt=Math.min(dt,remaining);this.elapsed+=dt;this.distance+=dt*8.5;
  this.wipeout=Math.max(0,this.wipeout-dt);this.feedbackTime=Math.max(0,this.feedbackTime-dt);
  const steering=this.wipeout>0?0:input;
  this.heading+=(steering*.55-this.heading)*Math.min(1,dt*5);
  this.x=clamp(this.x+Math.sin(this.heading)*dt*6,-4.25,4.25);
  const strained=Math.abs(this.x)>3.8 || Math.abs(this.heading)>.49;
  this.balance=clamp(this.balance+dt*(strained?-.44:.32),0,1);
  if(this.balance<=0 && this.wipeout===0) this.crash('Lost balance! Ease off to recover');
  for(const item of this.items) if(!item.passed && this.distance>=item.distance){
   item.passed=true;
   const hit=Math.abs(this.x-item.x)<(item.kind==='ring'?1.04:.88);
   if(item.kind==='obstacle' && hit && this.wipeout===0) this.crash('Wipeout! Watch the coral buoys');
   if(item.kind==='ring' && hit && this.wipeout===0){
    this.combo++;const gain=10+Math.min(4,this.combo-1)*5;this.score+=gain;
    this.feedback=`${this.combo>1?`${this.combo} ring combo!`:'Clean carve!'} +${gain}`;this.feedbackTime=1.7;
   }else if(item.kind==='ring' && !hit){this.combo=0; if(this.feedbackTime===0)this.feedback='Missed ring · line up the next one';}
  }
  if(this.feedbackTime===0 && this.wipeout===0) this.feedback=strained?'Balance low · release steering briefly':'Catch the rings · carve away from coral';
  if(this.elapsed>=SURF_DURATION-.00001){this.finished=true;this.elapsed=SURF_DURATION;this.feedback='Ride complete! Your style points are ready';}
 }
 private crash(message:string){this.wipeout=1.25;this.combo=0;this.balance=.65;this.feedback=message;this.feedbackTime=2;}
}

export function judgePour(fill: number, target: number): {score:number; feedback:string} {
 if(fill>1) return {score:0,feedback:'Overflow! A lighter touch next time'};
 const error=Math.abs(fill-target);
 if(error<=.025) return {score:100,feedback:'Perfect pour! +100'};
 if(error<=.065) return {score:85,feedback:'Beautiful pour! +85'};
 const score=Math.max(0,Math.round(75*(1-error/.36)));
 return {score,feedback:`${fill<target?'A little short':'A little too full'} · +${score}`};
}
export class PourSession {
 round=1;fill=0;score=0;combo=0;elapsed=0;pouring=false;finished=false;pause=0;
 feedback='Hold to pour · release at the gold band';
 get target(){return POUR_TARGETS[this.round-1];}
 get timeLeft(){return this.finished?0:Math.max(0,12-this.elapsed);}
 setPouring(on:boolean){
  if(this.finished||this.pause>0){this.pouring=false;return;}
  if(!on && this.pouring && this.fill>.015){this.pouring=false;this.judge();return;}
  this.pouring=on;
 }
 update(dt:number){
  if(this.finished)return;dt=Math.min(.1,Math.max(0,Number.isFinite(dt)?dt:0));
  if(this.pause>0){this.pause=Math.max(0,this.pause-dt);if(this.pause===0){this.round++;this.fill=0;this.elapsed=0;this.feedback='Next glass! Release at the gold band';}return;}
  this.elapsed+=dt;
  if(this.pouring) this.fill+=dt*(.35+(this.round-1)*.025);
  if(this.fill>1.02){this.fill=1.03;this.pouring=false;this.judge();}
  else if(this.elapsed>=12){this.pouring=false;this.judge(true);}
 }
 private judge(timedOut=false){
  const result=timedOut?{score:0,feedback:'Time up · next glass'}:judgePour(this.fill,this.target);
  this.score+=result.score;this.combo=result.score>=85?this.combo+1:0;this.feedback=result.feedback;
  if(this.round===3){this.finished=true;this.pouring=false;this.feedback=`Three glasses served! ${this.score} precision points`;}
  else this.pause=1.4;
 }
}

/** Session rewards are deliberately separate from precision/style scores. */
export function activityReward(kind: 'surf' | 'pour' | 'netball', score: number): number {
 const safe = Number.isFinite(score) ? Math.max(0, score) : 0;
 if (kind === 'pour') return Math.min(30, Math.round(safe / 10));
 if (kind === 'surf') return Math.min(45, Math.round(safe / 10));
 return Math.min(50, Math.round(safe));
}
export const NETBALL_SHOTS = 5;
export const NETBALL_CHARGE_TARGET = .64;
export const NETBALL_HOOP = {x:0, y:3.05, z:-4.5};
export const NETBALL_BALL_RADIUS = .13;
export const NETBALL_RING_RADIUS = .34;
const NETBALL_GRAVITY=8.8,NETBALL_RELEASE_Y=2.3,NETBALL_RELEASE_Z=3.2,NETBALL_FLIGHT_TIME=1.1;
function netballVelocity(playerX:number,aim:number,charge:number){
 const endY=NETBALL_HOOP.y+(charge-NETBALL_CHARGE_TARGET)*1.65;
 return {x:(aim*3-playerX)/NETBALL_FLIGHT_TIME,y:(endY-NETBALL_RELEASE_Y+NETBALL_GRAVITY*NETBALL_FLIGHT_TIME**2/2)/NETBALL_FLIGHT_TIME,z:(NETBALL_HOOP.z-NETBALL_RELEASE_Z)/NETBALL_FLIGHT_TIME};
}
/** The aiming guide, moving ball and ring judge all use the same launch. */
export function netballTrajectory(playerX:number,aim:number,charge:number,time:number){
 const velocity=netballVelocity(playerX,aim,charge);
 return {x:playerX+velocity.x*time,y:NETBALL_RELEASE_Y+velocity.y*time-NETBALL_GRAVITY*time*time/2,z:NETBALL_RELEASE_Z+velocity.z*time};
}
export function netballRimCrossing(playerX:number,aim:number,charge:number){
 const velocity=netballVelocity(playerX,aim,charge);
 const discriminant=velocity.y**2-2*NETBALL_GRAVITY*(NETBALL_HOOP.y-NETBALL_RELEASE_Y);
 if(discriminant<0)return {time:NETBALL_FLIGHT_TIME,x:Infinity,z:Infinity,made:false};
 const time=(velocity.y+Math.sqrt(discriminant))/NETBALL_GRAVITY;
 const point=netballTrajectory(playerX,aim,charge,time);
 return {time,x:point.x,z:point.z,made:Math.hypot(point.x-NETBALL_HOOP.x,point.z-NETBALL_HOOP.z)<=NETBALL_RING_RADIUS-NETBALL_BALL_RADIUS};
}
export class NetballSession {
 round=1; score=0; combo=0; aim=.28; charge=0; charging=false; elapsed=0; finished=false;
 phase: 'aim' | 'flight' | 'pause' = 'aim'; shotTime=0; lastScored=false;
 feedback='Aim left or right · hold to charge · release in the gold zone';
 private shotAim=0; private shotCharge=0; private judged=false; private pause=0;
 get playerX(){return [-1.9,1.9,-2.7,2.7,0][Math.min(4,this.round-1)];}
 get timeLeft(){return this.finished?0:Math.max(0,18-this.elapsed);}
 get ballPosition(){
  if(this.phase==='aim')return {x:this.playerX+.23,y:2.12+this.charge*.26,z:3.2};
  const crossing=netballRimCrossing(this.playerX,this.shotAim,this.shotCharge);
  const velocity=netballVelocity(this.playerX,this.shotAim,this.shotCharge);
  const caught=this.lastScored&&this.shotTime>=crossing.time;
  const origin=caught?{x:crossing.x,y:NETBALL_HOOP.y,z:crossing.z}:{x:this.playerX,y:NETBALL_RELEASE_Y,z:NETBALL_RELEASE_Z};
  const elapsed=caught?this.shotTime-crossing.time:this.shotTime;
  const vy=caught?velocity.y-NETBALL_GRAVITY*crossing.time:velocity.y;
  const groundTime=(vy+Math.sqrt(vy*vy+2*NETBALL_GRAVITY*(origin.y-NETBALL_BALL_RADIUS)))/NETBALL_GRAVITY;
  const afterGround=Math.max(0,elapsed-groundTime);
  const travel=Math.min(elapsed,groundTime)+afterGround*.35;
  const y=elapsed<=groundTime?origin.y+vy*elapsed-NETBALL_GRAVITY*elapsed*elapsed/2:NETBALL_BALL_RADIUS+Math.max(0,-(vy-NETBALL_GRAVITY*groundTime)*.38*afterGround-NETBALL_GRAVITY*afterGround*afterGround/2);
  return {x:origin.x+velocity.x*(caught?.035:1)*travel,y,z:origin.z+(caught?.35:velocity.z)*travel};
 }
 setCharging(on:boolean){
  if(this.finished||this.phase!=='aim'){this.charging=false;return;}
  if(!on&&this.charging){this.charging=false;this.shoot();return;}
  this.charging=on;
 }
 /** Cancel input on focus loss without accidentally releasing a shot. */
 cancelCharge(){this.charging=false;this.charge=0;}
 update(dt:number,input=0){
  if(this.finished)return;
  dt=Math.min(.1,Math.max(0,Number.isFinite(dt)?dt:0));
  if(this.phase==='aim'){
   this.elapsed+=dt;this.aim=clamp(this.aim+normalizedInput(input)*dt*.7,-1,1);
   if(this.charging){this.charge=Math.min(1,this.charge+dt*.48);if(this.charge>=1){this.charging=false;this.shoot();}}
   if(this.elapsed>=18&&this.phase==='aim'){this.charging=false;this.shotCharge=0;this.shotAim=this.aim;this.judged=true;this.lastScored=false;this.combo=0;this.feedback='Shot clock expired · next position';this.phase='pause';this.pause=.9;}
  }else if(this.phase==='flight'){
   this.shotTime+=dt;
   const crossing=netballRimCrossing(this.playerX,this.shotAim,this.shotCharge);
   if(this.shotTime>=crossing.time&&!this.judged){
    this.judged=true;this.lastScored=crossing.made;
    if(this.lastScored){this.score+=10;this.combo++;this.feedback='Through the net! +10 points';}
    else {this.combo=0;this.feedback=Math.abs(crossing.x)>NETBALL_RING_RADIUS-NETBALL_BALL_RADIUS?'Wide of the ring · follow your aim arc':this.shotCharge<NETBALL_CHARGE_TARGET?'A little short · charge into the gold zone':'Too strong · release in the gold zone';}
   }
   if(this.shotTime>=2){this.phase='pause';this.pause=.65;}
  }else{
   this.pause=Math.max(0,this.pause-dt);
   if(this.pause===0){
    if(this.round>=NETBALL_SHOTS){this.finished=true;this.feedback=`Five shots complete · ${this.score} court points`;return;}
    this.round++;this.aim=this.round%2?.28:-.28;this.charge=0;this.elapsed=0;this.phase='aim';this.lastScored=false;this.feedback='New shooting position · aim, charge and release';
   }
  }
 }
 private shoot(){this.shotAim=this.aim;this.shotCharge=this.charge;this.shotTime=0;this.judged=false;this.lastScored=false;this.phase='flight';this.feedback='Ball in flight…';}
}
