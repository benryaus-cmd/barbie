# Resort Life — fourth pass

Preserve the existing world, saves, style catalogue and Aippy import architecture. Fix the actual embedded viewport and indoor presentation bugs before adding atmosphere.

- UI: size to the host containing frame, bounded edge spacing, follower strip in HUD, no joystick overlap. Remove photo hint and border. Share invisible orbit/pinch/zoom controls across photos and wardrobe/salon/makeup.
- Camera: retain exploration heading on presentation entry, rotate group/pet positions consistently; maintain full-body framing with indoor occluder cutaway and safe world camera collision. Restore all hidden objects on exit/disposal.
- Activities: restore beach volleyball with an NPC opponent and actual ball trajectories/rallies, steer and time returns; retain netball at a separate supported court and preserve fair payouts.
- Life: short safe resident routes with actual walking animation, near-player/chat/photo pauses and nearest interaction based on current positions.
- Atmosphere: cohesive flower/heart photo garden, lifeguard/surf detail and sunset pier/viewing destination with lighting and planting. Keep mobile effects bounded.
- Verify actual embedded360×520 and360×800 frames, indoor wardrobe/salon/makeup, preserved photo facing and style gestures, resident motion and both physical courts; typecheck/lint/build and focused regressions. Publish exact pinned manifest and update prompt with live importer verification.

Implementation extends the existing React/Three/Rapier tree. Independent workers own UI controls, camera/sandbox, volleyball, world scenery and residents/pet; parent integrates App/PhotoStudio/types and handles release.
