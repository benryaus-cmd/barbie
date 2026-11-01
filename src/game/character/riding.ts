import * as THREE from 'three';
import type { VehicleId } from '@/game/types';
type Point = [number, number, number];
type RidingPose = {rootY:number;rootZ:number;lean:number;hands:[Point,Point];feet:[Point,Point]};
/** Contact points are in vehicle-local coordinates, shared by model and rider. */
export const RIDING:Record<VehicleId,RidingPose>={
 scooter:{rootY:-.05,rootZ:-.13,lean:.26,hands:[[-.29,1.36,.42],[.29,1.36,.42]],feet:[[-.15,.51,.20],[.15,.51,.20]]},
 convertible:{rootY:.29,rootZ:-.20,lean:.14,hands:[[-.22,1.49,.25],[.22,1.49,.25]],feet:[[-.16,.62,.22],[.16,.62,.22]]},
 buggy:{rootY:.30,rootZ:-.18,lean:.18,hands:[[-.22,1.49,.28],[.22,1.49,.28]],feet:[[-.17,.64,.24],[.17,.64,.24]]},
};
/** Analytic two-bone reach in the parent's local frame. Hint is an outward bend vector. */
export function solveLimb(origin:THREE.Vector3,target:THREE.Vector3,hint:THREE.Vector3,upper:number,lower:number,endDirection:THREE.Vector3){
 const direction=target.clone().sub(origin),length=THREE.MathUtils.clamp(direction.length(),Math.abs(upper-lower)+.001,upper+lower-.001);direction.normalize();
 const along=(upper*upper-lower*lower+length*length)/(2*length);
 const perpendicular=hint.clone().addScaledVector(direction,-hint.dot(direction));
 if(perpendicular.lengthSq()<1e-8)perpendicular.set(0,0,1).addScaledVector(direction,-direction.z);
 perpendicular.normalize();
 const elbow=origin.clone().addScaledVector(direction,along).addScaledVector(perpendicular,Math.sqrt(Math.max(0,upper*upper-along*along)));
 const down=new THREE.Vector3(0,-1,0),upperQ=new THREE.Quaternion().setFromUnitVectors(down,elbow.clone().sub(origin).normalize());
 const lowerQ=new THREE.Quaternion().setFromUnitVectors(down,target.clone().sub(elbow).normalize().applyQuaternion(upperQ.clone().invert()));
 const endQ=upperQ.clone().multiply(lowerQ).invert().multiply(new THREE.Quaternion().setFromUnitVectors(down,endDirection.clone().normalize()));
 return [upperQ,lowerQ,endQ] as const;
}
