# Personal Tracker

Personal finance tracking web app — Next.js 15 + Supabase + Prisma.

## Stack

- **Framework** — Next.js 15 (App Router, React Server Components) on React 18
- **Language** — TypeScript (strict + `noUncheckedIndexedAccess`)
- **Styling** — Tailwind CSS 3.4 with shadcn/ui primitives; semantic HSL tokens; Inter with tabular numerals
- **Database** — Supabase Postgres 15 (RLS via `auth.uid()`)
- **ORM** — Prisma 5 (`DATABASE_URL` pooled + `DIRECT_URL` for migrations)
- **Auth** — Supabase Auth via `@supabase/ssr`
- **Forms** — React Hook Form + Zod
- **Charts** — Recharts
- **Toasts** — Sonner
- **Testing** — Vitest (unit + integration) + Playwright (E2E)
- **Lint** — ESLint flat config extending `next/core-web-vitals` + `next/typescript`

## Architecture guardrails

- **ADR-0008: `lib/finance/**` is pure.** The ESLint config blocks imports from `@/lib/db/*` and `@prisma/client` inside `lib/finance/`. If this rule fires, do not suppress — refactor the caller so the DB query happens outside `lib/finance/` and pre-fetched data is passed in.
- **Design tokens live in CSS variables.** `app/globals.css` owns the light/dark palette; `tailwind.config.ts` maps them to utility classes. Add new semantic colors to both files together.
- **Env split.** `DATABASE_URL` is the pooled (pgbouncer) connection used at runtime. `DIRECT_URL` is the direct connection used by Prisma Migrate. They are not interchangeable.

## Getting started

### Prerequisites

- Node.js 20+ (see `.nvmrc`)
- npm 10+
- A Supabase project (for anything beyond bootstrap)

### 1. Install

```bash
nvm use          # optional, if you use nvm
npm install
```

### 2. Environment

```bash
cp .env.example .env
```

Then fill in `.env`:

| Variable | Where to find it |
|---|---|
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string → **Pooler (pgbouncer)**. Append `?pgbouncer=true&connection_limit=1`. |
| `DIRECT_URL` | Same page → **Direct connection** (port 5432). |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page → `anon` public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page → `service_role` secret (server-only; never ship to the client) |
| `RESEND_API_KEY` | Resend dashboard (fill when email story lands) |
| `SENTRY_DSN` | Sentry project settings (fill when observability story lands) |
| `CRON_SECRET` | Random string used to auth cron calls (fill when cron story lands) |
| `ALPHA_VANTAGE_API_KEY` | alphavantage.co (fill when prices story lands) |
| `COINGECKO_API_KEY` | coingecko.com (fill when prices story lands) |

> The repo ships with a **gitignored `.env`** containing placeholder values so `prisma generate` works out of the box. Replace with real values before running the app against a real database.

### 3. Generate the Prisma client

```bash
npm run db:generate
```

### 4. Install Playwright browsers (first time only)

```bash
npx playwright install --with-deps chromium
```

### 5. Run the dev server

```bash
npm run dev
# open http://localhost:3000
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server on :3000 |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint across the repo |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest — unit + integration, one-shot |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:e2e` | Playwright E2E |
| `npm run db:generate` | `prisma generate` |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:studio` | Prisma Studio |

## Project layout

```
app/                       # Next.js App Router
  (auth)/                  # Auth routes (sign in/up)
  (finance)/               # Authenticated finance routes
  api/                     # Route handlers
components/
  ui/                      # shadcn/ui primitives
  charts/                  # Recharts wrappers
  forms/                   # Form components
  finance/                 # Domain widgets
lib/
  auth/                    # Supabase auth helpers
  db/                      # Prisma client + DB-touching helpers
  finance/                 # PURE — calculations only (ADR-0008)
  prices/                  # Market-data adapters
  validation/              # Zod schemas
  email/                   # Resend wrappers
  logger/                  # Structured logging
  errors/                  # Error classes + handlers
  utils.ts                 # cn() + shared tiny utilities
prisma/
  schema.prisma            # Prisma schema
  migrations/              # Migrations (committed)
tests/
  unit/                    # Vitest unit tests
  integration/             # Vitest integration (hits a DB)
  e2e/                     # Playwright specs
  fixtures/                # Shared test fixtures
types/                     # Shared TS types
scripts/                   # One-off scripts (seed, fixtures, ops)
bmad/                      # BMAD artifacts (PRD, epics, stories, ADRs)
```

## BMAD workflow

This project uses BMAD personas. Artifacts live under `bmad/`:

- `bmad/prd/` — product requirements
- `bmad/epics/` — epics
- `bmad/artifacts/stories/` — context-engineered story files
- `bmad/adrs/` — architecture decision records

The Dev persona implements only from a story file that the PO has marked `ready`.
