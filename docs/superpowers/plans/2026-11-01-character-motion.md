# Character Motion Foundation Implementation Plan

> **For agentic workers:** Use the current session's scoped parallel module ownership, then integrate and review. Steps use checkbox syntax for tracking.

**Goal:** Fit character details closely and build natural, expressive, equipment-ready movement on the existing doll.

**Architecture:** Reuse Three.js, current body proportions and wardrobe. Add an actual surface sampler, native body-bone mapping, articulated hands/boots and a layered pose controller. Preserve old public methods and save keys.

**Tech Stack:** Existing React/TypeScript/Three.js/Rapier/Vite; no new runtime dependencies.

**Spec:** docs/character-motion-v6-design.md

## Global Constraints
- Keep existing fixed body size, all nine hairstyles, wardrobe ownership, photo saves, controls and hidden project utility.
- No full cloth solver, second game tree, second renderer or new runtime packages.
- Existing avatar methods remain compatible; new rig/actions are additive.
- Use uniquely named pinned Aippy update prompt and verify live import.

## Review Focus
- Details must fit from side angles, including animated lips and jewellery over different tops.
- Boots must follow both calf and ankle without leg breakthrough or binding when seated.
- New gait must preserve garment coverage and foot contact across speed/start/stop/turn states.
- Finger/socket/action transforms must remain stable through poses and carry/swing overlays.
- Pose IDs must persist in photos and reach both emote and photo menus without native dropdowns.

## Tasks
- [x] Surface fitting: regression tests, actual triangle sampler, lips and selected-top necklace binding; integrate shirt appliques.
- [x] Boots: actual calf envelope and knee/ankle weighted footwear; pose/fit tests.
- [x] Hands: weighted articulated fingers, gesture states, grip sockets; transformation tests.
- [x] Motion: reusable natural gait/idle and expressive pose/tool layers; contact/transition tests.
- [x] Root integration: canonical bone map, compatibility wrappers, pose catalogue/UI/save validation, equipment API and documentation.
- [x] Verify: focused rendering/animation checks, relevant/full regression suite, type/lint/build, independent review and fixes.
- [ ] Release: push source, generate immutable manifest, verify live importer, publish uniquely named Aippy prompt.


Review identified a 42-degree first/last-frame arm snap for empty-hand swings. Held-mode transitions now use a .32s smooth quaternion blend, with anticipation/recovery windows and regressions for none/one/two-hand changes. Settled two-hand grips retain exact shared-shaft IK. Fast island traversal intentionally retains a normalised stylised gait; no world-space foot-lock claim is made.
