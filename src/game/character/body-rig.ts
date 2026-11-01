import * as THREE from 'three';

export type HandSide = 'left' | 'right';
export type HumanoidBone = 'hips' | 'spine' | 'neck' | 'head'
  | 'leftUpperArm' | 'leftLowerArm' | 'leftHand' | 'rightUpperArm' | 'rightLowerArm' | 'rightHand'
  | 'leftUpperLeg' | 'leftLowerLeg' | 'leftFoot' | 'rightUpperLeg' | 'rightLowerLeg' | 'rightFoot';
export type HumanoidBones = Record<HumanoidBone, THREE.Bone>;
export type BodyRig = {
  bones: HumanoidBones;
  fingers: Record<HandSide, Record<string, THREE.Bone>>;
  skeleton: THREE.Skeleton;
  sockets: { leftHand: THREE.Object3D; rightHand: THREE.Object3D };
  attach(object: THREE.Object3D, side?: HandSide): () => void;
};

/** Canonical mapping is independent of legacy display names and outfit geometry.
 * Props use +Y along their handle and +Z out of the palm; their origin is the grip. */
export function createBodyRig(
  bones: HumanoidBones,
  hands: Record<HandSide, { grip: THREE.Object3D; bones: Record<string, THREE.Bone> }>,
): BodyRig {
  for (const [name, bone] of Object.entries(bones)) bone.userData.humanoidBone = name;
  bones.hips.updateWorldMatrix(true, true);
  const all = [...new Set([...Object.values(bones), ...Object.values(hands.left.bones), ...Object.values(hands.right.bones)])];
  const skeleton = new THREE.Skeleton(all);
  const sockets = { leftHand: hands.left.grip, rightHand: hands.right.grip };
  return {
    bones, skeleton, sockets, fingers: { left: hands.left.bones, right: hands.right.bones },
    attach(object, side = 'right') {
      const socket = side === 'left' ? sockets.leftHand : sockets.rightHand;
      socket.add(object); object.position.set(0, 0, 0); object.quaternion.identity();
      // The caller owns prop geometry/materials. Detaching never destroys them.
      return () => { if (object.parent === socket) object.removeFromParent(); };
    },
  };
}
