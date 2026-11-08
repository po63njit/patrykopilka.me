# Publication checklist

## Release contents

- Orbital home with moving planets around the cube and a green/black SVG wave background with stronger touch interaction.
- Systems profile About page.
- Intentionally sparse résumé, containing only the approved IBM sentence and May 18, 2026 start date.
- Project placeholders; original project source and data preserved in `docs/archive/` and Git history.
- Navigable all-posts blog list and consistent draft filtering.
- No review hub, alternate designs, or private-preview controls in the production build.

## Checks

Run the commands in the README from the repository root. The CI workflow runs the same web unit tests, focused TypeScript check, production build, static-output tests, and existing API tests. The focused TypeScript check is not a full Astro diagnostics or accessibility audit.

The pre-wave deployment baseline is `6a70dc56aa7011c8314bbe7d1c3e8d0ffd581017`. The existing Cloudflare Pages project is `patrykopilka-me`; previous pull requests show successful automatic Pages preview deployments. The production domain is `https://patrykopilka.me`.

Do not deploy the Hono API for this web-only change. Do not create a new hosting project, change DNS, or add credentials. After publishing the tested commit through the existing integration, verify the live domain, all five navigation destinations, the first blog post, orbit pause/resume and keyboard focus, the bundled `/licenses/wodniack-waves.txt` attribution, and that `/explore/` is not deployed. Touch response has automated coverage; do not claim a physical-phone test without performing one.

## Rollback

If the live release fails, use the existing Pages deployment rollback control to restore the previous known-good deployment, or prepare a revert of the release commit on `main` and let the existing integration rebuild. Confirm the selected deployment or revert commit before proceeding; do not force-push or discard later user changes.
