# patrykopilka-site (Astro + Cloudflare Workers/Hono)

Monorepo: **Astro** blog/portfolio (Pages) + **Hono** API (Workers).

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Install dependencies

```bash
npm install
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

### Environment notes

- The homepage links to `${PUBLIC_API_BASE}/health` when `PUBLIC_API_BASE` is set.
- If you do not set `PUBLIC_API_BASE`, the API health link is not shown on the homepage.

Example:

```bash
PUBLIC_API_BASE=http://127.0.0.1:8787 npm run dev:web
```

### Durable Object notes

- The API uses a Durable Object binding named `COUNTER_DO`.
- `apps/api/wrangler.toml` already contains the binding and migration config for local/dev deployment.
- The `/counter` route depends on this Durable Object to persist and increment the counter.
