# Fashion Studio7

Ben requests more looks from existing clothing: independent accessory colours, richer fabric finishes, sparkle and prints, more colours, primary/secondary hair, more solo/duo poses based on supplied references, slight photo panning and a minimiseable pose panel for clean screenshots. Standing artistic licence and instruction to continue authorise routine choices without another approval stop.

Approaches considered: adding more clothing meshes (does not meet the stated efficient-variation goal); bitmap textures per colour/outfit (unnecessary downloads and memory); reusable procedural material variation on existing meshes (chosen). Keep the current rig/walk fixes, body, ownership and save keys. No new runtime dependencies.

Independent accessories must use dedicated materials, preserving lenses/skin/other items. Cloth gets original/matte/satin/gloss/metallic/glitter finishes and solid/stripe/dot/gingham/star/floral patterns with an accent colour. Hair gets a secondary dye plus streak/ombre/split layout. New optional look fields are sanitised consistently in wardrobe saves, sets and photos, and added only when set so older reward signatures remain valid.

New solo poses: chin frame, hair touch, crossed arms, leg pop, kneel, side sit. New duo compositions: back-to-back, linked arms, high-five, shoulder lean, editorial. Compose actual poses/spacing/headings for player and friend; retain old pairs and allow independent poses. Existing game camera needs bounded screen-plane pan, preserving orbit/pinch. Photo panel minimises to a small shutter/restore/exit bar with optional clean view; clean mode hides controls while preserving an unobtrusive way to restore. No visible instruction label over the image.

Verify live material changes from real WebGL, dyed hair in multiple styles, new pose silhouettes/group alignment, scrolling in360x520, saves and legacy signatures, camera pan/reset and collapse/restore/capture. Publish a unique pinned Aippy prompt and verified manifest after checks.
