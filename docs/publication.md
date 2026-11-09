# Deployment and rollback

## Existing hosting

- **Production:** [patrykopilka.me](https://patrykopilka.me)
- **Web host:** Cloudflare Pages project `patrykopilka-me`, connected to this GitHub repository.
- **Production branch:** `main`; branch/PR builds receive Pages previews through the existing integration.
- **Repository build contract:** from the repository root, `npm run build:web` produces `apps/web/dist/`.

The GitHub `ci` workflow validates the code; it does not deploy the API. Cloudflare manages the web deployment separately. Build/root-directory settings live in the existing Pages dashboard, not a web deployment config in this repository. Confirm them there before changing hosting; do not create a replacement project or alter DNS for an ordinary release.

## Release a web change

1. Work on a branch, run the [validation checks](validation.md), and open a PR.
2. Check `build-web` and `Cloudflare Pages` for the exact PR commit. Review the Pages preview linked by the Cloudflare check/comment.
3. Record the current production commit and known-good Pages deployment before release.
4. After review and approval, merge to `main`. This triggers production publishing through the existing integration, including for documentation-only merges unless hosting build filters say otherwise.
5. Verify the checks for the merged commit, then smoke-test the live domain, navigation, blog, motion controls, assets, and license notice. Do not rely only on a green build.

Website-only changes do not require `deploy:api` or DNS changes. This private-article integration additionally needs the approved production-only read credential described in [private article publishing](private-articles.md). Do not merge its first release before verifying that configuration. Public PR previews intentionally omit private manuscripts; review the full article locally or in an owner-private review site.

## Roll back

Choose the previous **verified production deployment**, not an arbitrary old commit.

**Restore service:** in the existing Cloudflare Pages project, open the known-good production deployment and use its rollback control. Confirm the selected deployment and any warning before applying it, then verify the live domain. See [Cloudflare's rollback guide](https://developers.cloudflare.com/pages/configuration/rollbacks/).

**Repair the source:** a dashboard rollback does not revert Git. A subsequent `main` build can reintroduce the problem, so prepare a revert PR as well:

```bash
git switch main
git pull --ff-only
git switch -c revert/site-release
git revert <release-commit-sha>
# Run the README checks, then push the branch and open a PR.
```

Use a clean working tree and replace the placeholder with the confirmed release commit. The command above is for a single-parent or squash commit. A true merge commit requires an explicitly selected mainline, usually `git revert -m 1 <merge-commit-sha>`; inspect its parents first. Resolve conflicts without discarding later work. Review and merge the revert, then verify the resulting production deployment.

Do not force-push `main` or reset away unrelated changes. Test a revert in a disposable local worktree if uncertain. A local revert rehearsal verifies Git recovery only, not Cloudflare's dashboard rollback or live service recovery.

## Optional API

`apps/api/wrangler.toml` configures Worker `patrykopilka-api`, the `COUNTER_DO` binding, and the `v1` SQLite Durable Object migration. KV, D1, and R2 blocks are commented examples, not active resources.

`npm run dev:api` uses Wrangler's local runtime. `npm run deploy:api` deploys the Worker to the authenticated Cloudflare account and requires the intended account's authorization. It is a separate production action, not a web build step. Verify the target account and bindings first; never commit credentials or local Wrangler state. Existing tracked local-state files are not a production backup.

Worker rollback and data migration recovery are separate from Pages rollback. Do not change the existing Durable Object migration tag to undo a deployment or assume reverting code restores stored counter data.
