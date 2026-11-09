# patrykopilka.me

Personal portfolio and blog at **[patrykopilka.me](https://patrykopilka.me)**.

The site is built with Astro 5, MDX, TypeScript, and Sass, then served as static files by Cloudflare Pages. A separate Hono/Cloudflare Worker provides a small example API. The website does not call or require that API.

## Run locally

Use Node.js 20 (the CI version) and npm 10+. Run commands from the repository root.

```bash
npm ci
npm run dev:web
```

Open the local URL printed by Astro, normally `http://localhost:4321`. No account, API key, or environment file is required to develop the public theme. New article manuscripts are kept in a separate private repository; see [private article publishing](docs/private-articles.md) to include them locally or configure production.

To build and preview production output:

```bash
npm run build:web
npm --workspace web run preview
```

Astro writes the static site to `apps/web/dist/`. Preview serves that build; rebuild after editing source.

## Repository map

```text
apps/web/
  src/pages/          Routes: home, about, projects, resume, blog
  src/components/     Page sections, orbiting planets, wave background
  src/layouts/        Shared navigation, metadata, and footer
  src/content/blog/   Public note and ignored generated private articles
  src/data/           Structured experience content
  src/scripts/        Orbit, wave and byte-lab interactions
  src/styles/         Shared Sass styles
  src/assets/         Build-processed images, including the planet pack
  public/             Files copied unchanged, including license notices
  test/               Source/unit and generated-site checks
apps/api/             Hono routes, Durable Object, Wrangler config, tests
packages/             Reserved lib/ui folders; currently placeholders
docs/                Content, validation, deployment, and design guides
```

## Check a change

These are the checks run by [GitHub Actions](.github/workflows/ci.yml), in order:

```bash
npm --workspace web test
npm --workspace web run check:orbit
npm run build:web
npm --workspace web run test:build
npm --workspace api test
```

Run the build before `test:build`. CI sets `ASTRO_TELEMETRY_DISABLED=1`; this is optional locally. There is no root `npm test`, full Astro diagnostic, or lint script. See [validation](docs/validation.md) for coverage and browser checks.

## Configuration and optional API

- **Canonical domain:** `apps/web/astro.config.mjs` defaults to `https://patrykopilka.me`. Its `import.meta.env.PUBLIC_SITE_URL` expression currently does not pick up shell or `.env` overrides during the build. To change domains, update the config's `site` value and the production-output tests together, or implement explicit environment loading first.
- `ASTRO_TELEMETRY_DISABLED=1`: disables Astro telemetry; it does not change site content.
- `COUNTER_DO`: a Worker binding configured in `apps/api/wrangler.toml`, not an `.env` string. No `PUBLIC_API_BASE` variable is used by the current website.

Run `npm run dev:api` in a second terminal only when working on the API. Wrangler prints its local URL, normally `http://localhost:8787`. `GET /health` returns service status, `POST /echo` returns submitted JSON (or `{}` for invalid JSON), and `GET /counter` increments a shared Durable Object counter. See [API deployment notes](docs/publication.md#optional-api) before deploying it.

## Guides

- [Edit pages, images, and blog posts](docs/content.md)
- [Keep article source private](docs/private-articles.md)
- [Validate a change](docs/validation.md)
- [Deploy and roll back](docs/publication.md)
- [Wave behavior and attribution](docs/matrix-waves.md)
- [Documentation index and historical notes](docs/README.md)

Keep secrets, private drafts, and confidential work details out of this public repository. Files under `docs/` are public too, even though they are not included in the website build.
