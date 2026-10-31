# Golden Hour verification

The game remains a single Three canvas in the original React/Aippy tree. No new runtime dependencies, commercial meshes or remote character downloads were introduced. Characters use original rigid-joint geometry; the upgrades add nine hairstyle silhouettes, recolouring, makeup, accessories, blinking and fifteen pose states. Ken has an original male model with shirt/shorts and facial detailing.

## Automated checks

- TypeScript app/Node checks, ESLint, Vite production build and whitespace checks pass.
- 28 deterministic storage/gameplay/import tests pass, plus ten runtime suites covering joystick ownership, stage controls, photos/residents, activities, engine lifetime, camera, pet behavior/UI, steering and real Rapier traversal.
- Ground tests cover five formerly unsupported district edges; stairs ascend, enter the loft and descend without jumping.
- Netball scoring uses the same flight function as the preview arc and visible ball, including descending ball clearance through the ring.
- Held-direction steering is tested over 600 camera-yaw changes; changing stick direction deliberately reanchors to the current view. Short movement, reverse motion and manual orbit do not immediately trigger follow.
- Fashion render fixture covers64 garment combinations and9 distinct existing poses with no renderer errors. All9 hairstyles and15 poses also received finite-transform checks.
- Hidden Settings-title unlock and actual project ZIP download pass in Chromium.

## Browser gameplay

The reproducible script is scripts/browser-check-v3.mjs. It uses360×520 desktop Chromium/SwiftShader and test-only panel entry/location probes. Inputs, frame updates, captures, scoring and wallet writes remain the actual game implementation. It exercises salon/makeup, premium dyes, complete custom sets and reload, Ken chat, two co-stars, paired/independent poses, photo drag/zoom and actual JPEGs, publishing, pet following/bed/whistle, five netball shots and three precision pours. The structured result is docs/v3-browser-result.json. Supplemental runs verify the500-follower fixture changes an actual10-point award to15 and the final photo pose menus work without native dropdown windows.

The initial short salon layout collapsed its controls and the photo shutter clipped; both were fixed and their actual visible controls rechecked. Netball camera was reframed after visual inspection found the shooter clipped offscreen. Drink raw precision is separate from payout: a perfect three-glass session awards30 base style points, with a clearly shown follower bonus when applicable.

## Limits

Desktop SwiftShader is not a physical Android performance test. Browser panel probes do not prove the entire island navigation route; real ground/stairs use separate Rapier traversal checks. Existing remote music failed to fetch in the test environment, so device audio delivery is unverified. Album/feed are offline simulation on device. Screenshot verification supports the implemented original stylised models, not a claim of matching Mattel's commercial character assets.

## Pinned release import

The actual Node/Vite importer fetched the immutable Golden Hour manifest and all83 game files from GitHub, checked their sizes/SHA-256 hashes, merged all ten asset keys, retained an unrelated radio key and the host entry, and preserved a later App edit on a second build with the same requestId. Its temporary host created85 verified destinations including the asset registry and missing wrapper. This smoke test exercises the awaited config transaction; the real Aippy project still applies the supplied prompt and runs its own build. Metadata and proof are in docs/import-release.json and docs/import-verification.json.
