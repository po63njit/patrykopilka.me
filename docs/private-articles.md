# Private article source, public writing

The portfolio/theme repository stays public. Article manuscripts and drafts belong in a separate **private** GitHub repository. Only rendered, explicitly published articles are served on patrykopilka.me. Public HTML and the code examples it contains remain readable and copyable.

## Content boundary

- `scripts/prepare-private-blog.mjs` fetches `published.json`, then only the files it names under `published/`.
- Every listed manuscript must have an explicit `draft: false` and matching `slug`. Unlisted drafts and companion source files are not fetched.
- The fetched set is pinned to one commit. The build verifies that its source repository is private.
- Generated manuscripts live in ignored `apps/web/src/content/blog/private/`. Rendered output stays in ignored `apps/web/dist/`. Do not force-add either directory.
- No Markdown-source download endpoint is published. Readers can still inspect the rendered HTML and client-side presentation code.
- The existing Hello World note remains public in this repository.

## Local development

Keep the private checkout outside this repository. Run:

```sh
BLOG_CONTENT_DIR=/absolute/path/to/private-content npm run build:web
BLOG_EXPECT_ARTICLES=example-slug npm --workspace web run test:build
```

Without `BLOG_CONTENT_DIR`, local builds use only the public posts. CI and Cloudflare preview builds never fetch private articles, even if content variables were mistakenly present. Production `main` builds fail rather than silently remove articles if required configuration is missing. The previous generated set is cleared before both root and workspace build/dev commands.

The content manifest format is:

```json
{"version":1,"articles":[{"slug":"example-slug","file":"published/example-slug.mdx"}]}
```

The manuscript must include `slug: example-slug`, `draft: false`, title, and date in its frontmatter. Paths are restricted to one-level `.md` or `.mdx` files under `published/`. This is trusted author content, not an upload or public editor interface.

## Production setup (approval required)

In the existing Cloudflare Pages project, after verifying its production branch is `main`:

1. Configure `BLOG_CONTENT_REPOSITORY` as the private `owner/repository` name in the **production** environment only.
2. Configure encrypted `BLOG_CONTENT_TOKEN` in **production** only. Use a narrowly scoped read-only GitHub credential restricted to that repository's contents and metadata, with an appropriate expiry. Creating or installing this credential requires the owner's action-time approval. Never put it in Git, a public workflow, a preview environment, an article, or a log.
3. Retain the root build command `npm run build:web` and output `apps/web/dist`.
4. Verify the private repository, production-only variable scope, source commit, build checks, and live output before release. Do not merge a production change before the content integration is configured.

A change to the content repository does not automatically trigger this existing Pages project. After reviewing the content change, retry a production build in Cloudflare. Automatic content-triggered deployment can be added separately with explicit approval for its credentials and workflow.

## Unpublishing is not access control

Remove an article from the private `published.json`, then rebuild production. Its current static route disappears. This does not recall existing copies, search caches, browser caches, or old Cloudflare deployment URLs. Never publish a draft that must remain secret. True reader access control is a separate feature and is not configured here.

## Checks

Run the existing checks from `validation.md`. `test/private-blog.test.mjs` checks published-file allowlisting, draft rejection, CI/preview isolation, required production configuration and Git ignore rules. For an integration build, set `BLOG_EXPECT_ARTICLES` to the comma-separated slugs selected by the private manifest. Do not put real article text into public test fixtures or uploaded public CI artifacts.
