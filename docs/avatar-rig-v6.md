# Character motion foundation 6

The current doll keeps its body proportions, clothing, facial customisation and nine hairstyles. The torso, neck, head, arms and legs are now native Three.js bones. Four continuous limb meshes share the mapped body skeleton. Clothing, hair, boots and hands retain their specialised weighted rigs.

`avatar.rig.bones` exposes canonical humanoid names, independent of legacy display names: `hips`, `spine`, `neck`, `head`, and `left`/`right` `UpperArm`, `LowerArm`, `Hand`, `UpperLeg`, `LowerLeg`, `Foot`. `rig.fingers` exposes the articulated palm/finger bones. `rig.skeleton` is the actual shared body skeleton, not a parallel placeholder hierarchy.

## Equipment on the next island

```ts
const avatar = createAvatar();
// Author a prop with its origin at the grip, +Y along its handle,
// and +Z out of the palm. A two-hand handle needs 14cm between grips.
const detach = avatar.attachHeldObject(tool, 'right');
avatar.setCarry('two-hand'); // 'one-hand' or 'none' also supported
avatar.playAction('swing'); // false if already active or seated
avatar.update(dt, motion); // same production update used by this island
const { active, progress } = avatar.getActionState();
// The caller owns the equipment's geometry/materials and its eventual disposal.
detach();
avatar.setCarry('none');
```

Carry and one-shot swing affect the upper body while preserving the locomotion channel. A completed action returns to the chosen carry. Sitting cancels a swing and uses authored vehicle contact IK. The action is a reusable animation foundation; target detection, damage, stamina, equipment inventory and jungle gameplay belong to the next island.

## Motion and fitting

The controller solves local foot height/lift/roll, blends walking start/stop, adds restrained torso counter-motion, breathing and weight shift, and blends into living photo poses. Fingers use six articulated gestures. Six additional public poses are `confident`, `look-back`, `cheer`, `shy`, `point`, and `stretch`; the photo menu, emote menu and album validation include them.

Island traversal retains its existing fast game speed. The stylised gait is normalised to the doll's proportions; it does not implement world-space planted-foot locking or retarget arbitrary imported animation clips. The bone map is a starting point for such extensions.

Shirt appliques sample the actual bodice triangles, including subdivided patch interiors. Lips reproject after expression deformation onto the actual shaped head. The necklace samples the currently worn top/body, with fixed neck anchors and bounded secondary movement. Boots use a calf envelope and separate ankle influence so the foot bends without opening the sleeve. These mobile rigs avoid the runtime cost and instability of a general cloth solver.

## Verification

`npm test` includes actual surface/contact geometry, all eight necklace tops, boot calf coverage, finger gestures and grip frames, body mapping, carrying/swing transitions, vehicle contacts and all six walking skirt silhouettes. `node tests/motion-browser.mjs` renders side profiles, old/new poses, walking, boots and an attached test tool through the real WebGL character. Existing game integration checks exercise wardrobe, beauty and grouped photos in a short portrait iframe.

Desktop Chromium/SwiftShader validation is not a physical Android performance measurement. No new runtime dependencies or save-key changes are introduced.
