# Editing content

## Pages and images

- **Home:** `apps/web/src/components/HomeContent.astro`.
- **About:** `apps/web/src/components/AboutContent.astro`; its page metadata is in `src/pages/about.astro`.
- **Projects:** `apps/web/src/pages/projects.astro`. Entries are intentionally placeholders. Earlier project markup is preserved in `docs/archive/projects-before-cleanup.astro.txt`.
- **Résumé:** `apps/web/src/pages/resume.astro`, with experience data in `apps/web/src/data/experience.ts`. Keep the current approved public summary intact unless a replacement is approved; do not infer employment details.
- **Navigation, shared metadata, footer:** `apps/web/src/layouts/BaseLayout.astro`.
- **Shared styles:** `apps/web/src/styles/global.scss`; components also contain scoped styles.

Paths beginning `src/` above are relative to `apps/web/`.

Use `apps/web/public/` for files that need stable URLs, such as `/images/example.svg`. Use `apps/web/src/assets/` for imported images processed by Astro. The orbital artwork comes from `planet-pack.png`; `PlanetLink.astro` crops four regions from a shared generated WebP. Changing that image's layout requires updating its viewports and ring clipping path.

The homepage's motion lives in `OrbitScene.astro`, `MatrixWaves.astro`, and `src/scripts/`. Preserve keyboard navigation, the shared Pause/Resume control, reduced-motion behavior, and the [wave attribution](matrix-waves.md).

## Add a blog post

Create a flat, lowercase, hyphenated file such as `apps/web/src/content/blog/my-note.mdx`:

```mdx
---
title: My note
date: 2026-11-08
description: A short summary of the post.
tags: [engineering]
draft: true
---

Write the post here using Markdown. MDX also supports imported components.
```

The schema in `apps/web/src/content/config.ts` requires `title` and `date`. `description` is optional, `tags` defaults to `[]`, and `draft` defaults to `false`. The filename becomes the URL, for example `/blog/my-note/`.

1. Write and review the content locally. `draft: true` excludes it from the homepage, blog list, and generated post routes, including during normal local development.
2. To preview its page, temporarily set `draft: false` locally and run `npm run dev:web`. Restore `true` before committing if it is not ready.
3. When publishing, set `draft: false`, update affected test expectations, and run the [validation checks](validation.md).
4. Review the PR and its Pages preview before merging to `main`.

The homepage shows the newest published post, and `/blog/` lists all published posts newest first. Tags do not control inclusion. Future dates do **not** schedule publication; a future-dated post without `draft: true` appears immediately.

**A draft in Git is not private.** This repository is public. Keep unpublished sensitive material outside the repository, not merely behind a draft flag.

## When content tests need updating

`apps/web/test/build.test.mjs` intentionally lists the generated pages and checks the current homepage's latest-post link. Adding a published post changes the expected route list and may change that link. Update those assertions to match the intended content; preserve the checks for absent review routes, working links/assets, and canonical URLs. Approved experience wording is also checked in both `content.test.mjs` and `build.test.mjs`.
