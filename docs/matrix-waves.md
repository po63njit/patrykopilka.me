# Matrix-green homepage waves

The moving rays are replaced by an adaptation of Antoine Wodniack's **Wavy Lines / SVG version / Multiple paths**:
https://codepen.io/wodniack/pen/abeMZXQ

The design retains the original SVG strings, Perlin-driven wave displacement, and cursor spring response. It is not Matrix character rain. Only the backdrop changes; the orbiting navigation, central cube, copy, and other pages remain intact.

## License

CodePen declares public Pens MIT licensed: https://blog.codepen.io/documentation/licensing/
The Pen was publicly readable and marked public on November 7, 2026. Its author is Antoine Wodniack. The readable source did not expose a reliable creation year, so the copyright notice keeps the author without inventing a year. The full MIT notice and source URL ship in `apps/web/public/licenses/wodniack-waves.txt` and the adaptation is attributed in the source. The Pen's external Noise dependency is not copied or loaded: a small independent seeded gradient-noise implementation is included locally.

## Behavior and accessibility

- Bright green and forest-green strings on nearly black, with lower contrast behind text.
- Server-rendered SVG provides the static background if JavaScript is unavailable.
- The existing Pause motion control governs both the orbits and waves.
- The OS reduced-motion preference starts paused; explicit Resume can opt in.
- Hidden tabs and offscreen backgrounds stop their animation loops.
- The wave effect is capped at 30fps, 151 paths, and 41 points per path; mobile has fewer strings.
- Mouse, pen, and single-finger gestures bend the waves. Touch uses passive touch listeners so the response can continue after a browser cancels pointer events for native scrolling. Coordinates use fresh element bounds while scrolling.
- Touch bending is tuned separately from mouse/pen: a 225px influence radius (previously 175px), 0.0018 force coefficient (previously 0.00065), faster finger tracking, and a 140px per-axis displacement cap. The response profile stays in effect after release so it eases back rather than snapping to the smaller mouse limit.
- Lifting/cancelling a touch releases the effect; multi-finger gestures are left to native pinch zoom. No event is cancelled, no pointer is captured, and touch-action stays auto, preserving scrolling and link taps.
- The decorative SVG is hidden from assistive technology and cannot intercept links or focus.
- Resize rebuilds paths without accumulation, and Astro swap cleanup disconnects listeners/observers.

## Historical validation (Matrix-wave release)

The results below describe the earlier wave release, not the current test count or a fresh audit. Use [validation.md](validation.md) for ongoing checks.

Passed: production build, strict TypeScript (`check:orbit`), 25 source/unit tests, 5 production-output tests, and 3 API tests.
Browser QA: desktop rendering, mobile 375px content area (390px frame with scrollbar), no horizontal overflow, all four orbit links in bounds, pause freezes wave paths, resume animates, and Projects navigation/Back retains the homepage. No application console errors were observed (an unrelated browser-extension metadata warning was present).
Reduced-motion, offscreen/hidden suspension, single-finger deformation, passive input, tap pass-through, scrolling coordinate offsets, touch cancellation, multi-finger release, pointer deformation, bounded rendering, resize and cleanup were exercised by unit tests. Browser checks at 375px confirm no horizontal overflow, touch-action auto, pointer-events none on the decorative background, pause/resume and Projects/Back navigation. Touch-specific behavior was tested with simulated event data in unit tests, not on a physical phone. Browser device emulation was unavailable because organization policy blocks DevTools; no workaround was attempted. A physical-phone and cross-browser performance check remains unperformed.

A repeatable 96px horizontal finger swipe at 375px width produced a 117px peak bend, versus 32.3px with the prior touch settings (about 3.6 times the displacement in this simulated case). Regression tests assert a prominent bounded bend, complete settling after release, and finite displacement during rapid repeated gestures. Native scrolling and touch listener behavior are unchanged. This measurement is from simulated input, not a physical-phone test.

The production build excludes the review routes. See [publication.md](publication.md) for release and rollback checks. Review screenshots were local artifacts and are not included in this repository.
