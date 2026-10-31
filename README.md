# Barbie: Ultimate Dreamland

A portrait-first fashion sandbox remixed by the_ham from Cats and Cubes' original Aippy game. Explore the Dreamhouse, Glam Beach and Fashion Avenue, play activities, earn style points, build a look and collect eight fashion cards.

## Develop

Use the project-supported Node runtime and `npm ci` (or `pnpm install`). Run `npm run dev`; use `npm run build` for the single-file production build. `npm run typecheck`, `npm run lint` and `npm test` run the checks. For the graphical smoke test, install Chromium with `npx playwright install chromium`, then run `npm run test:browser`.

Touch: left stick moves; drag the world with a second finger to look; use Style, Jump and Play on the right. Keyboard: WASD/arrows, Space, E. The top-right cog contains graphics presets, sound, accessibility and About. Wardrobe and dance use front-facing presentation cameras with unobscured characters.

## Upgrade

The old capsule figure is replaced with an original articulated fashion doll, shaped clothes, three hairstyles, footwear, accessories and secondary animation. It is a rigid joint hierarchy, not an imported weighted/skinned mesh. See [asset references](docs/asset-references.md) for the actual implementation and researched Quaternius/GitHub alternatives. No external character models or motion clips are bundled.

Progress uses the original collector-card key plus new isolated profile/preferences keys. No saves are cleared. Low graphics reduces rendering resolution to0.8×, disables shadow rendering and sparkle particles. Balanced/High increase resolution and enable soft doll shadows; the actual device pixel ratio still caps the result.

See [finalgoal.md](finalgoal.md), [verification](docs/verification.md) and [GITHUB_IMPORTER.md](GITHUB_IMPORTER.md). The importer is inactive by default. Use [AIPPY_IMPORT_COMPLETE.txt](AIPPY_IMPORT_COMPLETE.txt) (or the shorter [AIPPY_UPDATE_PROMPT.txt](AIPPY_UPDATE_PROMPT.txt) when the importer is already installed) for a specific commit-pinned update; normal subsequent builds preserve later Aippy edits.

Original project collector portraits and music still use their original Aippy CDN URLs. This is an unofficial fan-game remix; retained artwork and brand ownership are unchanged.

## Social summer update

Mix eight tops and eight bottoms, recolor them independently, and layer five extras together. Five hair/shoe styles and nine explicit poses let you build a signature look. Meet six named residents, build friendships, stroke Mochi and buy fetch toys. The pool now has moving water and floating friends; sunset and a bounded patio light show set the mood.

The surf shack launches a real3D board ride. Sunset Sips uses an actual glass fill/target game with graded pours. The camera gently follows walking direction while preserving stationary manual views.

The camera button captures actual scene photos with residents or your pet. Keep12 memories, write captions and share them to fictional offline DreamFeed. Fresh look/pose/place/co-star combinations earn followers that unlock special fashion. Your old wallet, full-set purchases and collector-card saves migrate without reset. See [v2 verification](docs/v2-verification.md) for actual checks and limits.
