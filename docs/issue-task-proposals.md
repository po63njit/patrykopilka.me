# Codebase Maintenance Task Tracker

This document tracks quality issues discovered during repository review and their implementation status.

## Completed in this cleanup pass

### 1) Copy typo cleanup: blog banner tagline

- **Status:** ✅ Completed
- **Result:** Blog banner copy uses polished sentence casing and punctuation.
- **File:** `apps/web/src/pages/blog/index.astro`

### 2) Resume contact data bug: missing LinkedIn

- **Status:** ✅ Completed
- **Result:** Resume contact list now includes a clickable LinkedIn URL.
- **File:** `apps/web/src/pages/resume.astro`

### 3) Root documentation completeness

- **Status:** ✅ Completed
- **Result:** Root README now includes setup, scripts, environment notes, testing flow, and docs index.
- **File:** `README.md`

## Still recommended (next iterations)

### 4) Expand API behavior tests

- **Status:** 🟡 Pending
- **Reason:** Core tests exist, but coverage can be improved.

**Recommended additions:**
- assert `GET /health` contract fields and status code edge cases
- validate `POST /echo` behavior across malformed payload variants
- add deterministic counter behavior tests with isolated Durable Object state

### 5) CI automation

- **Status:** 🟡 Pending
- **Reason:** Local scripts exist, but CI enforcement is not documented.

**Recommended additions:**
- run `npm run check` on every PR
- fail on test/type errors
- optionally cache npm dependencies for faster runs
