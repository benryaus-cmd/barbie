import test from 'node:test';
import assert from 'node:assert/strict';
import { SurfSession, PourSession, NetballSession, activityReward, NETBALL_HOOP, NETBALL_BALL_RADIUS, NETBALL_RING_RADIUS, netballTrajectory, netballRimCrossing, judgePour } from '../src/game/activity-model.ts';
const advance = (model, seconds, input = 0) => { for (let t=0;t<seconds;t+=1/120) model.update(1/120,input); };

test('pour accuracy is driven by released fill, with overflow worth zero', () => {
 assert.equal(judgePour(.65,.65).score,100);
 assert.ok(judgePour(.60,.65).score > judgePour(.38,.65).score);
 assert.equal(judgePour(1.05,.65).score,0);
});
test('pour completes three precision rounds and cannot award twice on repeated release', () => {
 const session=new PourSession();
 for(let round=1;round<=3;round++){
  session.setPouring(true);
  while(session.fill < session.target-.002) session.update(1/1000);
  session.setPouring(false);
  const score=session.score;
  session.setPouring(false);
  assert.equal(session.score,score);
  if(round<3) advance(session,1.6);
 }
 assert.equal(session.finished,true);
 assert.equal(session.score,300);
 const final=session.score;
 session.setPouring(true);advance(session,5);session.setPouring(false);
 assert.equal(session.score,final);
});
test('pour overflow and inactivity both advance rounds without farming points',()=>{
 const session=new PourSession();session.setPouring(true);advance(session,5);
 assert.equal(session.score,0);assert.equal(session.pouring,false);
 advance(session,1.6);assert.equal(session.round,2);
 advance(session,13);assert.equal(session.score,0);
});
test('surf steering changes position and heading; bounded input cannot leave the course',()=>{
 const left=new SurfSession(),right=new SurfSession();advance(left,1,-1);advance(right,1,1);
 assert.ok(left.x<-.3);assert.ok(right.x>.3);assert.ok(left.heading<0);assert.ok(right.heading>0);
 advance(right,10,100);assert.ok(right.x<=4.25);assert.ok(right.balance>=0);
});
test('surf rewards crossing a ring, obstacles break combo, session finishes in 30 seconds',()=>{
 const session=new SurfSession();
 const ring=session.items[0];ring.x=0;ring.distance=1;ring.kind='ring';
 session.update(.1,0);session.update(.1,0);
 assert.ok(session.score>0);assert.equal(session.combo,1);
 const rock=session.items[1];rock.x=session.x;rock.distance=session.distance+.5;rock.kind='obstacle';
 session.update(.1,0);assert.equal(session.combo,0);assert.ok(session.wipeout>0);
 advance(session,31);assert.equal(session.finished,true);
 const score=session.score;advance(session,5,1);assert.equal(session.score,score);
});

test('netball requires aiming and charging, scores only a made shot and ends after five shots',()=>{
 const session=new NetballSession();
 for(let shot=0;shot<5;shot++){
  session.update(.1,Infinity);assert.ok(Number.isFinite(session.aim));
  while(Math.abs(session.aim)>.002)session.update(.001,session.aim>0?-1:1);
  session.setCharging(true);
  while(session.charge<.64)session.update(.001,0);
  session.setCharging(false);
  assert.equal(session.phase,'flight');assert.equal(session.score,shot*10);
  const before=session.ballPosition;session.update(.1);assert.ok(session.ballPosition.z<before.z);
  advance(session,1.1);assert.equal(session.score,(shot+1)*10);
  session.setCharging(false);assert.equal(session.score,(shot+1)*10,'repeated release cannot score');
  advance(session,1.7);
 }
 assert.equal(session.finished,true);assert.equal(session.score,50);
 session.setCharging(true);advance(session,8);session.setCharging(false);assert.equal(session.score,50);
});
test('netball misses poor aim or power and shot clock guarantees a finite session',()=>{
 const miss=new NetballSession();miss.setCharging(true);advance(miss,.15);miss.setCharging(false);advance(miss,2);
 assert.equal(miss.score,0);
 const idle=new NetballSession();advance(idle,100);assert.equal(idle.finished,true);assert.equal(idle.score,0);
 const cancel=new NetballSession();cancel.setCharging(true);advance(cancel,.5);cancel.cancelCharge();assert.equal(cancel.phase,'aim');assert.equal(cancel.charge,0);
});
test('collectible rewards normalize raw accuracy scores and cap each activity',()=>{
 assert.equal(activityReward('pour',300),30);assert.equal(activityReward('pour',200),20);
 assert.equal(activityReward('surf',9999),45);assert.equal(activityReward('netball',50),50);
 assert.equal(activityReward('pour',NaN),0);assert.equal(activityReward('netball',-30),0);
});

