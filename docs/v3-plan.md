# Golden Hour Implementation Plan

Goal: make movement easy, the world richer and the fashion/social/activity loops worth returning to.
Architecture: extend current single renderer, explicit engine methods and bounded version-compatible local saves. Tech: React, TypeScript, Three, Rapier, Vite. Spec: docs/v3-design.md.

- [x] Camera: reanchor a steady movement basis on deliberate input direction changes; delay/distance and reverse follow gate, photo orbit/zoom. Verify brief reverse movement preserves view.
- [x] World: match ground collider footprints, rebuild stair passage/landing, subtle reusable textures and sunset props, salon/makeup spots. Verify real Rapier traversal.
- [x] Style: new hair/accessories, face/hair appearance, saved sets, premium dyes and lively poses. Verify migration and outfit meshes.
- [x] Photos: keep player in every composition, add Ken/group/paired poses, independent co-star pose, framing gestures, follower tiers. Verify photo ledger and actual scene captures.
- [x] Pet: default bed, explicit follow/return/whistle, recover previous mode after photo. Verify commands and render.
- [x] Activities: actual aimed/charged netball, fair finite rewards for surf/pour/netball. Verify scoring and input release.
- [x] Integrate new methods, panels, wallet caps and HUD space. Run automated checks and short-viewport browser playtest; fix findings.
- [x] Publish source and exact manifest, live-check importer preservation and same-request skip, update activation prompt and evidence.
