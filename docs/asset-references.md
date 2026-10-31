# Character art, rig and source references

Research date: 2026-10-31. The shipped doll is original procedural geometry in `src/game/avatar.ts`. **No Quaternius, GitHub character mesh, third-party animation clip, texture, or external model binary was downloaded or integrated.** The references below were investigated as alternatives. They are not an asset inventory for this build.

## Actual implementation

A segmented fashion-doll hierarchy replaces the former single capsule limbs and spherical hair helmet:

- Sole-relative root → pelvis → waist → neck/head. Facial details, three interchangeable hair assemblies, earrings, tiara and sunglasses follow the head.
- Pelvis → left/right hip → knee → ankle → interchangeable heels, sneakers or boots.
- Waist → left/right shoulder → elbow → wrist → palm, thumb and bracelet.
- Clothing follows the waist; denim shorts also follow each hip. Gown, wrap and pleated skirt have separate secondary-motion pivots; hair locks and earrings sway.

These are rigid `THREE.Group` joints, **not a weighted `SkinnedMesh`, a `THREE.Skeleton`, motion-captured animation, inverse kinematics, or an imported humanoid rig**. Procedural curves drive idle breathing, counter-swing gait, knee flexion, bent-elbow dance, celebration, sitting and airborne poses. Every update restores every joint target so leaving sitting or dance cannot retain an old pose. The public `createAvatar` API and all look IDs are unchanged.

Body and fabric use shaped lathed profiles rather than single cylinders/capsules. The head has a tapered chin, ears, layered almond eyes with irises/catchlights/lashes, brows, nose, lip shapes and blush. Hair has a rear shell, parted fringe and tapered swept locks. Outfit silhouettes are a piped satin gown with bow/buttons, crop top and beach wrap, star performance top with pleated lilac skirt, and heart top with articulated denim shorts. Shoes have separate silhouettes, laces, straps, trim or heels.

Materials are ordinary light-reactive `MeshStandardMaterial` surfaces. Fabric and skin have low metalness and appropriate roughness. Small gold accents use moderate metalness. There are no texture allocations, model requests, additional dependencies, lights or postprocessing passes in the avatar. Static details are merged by material within each rigid joint; geometries and materials stay attached to the root and are collected by the existing traversal disposal. Intermediate geometries are disposed after batching.

Original character geometry and motion are part of this project source; no separate third-party character license applies. The already-used Three.js runtime and its `BufferGeometryUtils.mergeGeometries` utility are MIT licensed: https://github.com/mrdoob/three.js/blob/dev/LICENSE . Retain the dependency's license when distributing it.

## Investigated alternatives (not shipped)

| Reference | Official page / repository | Published license / relevant facts | Decision |
| --- | --- | --- | --- |
| Quaternius Universal Base Characters | https://quaternius.com/packs/universalbasecharacters.html | Official page displays CC0; six humanoid bases, mix-and-match hairstyles, humanoid retargeting, about 13k triangles per model. | A good future weighted-rig path, but would require local asset ingestion, clothing fitting/coverage, texture audit and retarget validation. No pack file is in this build. |
| Quaternius Ultimate Modular Women Pack | https://quaternius.com/packs/ultimatemodularwomen.html | Official page displays CC0; ten characters, twenty-four animations, four interchangeable model parts and a humanoid-rig variant. | Modular body/clothing is relevant, but its existing silhouettes do not directly supply the four requested fashion looks. No pack file is in this build. |
| Quaternius Universal Animation Library | https://quaternius.com/packs/universalanimationlibrary.html | Official page displays CC0 and describes 120+ retargetable humanoid animations, including locomotion and sitting. | Consider alongside a future compatible weighted rig; current motion is original procedural posing. No clip is in this build. |
| Public no-Blender Quaternius merge example | https://github.com/NafisRayan/Animate-Rigged-Humanoid-No-Blender | Public repository demonstrates combining matching Quaternius character/animation skeletons. The repository's license was not independently established; public availability alone is not redistribution permission. | Reviewed as pipeline reference only. No repository code or redistributed assets were copied. |
| Official Three.js skeletal blending example | https://github.com/mrdoob/three.js/blob/dev/examples/webgl_animation_skinning_blending.html | Three.js code is MIT. Example references a separate Mixamo model; that model's provenance/license is distinct. | Reviewed for animation architecture only. No Soldier/Mixamo mesh or animation was copied. |

Licensing statements above describe the official pages viewed on the research date. Any future asset integration must verify the license supplied with the exact downloaded archive rather than assuming that a catalog or GitHub mirror is authoritative.

## Measured budget and validation

Chromium headless WebGL with SwiftShader rendered an isolated 480 × 760 portrait preview under warm key/sky fill lighting. Four outfit screenshots plus a dance screenshot were inspected. This verifies actual rendering in this environment, not frame rate or visual quality on a physical Android phone.

All 108 outfit × hair × accessory × shoe combinations were traversed with ancestor visibility respected:

- Visible doll geometry: **15,148–17,938 triangles**.
- Visible doll mesh batches: **at most 52**, before any shadow pass. Default gown/blonde/heels/no accessory: 16,536 triangles, 45 batches.
- Resident geometry for all alternate looks together: **29,872 triangles in 90 mesh geometries**. Hidden wardrobe choices do not render.
- Compared finite geometry/transforms across idle, walking, dance, sitting and airborne updates. Hip and knee rotations recover to within 1e-8 radians of idle after leaving an action.
- Verified named hip parent = pelvis and named shoulder parent = waist; knee/ankle and elbow/wrist are nested below their corresponding limb pivot.
- Isolated avatar TypeScript check passed, as did the esbuild browser bundle. Full application checks are reported by the integration task.

The polygon and draw budgets are measured source topology, not a performance claim. Shadow rendering adds another pass for shadow-casting meshes. No art rating is claimed as objectively verified.

## Social summer expansion (1 November 2026)
The same original rig now supports eight tops, eight bottoms with independent colors, five independently stackable accessories, five hairstyles and five shoe silhouettes. Explicit wave, peace, heart, kiss, twirl, dance, pet and surf poses supplement idle. Two-bone arm positioning brings hands to the face/chest for photos; articulated trousers have fabric coverage at their knee hinges. NPCs reuse detailed doll rigs at close range and cheaper silhouettes farther away. These additions remain original geometry/code with no external model or animation downloads. A conservative source-topology enumeration with all extras found a maximum19,120 visible triangles and129 mesh nodes for the default hair/shoes across64 garment pairs; actual render calls vary with culling, hair, pose and shadows. Earlier budget figures above describe the first pass, not this expansion.
