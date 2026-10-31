# Dreamland implementation plan

Goal: deliver finalgoal.md in the existing source tree.
Architecture: React owns HUD/sheets and persistence; Three.js sandbox owns avatar, world and camera. Shared public GameHandle remains the boundary.

1. Establish original ZIP baseline in this empty repository, inspect Android pointer lifecycle and panel/camera flow. Build using existing compatible dependencies.
2. In parallel: improve avatar rig and art in avatar.ts; improve UI controls and dance/wardrobe layouts; improve world shading, pickups and camera framing. Each worker owns separate files.
3. Integrate in App.tsx: modal movement reset, persistent wallet/look, discovery reveal and better exploration direction. Preserve card key and hidden tools.
4. Verify build, typecheck and lint; run real pointer and save regressions and inspect portrait/landscape runtime. Correct material issues found.
5. Review combined diff. Commit source; generate and verify immutable Aippy manifest and activation prompt; publish to requested repository.
