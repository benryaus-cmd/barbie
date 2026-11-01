# Natural walk and hip contact correction 6.1

The v6 fixed-height pelvis kept both knees forward, including at rest. Relaxed arms used a wide outward/forward elbow hint with wrist targets far from the body. That produced the user's crouched, backward-elbow, gym-bro walk. The hand-on-hip target also deliberately floated outside the hip.

The pelvis now follows the supporting leg's reachable extension, allowing a straighter planted leg through mid-stance and a longer restrained step. Relaxed arms use a forward-flexing elbow and shoulder swing opposite the advancing same-side leg. Default arm spacing is narrower; wide skirts receive only a small additional allowance. Photo poses with hip hands share a palm orientation and target at the side of the actual hip. Thigh/knee skin has slightly fuller depth; the lower calf remains compatible with the fitted boots.

Regressions first reproduced the forward resting knee and flattened thigh, and now check relaxed elbow width/direction and actual palm-to-hip surface distance. The old controller test that required every hand to stay over25cm from centre encoded the overly wide arm problem; it now checks a narrow relaxed range, while the integrated gown check retains its additional room.

Validation:34 unit tests,26 runtime suites, typecheck, lint and production build pass. Compared a full cycle from side/front/rear before and after, plus idle/peace/kiss/confident/over-shoulder poses (46 renders). A genuine keyboard walk in the island moved the avatar through the world; browser checks report no page/render errors. Six-skirt front/rear coverage, fitted pants and boots still pass. Current fast traversal, controls, poses, rig sockets, carry/swing API and saves are preserved.
