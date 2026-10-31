import test from 'node:test';
import assert from 'node:assert/strict';
import { SurfSession, PourSession, judgePour } from '../src/game/activity-model.ts';
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
