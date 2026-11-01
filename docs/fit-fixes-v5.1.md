# Character fit corrections 5.1

Repair the three defects shown in Ben's phone screenshots while preserving the Character Atelier upgrade and existing saves.

- Pants: fit the waistband/seat around the actual hip surface and close the missing crotch/underside; keep shorts and palazzo legs articulated.
- Necklace: route a hanging chain outside skin/clothes, anchor it at the neck and add restrained pendant movement.
- Skirts: cover the rear as well as front thigh sweep during walking. Previous allowance was gown-only and biased forward; regression checks now sample both directions on all six skirts.

Verify low-angle pants views, necklace over varied tops and front/rear walking phases, then publish a fresh immutable source manifest and uniquely named Aippy prompt. Keep the existing importer and one game tree.

Root-cause checks reproduced rear/front diagonal thigh exposure, not only centerline samples. Symmetric front/back and lateral panel allowances now pass5,206 actual thigh samples over all six skirts and twelve gait phases while retaining seated/crouched fit. Pants use a sewn branching surface with a saddle crotch; the chain follows the exterior surface of all eight tops.

Verification: full33-domain/20-runtime suite, TypeScript, ESLint and production build pass. Targeted render set covers56 views (pants low/front/rear, dance/surf/riding, necklaces over eight tops, front/rear six-skirt walking); final pants seam/trim refinements were rechecked separately. No JavaScript/WebGL errors in these runs. Review corrected opposing trim windings and isolated the double-sided stitch material from shared ivory. No save/schema/runtime dependency changes. Physical Android performance is not measured.
