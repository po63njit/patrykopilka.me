# Codebase Issue Task Proposals

## 1) Typo task: fix homepage/blog banner copy typo

**Issue found**
- The blog banner tagline currently reads: `Patrykverse, Anything that gets me on a deep dive I post here :)`.
- `Anything` is capitalized mid-sentence after a comma, and the sentence reads like a copy typo rather than intentional punctuation.

**Proposed task**
- Update the banner copy to a polished sentence, e.g.:
  - `Patrykverse — anything that sends me down a deep dive gets posted here.`
- Keep tone/personality, but fix the typo-level copy quality issue.

**Acceptance criteria**
- Banner text reads naturally and has no mid-sentence capitalization typo.
- No layout regressions on the `/blog` page.

---

## 2) Bug task: fix missing LinkedIn value on resume page

**Issue found**
- The Resume page renders a `LinkedIn:` label with no link/value, unlike Email and GitHub.
- This is a user-facing data bug (empty field in contact list).

**Proposed task**
- Add the missing LinkedIn URL (or remove the row until the URL is available).
- Prefer a clickable anchor to match behavior/format of other contact items.

**Acceptance criteria**
- `LinkedIn` row always renders either:
  - a valid clickable profile URL, or
  - does not render at all if the profile is not configured.
- No empty label rows remain in the contact list.

---

## 3) Documentation discrepancy task: align README with actual local setup requirements

**Issue found**
- Root README describes architecture at a high level, but does not document practical run/setup steps for both apps.
- The API relies on Durable Objects and the web app references `PUBLIC_API_BASE`, but there is no clear documented developer setup path.

**Proposed task**
- Expand README with a `Getting Started` section:
  - install dependencies
  - run `apps/web` and `apps/api`
  - explain `PUBLIC_API_BASE`
  - mention Durable Object migration/dev expectations for Wrangler

**Acceptance criteria**
- A new contributor can run web + API locally without guessing missing env/config.
- README commands match current `package.json` scripts.

---

## 4) Test improvement task: add API behavior tests (health/echo/counter)

**Issue found**
- There are no automated tests for core API routes.
- Critical behavior (counter increment, invalid JSON echo handling) can regress unnoticed.

**Proposed task**
- Add API tests (e.g., with Vitest + Miniflare or Workers test utilities) covering:
  - `GET /health` returns `{ ok: true, service: ... }`
  - `POST /echo` handles invalid JSON gracefully (`{}`)
  - `GET /counter` increments count across sequential requests

**Acceptance criteria**
- Tests run in CI/local with one command.
- Route-contract assertions exist for all three endpoints.
- At least one negative-path test exists for malformed request payloads.
