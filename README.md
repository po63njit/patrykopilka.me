# patrykopilka-site (Astro + Cloudflare Workers/Hono)

Monorepo: **Astro** blog/portfolio (Pages) + **Hono** API (Workers).

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Install dependencies

```bash
npm ci
```

### Run the web app (Astro)

```bash
npm run dev:web
```

The web app runs from `apps/web`.

### Run the API (Cloudflare Workers + Hono)

```bash
npm run dev:api
```

The API runs from `apps/api` using Wrangler.

### Build and test

```bash
ASTRO_TELEMETRY_DISABLED=1 npm run build:web
npm --workspace web test
npm --workspace web run check:orbit
npm --workspace web run test:build
npm --workspace api test
```

The static site is generated in `apps/web/dist`. The portfolio does not need the API to render or navigate.

### Deployment

The repository's existing Cloudflare Pages integration builds the web app. GitHub Actions validates the build and tests; it does not deploy the API. Keep the existing Pages project and custom domain configuration. See [the publication checklist](docs/publication.md) for validation and rollback steps.

### Content

- The homepage uses the Orbital design and About uses Systems profile.
- The résumé intentionally contains only the approved IBM summary and start date in `apps/web/src/data/experience.ts`.
- Projects are placeholders. The prior project data and UI are preserved in `docs/archive/projects-before-cleanup.astro.txt` and Git history.
- Blog posts live in `apps/web/src/content/blog`. A post with `draft: true` is excluded from the site, but its source is still public if committed to this public repository.

### Durable Object notes

- The API uses a Durable Object binding named `COUNTER_DO`.
- `apps/api/wrangler.toml` already contains the binding and migration config for local/dev deployment.
- The `/counter` route depends on this Durable Object to persist and increment the counter.
