# Character motion foundation 6

Ben requests close-fit shirt/face/jewellery details, boots that enclose calves, more expressive poses, natural walking/idle movement and a usable character foundation for a future jungle survival island with held tools and swings.

Keep the existing fixed body proportions, world, controls, saves, nine hairstyles and all clothing. Use existing Three.js and analytic posing; no new runtime dependencies or full cloth solver. Replacing the entire character asset would jeopardize wardrobe compatibility, while adding more fixed offsets repeats the defects. Chosen implementation: actual surface sampling, a mapped native-bone body hierarchy, articulated hands/boots, and reusable layered movement/actions. This is an implementation choice under the user's standing artistic licence and instruction to proceed.

- Sample actual selected clothing/head surfaces for appliques, lips and jewellery; avoid forcing every necklace over a sport collar that is not being worn.
- Split boot calf/foot influence so the shaft follows the shin and the foot follows the ankle.
- Preserve existing joint names for compatibility but expose canonical humanoid mappings and stable hand grip sockets. Use native bones for the body and shared limb skinning where feasible.
- Walking has stance/swing timing, foot lift/roll, coordinated pelvis/torso/arms, softened start/stop and a restrained turn response. Idle has breathing, weight shift and small gaze/hand variation.
- Improve existing poses and add confident, look-back, cheer, shy, point and stretch. Carry and one-shot swing hooks are reusable rig actions for future equipment; the current island keeps its existing activities.
- Give hand gestures real finger articulation and a consistent prop coordinate frame. Check grasp/peace/point/open gestures and an attached test tool during locomotion/swing.
- Verify actual side-view attachment distances, calf/boot fit, foot motion, grip attachment, transitions and wardrobe regression. Publish a fresh immutable Aippy manifest/prompt after integration and review.
