import * as THREE from 'three';
import { solveLimb } from './riding';
import type { HandGesture } from './hand-rig';

type Rotation = [number, number, number];
export type MotionInput = {
  moving:boolean; speed:number; grounded:boolean; dancing:boolean; sitting:boolean; pose:string;
  heading?:number; soleHeight?:number; armSpace?:number; carry?:'none'|'one-hand'|'two-hand'; swing?:number|null;
};
export type MotionFrame = {
  pelvisY:number; phase:number; rotations:Record<string,Rotation>;
  hands:{left:HandGesture;right:HandGesture};
};
const TAU = Math.PI * 2;
const keys = ['pelvis','waist','head','leftUpperLeg','leftLowerLeg','leftFoot','rightUpperLeg','rightLowerLeg','rightFoot','leftUpperArm','leftLowerArm','leftHand','rightUpperArm','rightLowerArm','rightHand'];
const heldKeys = ['waist','head','leftUpperArm','leftLowerArm','leftHand','rightUpperArm','rightLowerArm','rightHand'];
const clamp = THREE.MathUtils.clamp;
const smooth = (x:number) => { const t=clamp(x,0,1);return t*t*(3-2*t); };
function frame():MotionFrame {
  return {pelvisY:.928,phase:0,rotations:Object.fromEntries(keys.map(k=>[k,[0,0,0] as Rotation])),hands:{left:'relaxed',right:'relaxed'}};
}

/** Layered local-space motion. Feet are solved from floor contacts, never Euler-filtered.
 * The caller can interpolate the body rig, but should apply grounded legs without lag.
 * No meshes, raycasts, geometry rebuilds or world/gameplay state belong in this controller.
 */
