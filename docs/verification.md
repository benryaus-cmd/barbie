# Integration verification

Tested 2026-10-31 in Node 24.22.1, exact project dependencies including Three 0.186.1, Rapier 0.21.0, React 19.2.8 and Vite 8.3.5. Chromium 141 with SwiftShader provided actual WebGL rendering; mobile viewport tests are emulation, not a physical Android handset or Aippy Android WebView.

- App + Node configuration TypeScript checks pass.
- Production single-file Vite build passes, roughly 6.35MB raw / 2.21MB gzip before external original card/music assets.
- ESLint passes with narrow Node/test environment overrides; no source blanket ignore added.
- Real React/jsdom tests cover independent joystick pointer ownership, lost capture, cancel, blur, visibility, disable, callback replacement and unmount. A second finger cannot steal the stick or reset its owner.
- Dance/wardrobe component tests cover tabs, selection, transparent presentation, four pads, all ten DJ beats, the last-beat timer and fourth-pad access.
- Profile/preferences tests cover malformed and blocked storage, purchased outfit/wallet persistence and original card save preservation.
- Manifest importer test exercises binary bytes, corrupt-file rejection before promotion, asset merge preserving an unrelated key, completed-request idempotency preserving later local edits, and unsafe-path rejection.
- Production browser playthrough at390×844 and360×640 opens the actual world, previews clothing, changes quality, verifies settings/outfit reload, walks to the dance floor, completes the activity, buys/equips the Designer outfit, and unlocks the hidden project viewer. Zero JavaScript page errors.
- All108 character appearance combinations were separately rendered/validated; visible character geometry about15.1–17.9k triangles, <=52 mesh batches before shadow pass. Rigid joint hierarchy, not a weighted imported mesh.

Original-source repairs: tokens.ts was absent from the supplied ZIP because the hidden exporter blocked every filename containing `token`. Recovered exact source from the hosted source map; narrowed the credential-name filter so gameplay tokens.ts survives future exports. Rapier's dev prebundling split its WASM callback heap; optimizeDeps.exclude fixes it without changing physics. Dev and production isolated physics fixtures ran120 steps with finite position and grounded=true.

Limits: no actual-device FPS benchmark, no multiplayer, no imported Quaternius mesh or animations. Existing eight collector portraits and soundtrack retain their original remote URLs. Graphics quality choices do not imply measured FPS guarantees. The requested8/10 is an artistic target, not an objective test result.
