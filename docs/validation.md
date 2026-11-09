# Validation

Run the ordered commands in the [README](../README.md#check-a-change). The [CI workflow](../.github/workflows/ci.yml) uses Node.js 20 and runs on pull requests and pushes to `main`.

## What the checks cover

- `web test`: approved content, selected page designs, orbit controls, focus/reduced-motion behavior, wave interaction simulations, byte-lab parsing, and private-content boundary checks.
- `web run check:orbit`: strict TypeScript checks for the interaction scripts and experience data. This is **not** a full Astro project check.
- `build:web`: private-content preparation, content schema validation, Astro compilation, static routes, and processed assets.
- `web run test:build`: generated route list, headings/IDs, internal page links/assets, canonical URLs, selected content, planet artwork, and the bundled wave license.
- `api test`: TypeScript compilation and Hono route tests. The Durable Object binding is mocked; these tests do not verify real Cloudflare persistence, concurrency, or deployment.

There is no configured lint script, full accessibility audit, or automated browser suite. Unit tests with simulated touch events do not replace a physical-phone test.

## Browser checklist

Use `npm --workspace web run preview` after a fresh build, then repeat the relevant checks on the Pages preview:

- Open Home, About, Projects, Résumé, Writing, and a blog post. Check navigation, Back/Forward, and narrow-screen overflow.
- Tab through links and the motion control; confirm visible focus and usable targets.
- Pause and resume animation. Check the initial reduced-motion setting and background-tab behavior after interaction changes.
- For gesture changes, check a real touch device: swipe response, scrolling, pinch zoom, link taps, and cancellation.
- Confirm `/licenses/wodniack-waves.txt` is available and `/explore/` does not show a review interface.

Report the commit, commands, and browser/device coverage actually tested. Keep release-specific results in the PR rather than treating old counts or screenshots as evidence for later changes.

## Common failures

- **`test:build` cannot find `dist/` or sees old content:** run `npm run build:web` first.
- **A new post fails the route/latest-post tests:** set `BLOG_EXPECT_ARTICLES` as described in [private article publishing](private-articles.md).
- **Canonical URL assertion fails:** check the `site` value in `apps/web/astro.config.mjs` and the expected domain in `test/build.test.mjs`. The current config does not load `PUBLIC_SITE_URL` overrides from shell or `.env`.
- **Astro reports legacy content collections:** the repository currently uses `src/content/config.ts`. Migration is separate work; do not change the schema just to hide a warning.
