# patrykopilka-site

Monorepo for **patrykopilka.me**, split into:
- `apps/web`: Astro-powered portfolio/blog frontend
- `apps/api`: Cloudflare Workers API built with Hono
- `packages/ui`: shared UI package scaffold
- `packages/lib`: shared utility package scaffold

## Repository layout

```text
.
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   ├── ui/
│   └── lib/
└── docs/
```

## Prerequisites

- Node.js 20+
- npm 10+

## Quick start

```bash
npm install
npm run dev:web
```

Run API in a second terminal:

```bash
npm run dev:api
```

## Workspace scripts (root)

- `npm run dev:web` – start Astro dev server
- `npm run build:web` – build Astro app
- `npm run dev:api` – start Wrangler local dev
- `npm run deploy:api` – deploy API to Cloudflare Workers
- `npm run test:api` – run API typecheck + tests
- `npm run check` – run web build and API tests

## Environment configuration

### Web (`apps/web`)

Optional variable:

- `PUBLIC_API_BASE`: base URL used for the “Check API health” link on the homepage.

Example:

```bash
PUBLIC_API_BASE=http://127.0.0.1:8787 npm run dev:web
```

### API (`apps/api`)

The API uses a Durable Object binding named `COUNTER_DO` for `/counter` persistence.

Config lives in:
- `apps/api/wrangler.toml` (binding + migration)

## Testing

From repo root:

```bash
npm run test:api
```

This runs:
1. TypeScript compile for test config
2. Node test runner against `apps/api/test/index.test.mjs`

## Documentation index

- `docs/issue-task-proposals.md`: tracked maintenance tasks and status
- `docs/future-change-suggestions.md`: proposed future improvements and priorities