test('netball awards only when the descending 3D ball fits through the actual ring',()=>{
 for(const playerX of [-1.9,1.9,-2.7,2.7,0])for(const [aim,charge] of [[0,.64],[0,.70],[0,.75],[.1,.64],[-.1,.64],[0,.50]]){
  const crossing=netballRimCrossing(playerX,aim,charge);
  const before=netballTrajectory(playerX,aim,charge,crossing.time-.001);
  const point=netballTrajectory(playerX,aim,charge,crossing.time);
  const after=netballTrajectory(playerX,aim,charge,crossing.time+.001);
  assert(before.y>NETBALL_HOOP.y);assert(after.y<NETBALL_HOOP.y,'the judged crossing is descending');
  assert(Math.abs(point.y-NETBALL_HOOP.y)<1e-9);
  const fits=Math.hypot(point.x-NETBALL_HOOP.x,point.z-NETBALL_HOOP.z)+NETBALL_BALL_RADIUS<=NETBALL_RING_RADIUS;
  assert.equal(crossing.made,fits);
 }
 for(const [aim,charge,expected] of [[0,.64,10],[0,.75,0],[.1,.64,0]]){
  const shot=new NetballSession();shot.aim=aim;shot.setCharging(true);
  while(shot.charge<charge)shot.update(.0001);
  shot.setCharging(false);advance(shot,1.5);assert.equal(shot.score,expected);
  if(expected){const point=shot.ballPosition;assert(point.y<NETBALL_HOOP.y,'made ball drops through the net');assert(Math.abs(point.z-NETBALL_HOOP.z)<.4,'net slows the ball after the ring');}
 }
});

test('volleyball has real ball arcs, timed returns, opponent scoring and a finite match', async()=>{
 const {VolleySession}=await import('../src/game/activity-model.ts');
 assert.equal(typeof VolleySession,'function');
 const idle=new VolleySession();advance(idle,61);assert.equal(idle.finished,true);assert.ok(idle.opponentScore>0);assert.equal(idle.score,0);
 const active=new VolleySession();let returns=0,seenNpcReturn=false;
 for(let tick=0;tick<7200&&!active.finished;tick++){
  const ball=active.ballPosition;
  let movement=Math.abs(ball.x-active.playerX)>.07?Math.sign(ball.x-active.playerX):0;
  if(active.phase==='rally'&&ball.z>1.6&&ball.vy<0&&!active.charging&&active.swing<=0)active.setCharging(true);
  if(active.charging&&ball.z>2.35&&ball.y<2.15){active.setCharging(false);movement=active.npcX>0?-1:1;returns++;}
  active.update(1/120,movement);
  if(active.rallyHits>=2)seenNpcReturn=true;
 }
 assert(active.finished);assert(returns>0);assert(seenNpcReturn,'NPC returns the ball during rallies');assert.equal(active.playerPoints,5,'timed returns aimed away from the NPC win the match');assert(active.score<=45);
 const left=new VolleySession(),right=new VolleySession();advance(left,.5,-1);advance(right,.5,1);assert(left.playerX<right.playerX);
 const final=active.score;active.setCharging(true);advance(active,5);active.setCharging(false);assert.equal(active.score,final);assert.equal(activityReward('volley',999),45);
});

test('volleyball return direction and held power change the physical outgoing ball',async()=>{
 const {VolleySession}=await import('../src/game/activity-model.ts');
 const firstReturn=(direction,early)=>{
  const model=new VolleySession();
  for(let tick=0;tick<1200;tick++){
   const ball=model.ballPosition;
   let input=Math.abs(ball.x-model.playerX)>.03?Math.sign(ball.x-model.playerX):0;
   if(model.phase==='rally'&&(early||ball.z>1.6)&&!model.charging)model.setCharging(true);
   if(model.charging&&ball.z>2.35&&ball.y<2.15){model.setCharging(false);input=direction;}
   model.update(1/120,input);
   if(model.rallyHits===2)return {...model.ballPosition};
  }
  assert.fail('the timed release should make a real return');
 };
 const left=firstReturn(-1,false),right=firstReturn(1,false),strong=firstReturn(1,true);
 assert(left.vx<0);assert(right.vx>0,'direction at release aims across the opponent court');
 assert(Math.abs(strong.vz)>Math.abs(right.vz),'holding longer produces a faster return');
 assert(left.vy>0&&right.vy>0,'returned balls rise in a gravity-driven arc');
});
