# Future Change Suggestions

Prioritized improvement opportunities after the March 26, 2026 repository cleanup.

## High priority

1. **Introduce CI checks for monorepo health**
   - Run `npm ci`, `npm run check` on pull requests.
   - Add branch protection requiring green checks.

2. **Add linting/format standards**
   - Introduce ESLint + Prettier for Astro/TypeScript.
   - Add scripts (`lint`, `format`, `format:check`) at root and app level.

3. **Strengthen API contract tests**
   - Add negative-path tests for invalid methods/routes.
   - Add fixture-based tests for JSON payload variants.

## Medium priority

4. **Centralize shared types in `packages/lib`**
   - Extract API response interfaces used by web and API.
   - Prevent contract drift between frontend usage and backend implementation.

5. **Create reusable UI primitives in `packages/ui`**
   - Move repeated card/nav patterns into package components.
   - Introduce a lightweight design token strategy.

6. **Document deployment flow**
   - Add environment matrix (dev/staging/prod).
   - Document Cloudflare Pages + Workers deployment commands and rollback process.

## Nice-to-have

7. **Add content authoring guide for blog posts**
   - Template for MDX frontmatter and tags.
   - Publish checklist (title, date, tags, excerpt, links).

8. **Performance budget and observability**
   - Track homepage bundle size and LCP.
   - Add basic API request logging and error counters.