export function createMotionController() {
  const out=frame(),photo=frame(),heldPhoto=frame(),heldFrom=frame(),heldPrevious=frame();
  const euler=new THREE.Euler(),qa=new THREE.Quaternion(),qb=new THREE.Quaternion();
  const pelvisInverse=new THREE.Quaternion(),origin=new THREE.Vector3(),target=new THREE.Vector3(),hint=new THREE.Vector3(),direction=new THREE.Vector3();
  const toolQ=new THREE.Quaternion(),wristQ=new THREE.Quaternion(),chainQ=new THREE.Quaternion(),gripOffset=new THREE.Vector3(),gripPoint=new THREE.Vector3();
  let clock=0,phase=0,pace=0,photoWeight=0,turn=0,lastHeading:number|undefined;
  let heldMode='none',heldTransition=1,hasPrevious=false,inputArmSpace=0;
  const set=(f:MotionFrame,key:string,x=0,y=0,z=0)=>{const r=f.rotations[key];r[0]=x;r[1]=y;r[2]=z;};
  const blendRotation=(to:Rotation,a:Rotation,b:Rotation,w:number)=>{
    qa.setFromEuler(euler.set(...a));qb.setFromEuler(euler.set(...b));euler.setFromQuaternion(qa.slerp(qb,w));to[0]=euler.x;to[1]=euler.y;to[2]=euler.z;
  };
  const arm=(f:MotionFrame,i:number,x=0,y=0,z=0,ex=-.12,ez=0,wx=0,wy=0,wz=0)=>{
    const p=i?'right':'left';set(f,p+'UpperArm',x,y,z);set(f,p+'LowerArm',ex,0,ez);set(f,p+'Hand',wx,wy,wz);
  };
  const reach=(f:MotionFrame,i:number,point:Rotation,bend:Rotation,handDirection:Rotation)=>{
    const side=i?1:-1,p=i?'right':'left';
    origin.set(side*.212,.368,0);target.set(...point);hint.set(...bend);direction.set(...handDirection);
    const qs=solveLimb(origin,target,hint,.27,.245,direction);
    for(let j=0;j<3;j++){euler.setFromQuaternion(qs[j]);set(f,p+['UpperArm','LowerArm','Hand'][j],euler.x,euler.y,euler.z);}
  };
  const relaxedArm=(f:MotionFrame,i:number,progress=0,space=0)=>{
    const side=i?1:-1;
    // Upper arm travels behind the advancing same-side leg; elbow flexes forward.
    // Keep the elbow near the ribs, with only the space the current skirt needs.
    arm(f,i,.045+progress*.25,0,side*(.060+space),-.12-.08*Math.max(0,-progress),0,-.025,-side*.6,side*.015);
  };
  const handOnHip=(f:MotionFrame,i:number)=>{
    const side=i?1:-1,p=i?'right':'left';
    const palmQ=new THREE.Quaternion().setFromEuler(new THREE.Euler(.02,-side*Math.PI/2,side*.10));
    const down=new THREE.Vector3(0,-1,0).applyQuaternion(palmQ);
    reach(f,i,[side*.196,.04,.015],[side*.5,-.02,-.12],[down.x,down.y,down.z]);
    const chain=new THREE.Quaternion().setFromEuler(new THREE.Euler(...f.rotations[p+'UpperArm'])).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...f.rotations[p+'LowerArm'])));
    const rotation=new THREE.Euler().setFromQuaternion(chain.invert().multiply(palmQ));
    set(f,p+'Hand',rotation.x,rotation.y,rotation.z);
  };
  function photoPose(selected:string,base:MotionFrame) {
    photo.pelvisY=base.pelvisY;for(const k of keys)photo.rotations[k].splice(0,3,...base.rotations[k]);
    photo.hands.left='relaxed';photo.hands.right='relaxed';
    const pulse=Math.sin(clock*2.4),breath=Math.sin(clock*1.35)*.012;
    set(photo,'pelvis',0,0,-.025);set(photo,'waist',breath,0,.025);set(photo,'head',breath,.06,-.045);
    for(let i=0;i<2;i++)relaxedArm(photo,i,0,clamp(inputArmSpace,0,.065));
    if(selected==='wave') {
      reach(photo,1,[.38,.71,.06],[.25,-.05,.04],[pulse*.2,1,0]);set(photo,'head',0,-.12,-.11);photo.hands.right='open';
    } else if(selected==='peace') {
      reach(photo,1,[.29,.60,.16],[.3,-.1,.02],[.12,1,0]);handOnHip(photo,0);set(photo,'head',-.04,-.1,-.16);photo.hands.right='peace';
    } else if(selected==='heart') {
      reach(photo,0,[-.045,.35,.24],[-.2,-.3,.04],[.65,-.75,0]);reach(photo,1,[.045,.35,.24],[.2,-.3,.04],[-.65,-.75,0]);
      set(photo,'head',.10+breath,0,.04);set(photo,'waist',-.03,0,0);photo.hands.left=photo.hands.right='heart';
    } else if(selected==='kiss') {
      reach(photo,1,[.082+pulse*.008,.53,.235+pulse*.012],[.28,-.17,.06],[-.8,.5,.05]);handOnHip(photo,0);set(photo,'head',-.08,-.16,-.12);photo.hands.right='open';
    } else if(selected==='spin') {
      // Wrap the Euler representation; quaternion pose blending crosses the seam smoothly.
      set(photo,'pelvis',0,Math.atan2(Math.sin(clock*1.3),Math.cos(clock*1.3)),.04);set(photo,'waist',-.03,0,-.08);
      arm(photo,0,-.2,0,-1.35,-.2);arm(photo,1,-.2,0,1.35,-.2);
      set(photo,'leftUpperLeg',-.10,0,-.12);set(photo,'rightUpperLeg',.32,0,.14);set(photo,'rightLowerLeg',.85);set(photo,'rightFoot',-.4);photo.hands.left=photo.hands.right='open';
    } else if(selected==='dance') {
      set(photo,'pelvis',0,pulse*.24,pulse*.10);set(photo,'waist',-.06,-pulse*.3,-pulse*.16);set(photo,'head',-.04,pulse*.15,.1);
      arm(photo,0,-.8+pulse*.35,0,-1.05,-1,.2,0,0,pulse*.25);arm(photo,1,-1.5-pulse*.35,0,1.8,-.6,-.2,0,0,-pulse*.25);
      set(photo,'leftUpperLeg',-.1+pulse*.18,0,-.15);set(photo,'leftLowerLeg',.2+Math.max(0,pulse)*.35);set(photo,'rightUpperLeg',-.1-pulse*.18,0,.15);set(photo,'rightLowerLeg',.2+Math.max(0,-pulse)*.35);
    } else if(selected==='pet') {
      photo.pelvisY=.83;set(photo,'pelvis',.28,0,-.05);set(photo,'waist',.28,0,-.12);set(photo,'head',.28,0,-.12);
      set(photo,'leftUpperLeg',-.72,0,-.13);set(photo,'leftLowerLeg',1.35);set(photo,'rightUpperLeg',-.35,0,.1);set(photo,'rightLowerLeg',.85);
      arm(photo,0,-.72,0,-.22,-.15,0,0,0,pulse*.07);arm(photo,1,-.25,0,.17,-.62);photo.hands.left='open';
    } else if(selected==='hug') {
      reach(photo,0,[-.08,.31,.39],[-.35,-.10,.18],[1,0,0]);reach(photo,1,[.08,.35,.39],[.35,-.1,.18],[-1,0,0]);set(photo,'waist',.04,.12,-.10);set(photo,'head',.10,-.16,-.15);photo.hands.left=photo.hands.right='open';
    } else if(selected==='arm-around') {
      reach(photo,0,[-.65,.34,-.07],[-.4,.1,-.06],[-.8,-.3,0]);handOnHip(photo,1);set(photo,'head',0,-.12,-.15);set(photo,'waist',0,0,-.08);photo.hands.left='open';
    } else if(selected==='half-heart') {
      reach(photo,0,[-.34,.69,.13],[-.40,.36,.06],[1,.1,0]);handOnHip(photo,1);set(photo,'head',-.03,-.1,-.16);set(photo,'waist',0,0,-.12);photo.hands.left='heart';
    } else if(selected==='salute') {
      reach(photo,1,[.15,.76,.14],[.42,.2,.04],[-1,.1,0]);set(photo,'head',0,-.12,-.07);photo.hands.right='open';
    } else if(selected==='curtsy') {
      photo.pelvisY=.88;set(photo,'pelvis',.07,.18,-.05);set(photo,'waist',.12,0,.04);set(photo,'head',.14,0,-.08);
      arm(photo,0,.1,0,-.6,-.35,.1);arm(photo,1,.1,0,.6,-.35,-.1);set(photo,'leftUpperLeg',-.2,-.15,-.08);set(photo,'leftLowerLeg',.35);set(photo,'rightUpperLeg',.32,.15,.08);set(photo,'rightLowerLeg',.65);
    } else if(selected==='jump') {
      const bounce=Math.max(0,Math.sin(clock*2.8));photo.pelvisY=.928+bounce*.20;arm(photo,0,-.2,0,-2.5,-.32);arm(photo,1,-.2,0,2.5,-.32);set(photo,'head',-.12,0,-.05);
      set(photo,'leftUpperLeg',.15,0,-.16);set(photo,'leftLowerLeg',bounce*.7);set(photo,'rightUpperLeg',-.10,0,.17);set(photo,'rightLowerLeg',bounce*.9);photo.hands.left=photo.hands.right='open';
    } else if(selected==='surf') {
      photo.pelvisY=.88;set(photo,'pelvis',-.08,.6,.06);set(photo,'waist',.15,-.3,-.08);set(photo,'head',-.04,-.3,0);
      set(photo,'leftUpperLeg',-.48,0,-.28);set(photo,'leftLowerLeg',.76);set(photo,'rightUpperLeg',-.45,0,.28);set(photo,'rightLowerLeg',.72);arm(photo,0,-.14,-.3,-1.25,-.24);arm(photo,1,-.3,.3,1.2,-.37);photo.hands.left=photo.hands.right='open';
    } else if(selected==='confident') {
      handOnHip(photo,0);handOnHip(photo,1);set(photo,'waist',-.035,.11,.025);set(photo,'head',-.065,-.11,-.045);
    } else if(selected==='look-back') {
      handOnHip(photo,1);set(photo,'pelvis',0,-.18,-.02);set(photo,'waist',-.025,-.32,.02);set(photo,'head',-.02,-.62,-.08);
    } else if(selected==='cheer') {
      reach(photo,0,[-.40,.78+breath,.06],[-.5,.1,.05],[0,1,0]);reach(photo,1,[.40,.81-breath,.06],[.5,.1,.05],[0,1,0]);set(photo,'head',-.12,0,-.035);photo.hands.left=photo.hands.right='grip';
    } else if(selected==='shy') {
      reach(photo,0,[-.065,.10,.24],[-.35,-.2,0],[.5,-1,0]);reach(photo,1,[.065,.09,.24],[.35,-.2,0],[-.5,-1,0]);set(photo,'head',.17,-.14,.09);set(photo,'waist',.05,0,-.025);
    } else if(selected==='point') {
      reach(photo,1,[.46,.49,.31],[.3,-.1,.1],[.8,.22,.5]);handOnHip(photo,0);set(photo,'head',-.025,.24,-.03);set(photo,'waist',0,.10,0);photo.hands.right='point';
    } else if(selected==='stretch') {
      reach(photo,0,[-.17,.84,.035],[-.4,.2,0],[.3,1,0]);reach(photo,1,[.17,.84,.035],[.4,.2,0],[-.3,1,0]);set(photo,'waist',-.08,0,.065);set(photo,'head',-.10,0,-.04);photo.hands.left=photo.hands.right='open';
    }
  }

  return {update(dt:number,input:MotionInput):MotionFrame {
    const step=Number.isFinite(dt)?clamp(dt,0,.05):0;clock+=step;
    const speed=Number.isFinite(input.speed)?clamp(input.speed/4.5,0,1):0;
    const goal=input.moving&&input.grounded&&!input.sitting?speed:0;
    pace+=(goal-pace)*(1-Math.exp(-step*(goal>pace?5.5:9)));
    if(pace<.0001)pace=0;
    phase=(phase+step*TAU*(.78+.72*pace)*Math.min(1,pace*12))%TAU;out.phase=phase;
    let turnGoal=0;
    if(Number.isFinite(input.heading)){if(lastHeading!==undefined&&step>0){const delta=Math.atan2(Math.sin(input.heading!-lastHeading),Math.cos(input.heading!-lastHeading));turnGoal=clamp(delta/step,-2,2)*.025*pace;}lastHeading=input.heading;}
    turn+=(turnGoal-turn)*(1-Math.exp(-step*5));
    const sole=Number.isFinite(input.soleHeight)?clamp(input.soleHeight!,.04,.16):.09;
    inputArmSpace=Number.isFinite(input.armSpace)?clamp(input.armSpace!,0,.065):0;
    const breath=Math.sin(clock*1.35),sway=Math.sin(clock*.54+.4);
    out.pelvisY=.936+(sole-.09);
    for(const k of keys)set(out,k);
    out.hands.left=out.hands.right='relaxed';
    set(out,'pelvis',pace*.025,Math.sin(phase)*.025*pace,Math.sin(phase)*.013*pace+sway*.006*(1-pace)-turn);
    set(out,'waist',breath*.006-pace*.018,-Math.sin(phase)*.045*pace,-out.rotations.pelvis[2]*.8);
    set(out,'head',breath*.009,Math.sin(clock*.38)*.019,-.018-sway*.007);
    pelvisInverse.setFromEuler(euler.set(...out.rotations.pelvis)).invert();
    const contacts=[0,1].map(i=>{
      const cycle=(phase/TAU+i*.5)%1,stance=.62;
      const swing=cycle>stance?(cycle-stance)/(1-stance):0;
      const z=pace*.18*(cycle<=stance?1-2*cycle/stance:-1+2*smooth(swing));
      const lift=pace*.038*Math.pow(Math.sin(swing*Math.PI),1.5);
      const roll=pace*(cycle<.10?-.10*(1-cycle/.10):cycle>.49&&cycle<stance?.13*smooth((cycle-.49)/(stance-.49)):cycle>stance?.10*Math.cos(swing*Math.PI):0);
      return {z,lift,roll};
    });
    // Let the supporting leg extend through mid-stance. A fixed low pelvis made
    // both knees hunch forward throughout the cycle and at rest.
    out.pelvisY=Infinity;
    for(let i=0;i<2;i++){
      const side=i?1:-1,contact=contacts[i];
      origin.set(side*.108,-.025,0).applyQuaternion(pelvisInverse.clone().invert());
      const horizontal=(side*.108-origin.x)**2+(contact.z-origin.z)**2;
      out.pelvisY=Math.min(out.pelvisY,sole+contact.lift-origin.y+Math.sqrt(Math.max(.0001,.821**2-horizontal)));
    }
    out.pelvisY-=.0005+breath*.0003*(1-pace);
    for(let i=0;i<2;i++) {
      const side=i?1:-1,p=i?'right':'left',{z,lift,roll}=contacts[i];
      target.set(side*.108,sole+lift-out.pelvisY,z).applyQuaternion(pelvisInverse);
      origin.set(side*.108,-.025,0);hint.set(side*.015,0,1).applyQuaternion(pelvisInverse);direction.set(0,-Math.cos(roll),-Math.sin(roll)).applyQuaternion(pelvisInverse);
      const qs=solveLimb(origin,target,hint,.425,.397,direction);
      for(let j=0;j<3;j++){euler.setFromQuaternion(qs[j]);set(out,p+['UpperLeg','LowerLeg','Foot'][j],euler.x,euler.y,euler.z);}
      relaxedArm(out,i,z/.18,inputArmSpace);
    }
    if(!input.grounded&&!input.sitting) {
      set(out,'leftUpperLeg',-.48,0,-.035);set(out,'leftLowerLeg',.35);set(out,'rightUpperLeg',.24,0,.035);set(out,'rightLowerLeg',.60);
      arm(out,0,-.65,0,-.28,-.45);arm(out,1,-.65,0,.28,-.45);
    }
    if(input.sitting) {
      out.pelvisY=1.015;set(out,'pelvis');set(out,'waist',.09);
      for(let i=0;i<2;i++){const p=i?'right':'left',s=i?1:-1;set(out,p+'UpperLeg',-1.4,0,s*.035);set(out,p+'LowerLeg',1.38);set(out,p+'Foot',-.12);arm(out,i,-.72,0,s*.18,-.6);}
    }
    const selected=input.dancing?'dance':input.pose||'idle';
    const active=selected!=='idle'&&!input.moving&&!input.sitting&&input.grounded;
    photoWeight+=((active?1:0)-photoWeight)*(1-Math.exp(-step*11));
    if(active) {
      photoPose(selected,out);
      const settle=1-Math.exp(-step*14);
      for(const k of keys)blendRotation(heldPhoto.rotations[k],heldPhoto.rotations[k],photo.rotations[k],settle);
      heldPhoto.pelvisY+=(photo.pelvisY-heldPhoto.pelvisY)*settle;
      heldPhoto.hands.left=photo.hands.left;heldPhoto.hands.right=photo.hands.right;
    }
    if(photoWeight>.0001) {
      for(const k of keys)blendRotation(out.rotations[k],out.rotations[k],heldPhoto.rotations[k],photoWeight);
      out.pelvisY+=(heldPhoto.pelvisY-out.pelvisY)*photoWeight;
      if(photoWeight>.5){out.hands.left=heldPhoto.hands.left;out.hands.right=heldPhoto.hands.right;}
    }
    const carry=input.carry||'none',swingActive=input.swing!=null&&Number.isFinite(input.swing)&&input.swing>=0&&input.swing<1;
    const nextHeldMode=carry!=='none'?carry:swingActive?'one-hand':'none';
    if(nextHeldMode!==heldMode) {
      heldMode=nextHeldMode;heldTransition=0;
      for(const k of heldKeys)heldFrom.rotations[k].splice(0,3,...(hasPrevious?heldPrevious:out).rotations[k]);
      heldFrom.hands.left=(hasPrevious?heldPrevious:out).hands.left;
      heldFrom.hands.right=(hasPrevious?heldPrevious:out).hands.right;
    }
    if(carry!=='none'||swingActive) {
      const t=swingActive?clamp(input.swing!,0,1):1;
      // Give an empty hand time to enter the hold, then anticipate, strike and recover.
      // The final short hold makes the one-shot exit continuous even at a coarse dt.
      const amount=t<.26?0:t<.42?-.65*smooth((t-.26)/.16):t<.66?-.65+1.8*smooth((t-.42)/.24):t<.94?1.15*(1-smooth((t-.66)/.28)):0;
      toolQ.setFromEuler(euler.set(amount,amount*.12,0));
      const two=carry==='two-hand';
      for(let i=two?0:1;i<2;i++) {
        const side=i?1:-1,p=i?'right':'left';
        // Both sockets share this transformed +Y shaft, separated along its length.
        gripPoint.set(two?.14:.375,i?.10:.24,two?.203:.283);
        if(!two)gripPoint.y=.13;
        gripPoint.sub(origin.set(two?.12:.24,.35,.03)).applyQuaternion(toolQ).add(origin);
        wristQ.setFromAxisAngle(direction.set(0,0,1),side*Math.PI/2).premultiply(toolQ);
        gripOffset.set(0,-.055,.023).applyQuaternion(wristQ);
        target.copy(gripPoint).sub(gripOffset);
        direction.set(0,-1,0).applyQuaternion(wristQ);
        const point:Rotation=[target.x,target.y,target.z],hand:Rotation=[direction.x,direction.y,direction.z];
        reach(out,i,point,[side*.52,-.12,.10],hand);
        chainQ.setFromEuler(euler.set(...out.rotations[p+'UpperArm']));
        qb.setFromEuler(euler.set(...out.rotations[p+'LowerArm']));chainQ.multiply(qb).invert().multiply(wristQ);
        euler.setFromQuaternion(chainQ);set(out,p+'Hand',euler.x,euler.y,euler.z);
        out.hands[i?'right':'left']='grip';
      }
      out.rotations.waist[1]-=amount*.12;out.rotations.head[1]+=amount*.045;out.hands.right='grip';
    }
    // Fade only on held-mode changes. Stable carries/actions retain exact shared-shaft
    // IK instead of continually filtering the two wrists independently.
    if(heldTransition<1) {
      heldTransition=Math.min(1,heldTransition+step/.32);
      const weight=smooth(heldTransition);
      for(const k of heldKeys)blendRotation(out.rotations[k],heldFrom.rotations[k],out.rotations[k],weight);
      if(weight<.5){out.hands.left=heldFrom.hands.left;out.hands.right=heldFrom.hands.right;}
    }
    for(const k of heldKeys)heldPrevious.rotations[k].splice(0,3,...out.rotations[k]);
    heldPrevious.hands.left=out.hands.left;heldPrevious.hands.right=out.hands.right;hasPrevious=true;
    return out;
  }};
}
