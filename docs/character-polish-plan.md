# Character polish — approved scope

Keep the current body proportions, world, wardrobe, saves, controls and all nine hairstyles. Improve the existing stylised character rather than replace the game.

1. Convert skirts and their decorations to weighted meshes with a stable waist, front/back/side dress bones, movement response and an authored seated shape. Check all six skirt silhouettes on the scooter; no expensive general cloth solver.
2. Convert secondary hair geometry to weighted bone chains with damped inertia, bounded movement and simple body clearance. Keep roots/caps fixed and existing hairstyle/color selection.
3. Refine face geometry, eyes, lashes, nose and lips; add subtle shared skin/fabric surface detail and expressive facial animation. Offer a small set of eye/mouth looks without changing body size.
4. Use vehicle-specific reach and leg placement, improve pose transitions, and prevent free arms from entering the torso. Preserve all existing activities and photo orientation.
5. Test deformation and persistence, render close-up/pose/riding comparisons, inspect the results and fix defects. Run the normal build and relevant regression checks.
6. Push the verified game source, publish an immutable manifest, verify the live importer and provide a new uniquely named Aippy update prompt.

## Progress

- Baseline: clean working tree; prior recovery release retained. Implementation starting.
- Authorization: user approved the above scope and requested testing, fixes and pushing the Aippy update. No additional approval gate.
- Parallel ownership: garment-rig module; hair-rig module; face/surface modules. Root owns avatar integration, vehicle reach, save/UI changes, visual checks and release.
- First integration: weighted garments/hair, continuous limb skins, vehicle contact IK and persisted facial choices implemented.
- Render review found and corrected rear hair being projected across the face and nonindexed normal faceting; nose replaced with a continuous patch. Actual rider coverage prompted stronger garment tests and further fit work.
- Integration review: facial choices now survive complete outfit presets; a newly visible skirt snaps to the active posture; walking clears an inactive crouch drape. Shared skeleton textures are disposed exactly once.
- Performance: immutable garment authoring is cached by source geometry content and cloned for each character, keeping materials/skeletons/disposal independent. The configured resident detail pool is built before the normal frame loop; Low keeps one rig.
- Embedded Chromium checks passed for indoor styling, orbit/zoom/photo heading, makeup feature choices, preset preservation and all nine hairstyles at 360×520. Physical Android performance remains unmeasured.
- Gait review corrected the old inward free-arm sign and added a bounded forward gown panel flare for actual swinging-thigh clearance. Both have regression coverage; no extra cloth solver or morph targets.
- Final checks: 33 domain tests, 17 runtime scripts, TypeScript, ESLint and production build pass. Fashion gallery exercises all64 combinations; visual review covers56 shots/45 intermediate pose checks plus a final8-shot gait recheck. No browser/WebGL errors in those runs. Implementation and review complete; immutable release packaging follows.
