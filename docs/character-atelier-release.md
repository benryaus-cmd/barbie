# Character Atelier — release 5

This pass upgrades the existing fixed-size doll. No downloaded character asset or body-size editor has been added.

- Continuous weighted elbow and knee skin replaces separate rigid limb capsules.
- Six skirt silhouettes and their trims use weighted bones, vehicle-specific and crouched drapes, a stable waist and subtle hem motion. A newly selected skirt immediately fits the active posture.
- All nine hairstyles remain. Secondary lengths use weighted spring chains with damped world-motion response and conservative head/body clearance. Caps stay anchored; highlights and hairlines are softer.
- Curved eye shapes, three lip shapes, six iris colors, feathered blush and a continuous nose improve close-ups. Blinks, gaze and pose expressions add movement. The makeup station exposes these choices; outfit presets, saved sets and photo metadata preserve them.
- Shared skin, satin, cotton, denim and hair micro surfaces add restrained texture. Existing clothing colors, ownership and save keys remain.
- Rider hands and feet use shared vehicle contact points; cars gain steering wheels and the scooter gains grips/footrests.
- Garment authoring is cached by source geometry content, cloned per avatar and bounded. Resident detail is prewarmed at the configured budget, including one rig for Low. Skeleton textures are released on cleanup.

## Verification

TypeScript, ESLint, the production Vite build and the full domain/runtime suite pass. Tests cover actual weighted vertex movement, waist stability, real rider/crouch containment, hair root/inertia/recovery/clearance, facial variants, beauty persistence, hidden-garment transitions and shared skeleton disposal. The gameplay regressions include joystick ownership, camera follow/orbit, actual Rapier ground/stairs, activities, pets and photos.

Chromium/WebGL render review covers close-up faces, every hairstyle, all poses, all six scooter skirts and both cars, plus intermediate pose transitions. Defects discovered in that review were corrected: hair projected across the face, faceted merged normals, a segmented nose, exposed seated thighs, inverted cloth shading and coarse pleat edges. Embedded 360×520 gameplay checks cover indoor styling, photo heading/gestures, makeup selections and preset preservation.

This is authored mobile deformation with spring bones, not full cloth or strand simulation. Browser software rendering verifies behavior and appearance, not frame rates on physical Android hardware. Further unusual animation/clothing combinations can still need authored fit adjustments.

## Aippy delivery

The release uses the existing transaction-based Vite importer and one game tree. A new immutable manifest pins the full game snapshot, keeps the ten registry asset merges and protects host tooling/save data. Use only the uniquely named Character Atelier prompt for this release; older Social Summer and recovery prompts target older snapshots.
