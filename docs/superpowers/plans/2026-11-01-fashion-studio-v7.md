# Fashion Studio7 implementation

Reuse the existing React/Three.js game and its build-time manifest importer. Root owns Look schema/catalogue/save/UI/camera/publishing; workers own avatar materials and pose/composition modules.

- [x] Add optional style fields and shared sanitisation; preserve set/photo migration and old reward identities.
- [x] Add procedural cloth finishes/prints, isolated accessory colours and two-tone hair to actual avatar materials.
- [x] Add six reference-inspired solo poses and five real duo compositions, including seated garment support.
- [x] Add wardrobe finish/print/accent/accessory controls, expanded palette and two-tone salon controls.
- [x] Add bounded camera pan, collapse/clean photo view and actual callback plumbing.
- [x] Test scene materials/poses and phone UI, run meaningful regressions/type/lint/build and review fixes.
- [ ] Publish source/manifest/pinned uniquely named prompt; verify real downloads, asset merge and repeat preservation.

Review: no shared-material recolour leaks; old looks/signatures still load; new fields survive sets/photos; shader variants compile and don't rebuild each frame; true pair transforms and seated cloth; collapsed view doesn't block shutter/restore; camera controls remain multitouch-safe.

User steering: restore the earlier6.8phase venue dance separately from the photo Dance pose. Verified separate animated choreographies. Review found minimisedcapture still croppedto62%; fixed additive full-frame flag and verified real saved JPEG dimensions. Actual renderreview caught and fixed standing thigh clipping before release.
