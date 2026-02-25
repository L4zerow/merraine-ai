# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Merraine AI is a Next.js 14 (App Router) recruiting platform that uses the Pearch AI API for candidate search/enrichment. It is a single-service application (not a monorepo). See `README.md` for standard commands (dev, build, lint, type-check).

### Environment variables

Copy `.env.example` to `.env.local` and set values. The `.env.example` omits `DATABASE_URL` which is required by the Drizzle ORM / Neon Postgres layer at runtime. Without it, the app still starts and the login page works (auth falls back to env-var password check), but any DB-dependent routes (searches, saved candidates) will fail.

Required variables:
- `PEARCH_API_KEY` — Pearch AI key (prefix `pk_`)
- `AUTH_USERNAME` / `AUTH_PASSWORD` — app login credentials
- `DATABASE_URL` or `POSTGRES_URL` — Neon Postgres connection string (needed for full functionality)

### ESLint configuration

The repository ships without an `.eslintrc.json`. Running `next lint` for the first time triggers an interactive prompt. A `.eslintrc.json` extending `next/core-web-vitals` (with `react/no-unescaped-entities` set to `"warn"`) has been added to allow non-interactive lint and build. The codebase has pre-existing unescaped-entity warnings.

### Running the dev server

`npm run dev` starts on port 3000. Auth cookie is `httpOnly` with `secure: true`; in local dev over HTTP, the cookie may not persist across browser sessions (use `curl` with `-c`/`-b` cookie jars for API testing). The login page is at `/login`.

### Database

The DB connection (`lib/db/index.ts`) is lazily initialized; the app compiles and the dev server starts even without a `DATABASE_URL`. Pages that hit the DB (dashboard stats, searches, saved candidates) will return errors without a valid connection string.
