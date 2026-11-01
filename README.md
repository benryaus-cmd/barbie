# Barbie: Ultimate Dreamland

A portrait-first fashion sandbox remixed by the_ham from Cats and Cubes' original Aippy game. Explore the Dreamhouse, Glam Beach and Fashion Avenue, play activities, earn style points, build a look and collect eight fashion cards.

## Develop

Use the project-supported Node runtime and `npm ci` (or `pnpm install`). Run `npm run dev`; use `npm run build` for the single-file production build. `npm run typecheck`, `npm run lint` and `npm test` run the checks. For the graphical smoke test, install Chromium with `npx playwright install chromium`, then run `npm run test:browser`.

Touch: left stick moves; drag the world with a second finger to look; use Style, Jump and Play on the right. Keyboard: WASD/arrows, Space, E. The top-right cog contains graphics presets, sound, accessibility and About. Wardrobe and dance use front-facing presentation cameras with unobscured characters.

## Upgrade

The original fashion doll now combines articulated pose joints with continuous weighted limb skin, weighted skirts and spring-bone hair. Nine hairstyles, mixed clothing, footwear, layered accessories and expressive face choices remain editable. See [asset references](docs/asset-references.md) for the actual implementation and researched Quaternius/GitHub alternatives. No external character models or motion clips are bundled.

Progress uses the original collector-card key plus new isolated profile/preferences keys. No saves are cleared. Low graphics reduces rendering resolution to0.8×, disables shadow rendering and sparkle particles. Balanced/High increase resolution and enable soft doll shadows; the actual device pixel ratio still caps the result.

See [finalgoal.md](finalgoal.md), [verification](docs/verification.md) and [GITHUB_IMPORTER.md](GITHUB_IMPORTER.md). The importer is inactive by default. The current release is [Character Motion Foundation 6](AIPPY_MOTION_FOUNDATION_V6_0f982a3.txt). Use [AIPPY_IMPORT_COMPLETE.txt](AIPPY_IMPORT_COMPLETE.txt) (or the shorter [AIPPY_UPDATE_PROMPT.txt](AIPPY_UPDATE_PROMPT.txt) when the importer is already installed) for a specific commit-pinned update; normal subsequent builds preserve later Aippy edits.

Original project collector portraits and music still use their original Aippy CDN URLs. This is an unofficial fan-game remix; retained artwork and brand ownership are unchanged.

## Social summer update

Mix eight tops and eight bottoms, recolor them independently, and layer five extras together. Nine hairstyles, five shoe styles and an expanded living pose library let you build a signature look. Meet six named residents, build friendships, stroke Mochi and buy fetch toys. The pool now has moving water and floating friends; sunset and a bounded patio light show set the mood.

The surf shack launches a real3D board ride. Sunset Sips uses an actual glass fill/target game with graded pours. The camera gently follows walking direction while preserving stationary manual views.

The camera button captures actual scene photos with residents or your pet. Keep12 memories, write captions and share them to fictional offline DreamFeed. Fresh look/pose/place/co-star combinations earn followers that unlock special fashion. Your old wallet, full-set purchases and collector-card saves migrate without reset. See [v2 verification](docs/v2-verification.md) for actual checks and limits.

### Golden Hour

Personal outfit sets, nine salon hairstyles and hair dye, five makeup looks, twelve stackable accessory types, Ken, group and paired photographs, photo orbit/zoom, explicit Mochi follow/home/whistle, five-shot 3D netball and balanced activity rewards. DreamFeed milestones apply a capped 1.0–1.5× style-point multiplier. The world adds matching beach ground collision, comfortable stairs, a salon and warmer textured resort scenery.

### Resort Life

Shared photo/style orbit and pinch zoom; clean camera view; preserved character heading; reversible indoor cutaway; embedded viewport HUD fixes. Ken/Brooklyn/Nikki/Daisy walk and pause to greet. Beach volleyball rallies against Coco return alongside a separate netball court. New flower-heart portrait garden, coastal lifeguard lookout and sunset pier create distinct photo destinations.

### Character Atelier

Continuous elbow/knee skin, six weighted skirt silhouettes with authored riding/crouch fit, spring-bone hair, softer micro surfaces, improved faces and configurable eyes/lips. Vehicle contact points drive hands and feet. Geometry authoring is cached for reuse; Low keeps one detailed resident. See [release notes and verification](docs/character-atelier-release.md); `npm run test:characters` renders the character regression gallery.

Character Atelier 5.1 repairs the sewn shorts/trouser hips and crotch, places a gently moving necklace outside all eight tops, and adds front/rear/side walking clearance to all six skirt silhouettes. `npm run test:fit` renders low-angle pants and rear/front gait views.


## Character motion foundation 6

Native mapped body bones, articulated fingers, fitted knee/ankle boots and a layered walk/idle/pose controller now support the current doll. Shirt appliques and animated lips follow the actual underlying mesh; necklaces fit the selected top. Six additional emotes reach both player and friend photo choices. Additive grip/carry/swing hooks prepare the same avatar for future equipment. See [rig API and limits](docs/avatar-rig-v6.md). No jungle gameplay is added to this island.
