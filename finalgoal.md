# Barbie: Ultimate Dreamland — final goal

Keep the existing tropical toy world: open Dreamhouse, rooftop pool and slide, Glam Beach, Fashion Avenue, pink vehicles and playful activities. Upgrade the existing React + Three.js game directly, with one root and the same save keys. Target a polished portrait mobile fashion sandbox; an 8/10 is the artistic target, not an objectively verified rating.

## Direction
Use the exploration and activity variety of Barbie Dreamhouse Adventures, the immediate outfit experimentation of Barbie Fashion Designer, and a collectible album with rarity, location clues and a satisfying discovery moment. Preserve the world rather than replacing it with a menu-led dress-up app. Improve doll silhouettes, facial features, clothing detail and articulated animation while keeping a bounded mobile rendering budget.

Considered: wholesale replacement with downloaded characters (asset retrieval and clothing compatibility risk); retaining primitive figures with cosmetic shading only (too weak); improving the character rig, wardrobe presentation, lighting and world composition together (chosen under the user's artistic licence). Investigate Quaternius base characters, modular women and compatible animation libraries, plus public GitHub examples. Document actual provenance and licensing. Never claim downloaded models were integrated if they were only researched.

## Required result
- Android: joystick owns one pointer, touch-action none, independent camera finger, cancel/lost capture/blur/modal/unmount always clear movement. Keyboard desktop controls too.
- Dance/DJ: compact bottom controls, unobscured dancer and a dedicated stage camera; no dark full-screen backdrop over the dance. Leave room for real play on 360 x 640 and tall phones.
- Layout: compact HUD, safe area and dynamic viewport sizing, readable 44px actions, scrollable sheets without horizontal overflow. No native dropdowns.
- Characters: recognisable styled doll, expressive eyes, multiple hairstyles, believable shoulders/elbows/hips/knees and animated clothing/accessories. Wardrobe must allow seeing the character while selecting.
- Rendering: warm key light, cool sky fill, filmic colour, contact shadows and better material roughness; retain pink/turquoise/gold palette. Avoid heavyweight post-processing and unbounded lights.
- Collection: keep eight existing card IDs and images; add descriptive identities, rarity and clues, a clearer world pickup and discovery reveal, durable album progress.
- Progression: persist earned points, wallet, owned outfits and selected look; do not clear existing card saves. Clear earn/spend loop and an obvious next thing to do.
- Preserve all existing activities, hidden developer viewer, secret unlock and ZIP export.

## Verification and delivery
Run type/build/lint checks; exercise movement including two pointers and release edge cases, wardrobe, dance visibility, collection and save reload. Inspect actual screenshots where WebGL is available and report environment limitations honestly. Commit source to benryaus-cmd/barbie, then generate a separate immutable manifest commit whose files point to the exact source commit, with byte sizes and SHA-256. Supply a precise Aippy activation prompt for the existing importer; direct src/public overwrite, no extra game tree or React root, preserve host tooling and merge asset registry only as needed.

## Settings addition from user follow-up
Keep the cog in the compact menu cluster without displacing world controls. Preserve the existing ten-tap Settings-title developer unlock/password and ZIP viewer. Add persistent Low/Balanced/High quality presets affecting real resolution, particles and shadows, plus music/effects toggles, reduced UI motion and camera sensitivity. Add an About tab crediting the_ham's one-prompt Aippy remix of Cats and Cubes' original, with a light joke. Keep developer access unadvertised.
