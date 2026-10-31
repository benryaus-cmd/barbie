# Resort Life verification

## Behavior delivered

The live React/Three game now fills the containing Aippy frame rather than using a larger browser viewport or unbounded safe-area padding. Follower progress sits under the HUD menu; the movement pad and action buttons stay six pixels above the game edge. Shared transparent camera controls support drag/pinch/zoom in photos, wardrobe, salon and makeup without a visible hint or framing border.

Photo/style presentation retains exploration facing, including co-star and pet offsets. Rendered wall/decor occluders are temporarily cut away and restored. Broadphase uses cached static mesh bounds and local ray checks; static batches are limited to12m cells and12m horizontal extents, preventing a local cutaway from hiding resort-wide furniture. Targeted tests cover camera-inside-wall rays, restoration and distant mesh exclusion. A same-fixture Node comparison reduced mean cutaway update2.126ms→.263ms; this is a CPU measurement, not a phone frame-rate claim.

Volleyball against Coco has actual3D movement, timed returns, aimed/powered outgoing ball trajectories, NPC reactions and first-to-five/60-second completion. Netball remains at a separate court. Ken, Brooklyn, Nikki and Daisy walk short routes, pause nearby, chat and resume after photo staging. New garden, lifeguard/lookout and sunset pier provide walkable photo destinations. Photo/style hides activity markers and collectibles; world view restores them.

## Checks

- Typecheck, ESLint, Vite production build and diff checks pass.
- 30 domain tests and11 runtime suites pass, including all existing save/input/activity coverage and new shared controls/camera/resident/volleyball checks.
- Real Chromium direct and embedded360×520/800 layout fixture uses CDP80px/90px safe-area overrides: actual game height matches frame, HUD top6px and controls bottom6px.
- Actual-app browser script scripts/browser-check-v4.mjs passed all seven sections with zero page/shader errors. It exercises embedded layout, default indoor wardrobe/salon/makeup framing, drag/keyboard/wheel/real two-contact touch pinch, two nonzero photo headings, group rotation, actual resident motion/near/chat/resume, both venue positions, scenic captures and a volleyball match against the NPC with an actual successful timed return.
- A final three-section supplement passes after cutaway optimization, explicitly checking marker/collectible hide and restore. Main report plus supplement are in docs/v4-browser-result.json.
- Actual Rapier traversal covers both sport markers, flower marker, full L-pier approach/end and ground-to-lookout stairs through the door with no jump. Evidence is docs/v4-world-evidence.json.

## Limits

Tests use desktop Chromium/SwiftShader at phone viewport sizes, not physical Android hardware. Test-only transforms expose state reads and teleport to actual locations; the controller, score, clock, renderer and production callbacks remain unchanged. The volleyball browser run proves player return/NPC scoring/finite collection; deterministic tests additionally cover a controlled player win. Existing remote BGM delivery is not verified in this environment. New props are original procedural3D geometry with shared textures and bounded instancing; no commercial character asset import is claimed.
