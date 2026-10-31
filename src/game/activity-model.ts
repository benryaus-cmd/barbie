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
