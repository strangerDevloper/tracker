# Architecture — Personal Finance Tracker (v1)

**Author:** Winston (Architect)
**Status:** Accepted (v1.0)
**Last updated:** 2026-04-24
**Supersedes:** —

This document is the **authoritative technical reference** for the v1 build. If this doc and an epic file disagree, this doc wins — escalate to update the epic. If this doc and an ADR disagree, the **newer ADR** wins.

---

## 1. System context (one-page view)

```
                         ┌──────────────────────────────────────┐
                         │           END USERS (n=1)            │
                         │   • Mobile browser (PWA-ready)       │
                         │   • Desktop browser                  │
                         └──────────────────┬───────────────────┘
                                            │ HTTPS
                                            ▼
              ┌─────────────────────────────────────────────────┐
              │               Vercel Edge Network               │
              │  ┌───────────────────────────────────────────┐  │
              │  │          Next.js 15 (App Router)          │  │
              │  │  • React Server Components (default)      │  │
              │  │  • Client Components (charts, forms)      │  │
              │  │  • Server Actions (form writes)           │  │
              │  │  • API Routes (/api/*) — WhatsApp-ready   │  │
              │  │  • Middleware (auth guard)                │  │
              │  └──────────┬───────────────────┬────────────┘  │
              │             │                   │               │
              │             │                   │  ┌─────────┐  │
              │             │                   │  │ Cron    │  │
              │             │                   │  │ (11:30p │  │
              │             │                   │  │  IST,   │  │
              │             │                   │  │  8p IST)│  │
              │             │                   │  └────┬────┘  │
              └─────────────┼───────────────────┼───────┼───────┘
                            │                   │       │
              ┌─────────────▼──────┐ ┌──────────▼───────▼─────┐
              │    Supabase        │ │    External APIs        │
              │  ┌──────────────┐  │ │  • AMFI (MF NAVs)       │
              │  │ Postgres 15  │  │ │  • Yahoo Finance        │
              │  │ (RLS enforced)│ │ │  • Alpha Vantage (fb)   │
              │  └──────────────┘  │ │  • CoinGecko            │
              │  ┌──────────────┐  │ │  • MetalPriceAPI (opt)  │
              │  │ Auth         │  │ └─────────────────────────┘
              │  │ (OAuth/MLink/│  │
              │  │  Password)   │  │ ┌─────────────────────────┐
              │  └──────────────┘  │ │         Resend          │
              │  ┌──────────────┐  │ │  (transactional email:  │
              │  │ Storage      │  │ │   magic link, budget    │
              │  │ (receipts,   │  │ │   alerts)               │
              │  │  imports)    │  │ └─────────────────────────┘
              │  └──────────────┘  │
              └────────────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Sentry     │
                     │  (errors)    │
                     └──────────────┘
```

### Components — responsibility split

| Component | Responsibility | Why here and not elsewhere |
|---|---|---|
| **Next.js (Vercel)** | UI rendering, form handling, API endpoints, cron orchestration | Single codebase + zero infra. Solo-maintainer friendly. |
| **Supabase Postgres** | All persistent data (users, transactions, investments, prices, budgets) | Managed Postgres + RLS + Auth + Storage in one vendor |
| **Supabase Auth** | Identity + session | Native integration with Postgres RLS via `auth.uid()` |
| **Supabase Storage** | Receipt uploads, import file archival | Lives next to the DB; simplest access control |
| **Resend** | Transactional email (budget alerts, magic link) | Supabase Auth can plug SMTP; Resend is the preferred provider |
| **Vercel Cron** | Scheduled jobs (price refresh, valuations, alerts) | Free up to 2 jobs; sufficient for v1. See ADR-0007 for when we'd migrate. |
| **External price APIs** | Live NAV/price data per asset class | Each hidden behind an adapter. See ADR-0004. |
| **Sentry** | Error tracking | Free tier is fine; critical for unattended cron jobs |

---

## 2. Tech stack — frozen for v1

| Layer | Choice | Version | Reason (see ADR for long form) |
|---|---|---|---|
| Framework | Next.js | 15.x (App Router) | ADR-0001 |
| Language | TypeScript | 5.x strict mode | Type safety for money math |
| Database | Supabase Postgres | 15 | Managed, RLS, free tier |
| ORM | Prisma | 5.x | ADR-0002 |
| Auth | Supabase Auth | current | ADR-0003 |
| Styling | Tailwind CSS | 3.4.x | shadcn/ui compatibility |
| Components | shadcn/ui | latest | Owned code, no lock-in |
| Charts | Recharts | 2.x | Sufficient for the 4 dashboard cards |
| Forms | React Hook Form + Zod | latest | Shared Zod schemas across client/server |
| Email | Resend | current | Via Supabase Auth SMTP + direct for alerts |
| Storage | Supabase Storage | current | Receipts + imports |
| Cron | Vercel Cron | — | ADR-0007 |
| Errors | Sentry | latest | Free tier |
| Analytics | Vercel Analytics | — | Light touch, privacy-friendly |
| Excel parsing | SheetJS (`xlsx`) | 0.20.x | Import epic |

**Things we are NOT using** (frozen decisions to prevent drift):
- ❌ tRPC — breaks WhatsApp / Python-service callers (ADR-0001 references)
- ❌ NextAuth — Supabase Auth is native; two auth systems = no.
- ❌ Drizzle / Kysely — ADR-0002
- ❌ MUI / Chakra / AntD — shadcn/ui instead
- ❌ Redux / Zustand in v1 — React Server Components + URL state suffice
- ❌ tanstack-query — we use RSC/Server Actions; no need
- ❌ Service workers / offline mode — v2+

---

## 3. Folder structure

See ADR-0008 for full conventions. Summary:

```
.
├── app/                              # Next.js App Router
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (finance)/                    # protected group; middleware enforces auth
│   │   ├── layout.tsx                # app shell: nav + header
│   │   ├── dashboard/page.tsx
│   │   ├── transactions/
│   │   │   ├── page.tsx              # list
│   │   │   └── [id]/page.tsx         # detail
│   │   ├── investments/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── budgets/page.tsx
│   │   └── settings/
│   │       ├── page.tsx
│   │       ├── accounts/page.tsx
│   │       ├── categories/page.tsx
│   │       └── import/page.tsx
│   ├── api/
│   │   ├── auth/
│   │   ├── accounts/
│   │   ├── transactions/
│   │   ├── categories/
│   │   ├── holdings/
│   │   ├── budgets/
│   │   ├── dashboard/
│   │   ├── imports/
│   │   └── cron/                     # cron endpoints, protected by CRON_SECRET
│   ├── layout.tsx                    # root layout
│   ├── page.tsx                      # landing (pre-auth)
│   └── middleware.ts                 # auth gate
├── components/
│   ├── ui/                           # shadcn components (generated, owned)
│   ├── charts/                       # recharts wrappers, isolated
│   ├── forms/                        # shared form primitives
│   └── finance/                      # domain components
├── lib/
│   ├── db/                           # prisma client, helpers
│   ├── auth/                         # supabase auth helpers (server + client)
│   ├── finance/                      # domain logic (pure functions)
│   │   ├── money.ts                  # paise <-> rupee, formatting
│   │   ├── xirr.ts                   # cashflow math
│   │   ├── networth.ts               # composite computation
│   │   ├── budgets.ts                # progress helpers
│   │   └── transactions.ts           # transactionsForAnalytics()
│   ├── prices/                       # price-feed adapters (ADR-0004)
│   │   ├── types.ts                  # PriceAdapter interface
│   │   ├── amfi.ts
│   │   ├── yahoo.ts
│   │   ├── alphavantage.ts
│   │   ├── coingecko.ts
│   │   └── registry.ts               # adapter selection + fallback
│   ├── validation/                   # shared Zod schemas
│   ├── email/                        # Resend senders + templates
│   └── logger/                       # structured logging wrapper
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                       # default categories seed
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/                          # playwright
├── types/                            # shared TypeScript types
└── scripts/
    ├── seed-schemes.ts               # pre-seed AMFI scheme list
    └── seed-tickers.ts               # pre-seed NSE symbols
```

### Naming conventions
- Files: `kebab-case.ts` / `kebab-case.tsx`.
- React components: `PascalCase` export, file name matches (e.g., `QuickExpenseEntry.tsx`).
- Hooks: `useCamelCase`.
- Utility modules: `camelCase` functions.
- DB columns: `snake_case`; Prisma field is `camelCase` with `@map()`.
- API routes: plural nouns (`/api/transactions` not `/api/transaction`).

---

## 4. Data model (consolidated)

Full Prisma schema lives in `prisma/schema.prisma`. The conceptual map:

```
users ─┐
       ├─ user_settings
       ├─ accounts ─────────┐
       ├─ categories        │
       ├─ transactions ─────┼─ (account_id, category_id, user_id)
       ├─ budgets ──────────┼─ (category_id, user_id)
       │                    │
       ├─ investment_holdings ─┐
       │                      ├─ investment_txns
       │                      └─ holding_valuations
       │
       ├─ import_batches
       └─ budget_alerts_sent (via budget_id)

asset_prices  (not user-scoped — shared price cache)
```

**Key rules** (enforced in code + Prisma):
1. Every user-owned row has `user_id` and an RLS policy enforcing `user_id = auth.uid()`.
2. `asset_prices` is shared (MF NAV is not user-specific); protected by API-layer only.
3. Money: stored as `Int` (paise). Rupees are a **display-only** concern, never DB. `Decimal` only for rates/ratios (interest_rate, xirr, units).
4. Dates: `DateTime` in Prisma, `timestamptz` in Postgres, stored UTC, displayed IST. Never `VARCHAR` dates.

### Index strategy (initial, revisit during Epic 06 perf pass)
```sql
-- transactions (the hot table)
CREATE INDEX ON transactions (user_id, txn_date DESC);
CREATE INDEX ON transactions (user_id, category_id, txn_date);
CREATE INDEX ON transactions (user_id, account_id, txn_date);
CREATE INDEX ON transactions (transfer_group_id) WHERE transfer_group_id IS NOT NULL;

-- investments
CREATE INDEX ON investment_txns (holding_id, txn_date);
CREATE INDEX ON holding_valuations (holding_id, as_of_date DESC);
CREATE UNIQUE INDEX ON asset_prices (identifier, asset_class, date);

-- budgets
CREATE UNIQUE INDEX ON budgets (user_id, category_id, month);
```

---

## 5. API surface (catalog)

All routes are under `/api/*`. All accept/return JSON. All write routes validate input with Zod. All require auth except `/api/auth/*` and `/api/cron/*` (cron uses `CRON_SECRET` header).

### Request/response contract
```ts
// Success
{ "data": T }
// Error
{ "error": { "code": "VALIDATION_ERROR" | "UNAUTHENTICATED" | "NOT_FOUND" | "CONFLICT" | "INTERNAL", "message": string, "details"?: any } }
```

HTTP status codes used: 200, 201, 400 (validation), 401 (auth), 403 (forbidden / RLS), 404, 409 (conflict), 500.

### Endpoint catalog

| Group | Method | Path | Notes |
|---|---|---|---|
| Auth | GET | `/api/auth/callback` | OAuth + magic-link callback |
| Auth | POST | `/api/auth/signout` | |
| Me | GET | `/api/me` | Current user + settings |
| Me | DELETE | `/api/account` | Hard-delete, cascades |
| Accounts | CRUD | `/api/accounts[...]` | Epic 02 |
| Categories | CRUD | `/api/categories[...]` | Epic 03 |
| Transactions | CRUD | `/api/transactions[...]` | Epic 03; handles transfer pair |
| Holdings | CRUD | `/api/holdings[...]` | Epic 04 |
| Inv txns | CRUD | `/api/holdings/[id]/txns[...]` | Epic 04 |
| Manual val | POST | `/api/holdings/[id]/manual-value` | Epic 04 |
| Portfolio | GET | `/api/portfolio` | Aggregated |
| Budgets | CRUD | `/api/budgets[...]` | Epic 05 |
| Budget progress | GET | `/api/budgets/progress` | Epic 05 |
| Dashboard | GET | `/api/dashboard?month=` | Epic 06 |
| Imports | POST | `/api/imports/upload` | Epic 07 |
| Imports | POST | `/api/imports/validate` | |
| Imports | POST | `/api/imports/commit` | Atomic |
| Imports | POST | `/api/imports/[id]/undo` | |
| Cron | POST | `/api/cron/refresh-prices` | Protected |
| Cron | POST | `/api/cron/recompute-valuations` | Protected |
| Cron | POST | `/api/cron/send-budget-alerts` | Protected |

**WhatsApp-readiness:** every write endpoint accepts a structured intent. The WhatsApp bot (v2) will parse a text message into the same intent shape and hit the same endpoint. No duplicated business logic.

---

## 6. External integrations — price feeds

See ADR-0004 for the adapter pattern. Summary:

| Asset class | Primary source | Fallback | Rate limit | Refresh schedule |
|---|---|---|---|---|
| Mutual Fund | AMFI daily NAV file | — (deterministic source) | n/a | 11:30 PM IST |
| Stock (NSE/BSE) | Yahoo Finance (unofficial) | Alpha Vantage (free 250/day) | Yahoo: batch; AV: 5/min | 11:30 PM IST |
| Crypto | CoinGecko `/simple/price` | — | 50/min | 11:30 PM IST |
| Gold (auto, optional) | MetalPriceAPI free | manual | 100/month | 11:30 PM IST |
| FD/RD/PPF/EPF | Deterministic formula | — | n/a | On-demand + nightly |
| Gold/Real estate (manual) | User entry | — | n/a | Manual |

Every adapter implements:
```ts
interface PriceAdapter {
  id: PriceSource;
  canHandle(holding: { assetClass: AssetClass; identifier: string | null }): boolean;
  fetchLatest(identifiers: string[]): Promise<PriceResult[]>;
}

type PriceResult = { identifier: string; date: Date; price: Decimal } | { identifier: string; error: string };
```

The **registry** (`lib/prices/registry.ts`) selects the adapter per holding and handles fallback chains. Failures are logged to Sentry; a holding with no fresh price surfaces "last updated N days ago" in the UI (graceful degradation, never a crash).

---

## 7. Authentication, authorization, security

### Auth flow
1. User lands on `/login`, picks Google / magic link / password (ADR-0003).
2. Supabase handles the flow; on success, sets session cookies (`sb-access-token`, `sb-refresh-token`).
3. `middleware.ts` checks cookies on every `(finance)` route, redirects to `/login` if absent/expired.
4. On first-ever login, `/api/auth/callback` upserts a `public.users` row mirroring `auth.users.id`.

### Authorization — defense in depth
**Layer 1 — Middleware:** blocks unauthenticated requests at the route level.
**Layer 2 — Application code:** every server action / API route calls `getAuthedUser()` which throws if session invalid.
**Layer 3 — Row-Level Security (Postgres):** every table has `USING (user_id = auth.uid())` policies. Even if layers 1–2 have a bug, a user cannot read another user's rows.

### Secrets
Stored in Vercel env vars (never in repo):
```
DATABASE_URL                       # Supabase pooled connection
DIRECT_URL                         # Supabase direct (for Prisma migrations)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY          # server-only; bypasses RLS (use with extreme care)
RESEND_API_KEY
CRON_SECRET                        # shared secret for /api/cron/*
SENTRY_DSN
ALPHA_VANTAGE_API_KEY              # fallback price source
COINGECKO_API_KEY                  # optional (free tier works without)
```

`SUPABASE_SERVICE_ROLE_KEY` is only used in cron endpoints and admin paths — never in user-facing requests.

### Input validation
All API routes and Server Actions validate inputs with Zod schemas **colocated in `lib/validation/`** so client and server share them. No exceptions.

### Rate limiting
v1: rely on Supabase Auth's built-in rate limits for auth endpoints, and Vercel's platform limits for everything else. Dedicated per-user rate limiting deferred to v1.5 (middleware + Upstash Redis).

---

## 8. Scheduled jobs (cron)

Vercel Cron config in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/refresh-prices",        "schedule": "0 18 * * *" },  // 11:30 PM IST (18:00 UTC)
    { "path": "/api/cron/recompute-valuations",  "schedule": "15 18 * * *" }, // 11:45 PM IST
    { "path": "/api/cron/send-budget-alerts",    "schedule": "30 14 * * *" }  // 8:00 PM IST
  ]
}
```

Notes:
- Vercel Cron sends a bearer token via `Authorization: Bearer ${CRON_SECRET}`. Each cron endpoint validates this header.
- Jobs are **idempotent** — running a job twice on the same day is a no-op (upsert by unique key).
- Each job logs start/end + success/failure count to Sentry.
- If a job exceeds Vercel's 10-second limit (unlikely for v1 data volumes), split into batched invocations via a queue pattern. Tracked as a risk.

---

## 9. Observability

- **Errors** → Sentry. All `catch` blocks either handle or `reportError(e, { context })`. No silent failures.
- **Structured logs** → `lib/logger/`. Wraps `console` with JSON formatting. In dev, pretty-printed; in prod, machine-readable.
- **Performance** → Vercel Analytics (Core Web Vitals). Ad-hoc `performance.mark()` for dashboard load time (Epic 06 AC).
- **Uptime** → Vercel's status page suffices for v1. BetterUptime or similar if/when we have multiple users.

### Logging rules
- Every API route logs request start (method, path, user_id) and end (status, duration_ms).
- Every cron run logs start, items processed, items succeeded, items failed, duration.
- Money-related errors (XIRR non-convergence, price-fetch failure for a holding the user expects to see) are logged at WARN with enough context to debug.
- Never log raw secrets or PII beyond user_id.

---

## 10. Performance targets

| Surface | Target | How measured |
|---|---|---|
| Dashboard load | <1s desktop, <2s mobile | Playwright perf test, Epic 06 AC |
| Quick-entry save | <300ms server time | Logged per request |
| Transaction list (1k rows) | <500ms server time | Epic 03 AC |
| Price refresh cron | <10s per run | Cron log |
| Import commit (1k rows) | <5s | Import history |

Strategies:
- RSC + Server Actions to minimize round-trips.
- Parallel queries in dashboard endpoint (Prisma `$transaction([...reads])`).
- Indices listed in §4.
- Pre-aggregated `holding_valuations` table so portfolio reads don't recompute.

**When to pre-optimize vs. wait:** no premature optimization for queries <100ms with real data. Optimize when we hit a measured target miss.

---

## 11. Backup & disaster recovery

- **Automated:** Supabase Pro tier includes daily backups with 7-day retention. Free tier does not — we'll upgrade the month before v1 launch.
- **Manual:** a weekly `pg_dump` to Supabase Storage (via cron) as a belt-and-suspenders strategy. Implemented post-v1 if we stay on free tier longer.
- **Exports:** users can CSV-export transactions at any time (Epic 03 F14 / v1.5). That's their escape hatch.
- **Restore drill:** at least once before v1 launch, practice restoring a backup to a throwaway Supabase project. If the drill fails, the backup strategy fails.

---

## 12. Testing architecture

Owned by QA (Quinn) per test strategy; Architect-level rules:

- **Unit tests** (Vitest) for: all `lib/finance/*` pure functions, all `lib/prices/*` adapters (mocked), all Zod schemas.
- **Integration tests** (Vitest + Supabase local) for: API routes + DB round-trip. Reset DB per test via transaction rollback.
- **E2E tests** (Playwright) for: login, quick expense entry, dashboard load, import happy path. Run against Vercel preview.
- **No mocking of the DB.** Use a real Supabase local instance (Docker). Mocks hide the bugs that matter.
- **No snapshot tests.** They pass until they suddenly don't; review friction isn't worth it.

---

## 13. Evolution & seams for v1.5 / v2

| Future capability | What v1 reserves to enable it |
|---|---|
| **WhatsApp entry** (v2) | All writes go through structured-intent API endpoints. WhatsApp parser becomes a thin layer over existing endpoints. |
| **Recurring transactions** (v1.5) | `transactions.source` enum already includes `RECURRING`. Adding the scheduler is additive. |
| **Receipt uploads** (v1.5) | `transactions.attachment_url` already in schema. UI + Supabase Storage bucket added. |
| **Nutrition/body modules** (v3) | `modules` enum + route groups in folder layout reserve the space. DB schema kept clean of finance-specific assumptions in shared tables. |
| **Multi-currency** (v2) | `transactions.currency` already present; all money helpers accept currency, INR is default. |
| **Goals** (v1.5) | New table; doesn't conflict with anything. |

Things we **chose not** to reserve for:
- Multi-user / sharing — adding this later requires a schema shift (workspaces / households). Accepted cost.
- Offline mode — requires service worker + sync layer; non-trivial addition if ever needed.

---

## 14. ADR register

| ADR | Title | Status |
|---|---|---|
| [0001](adr/adr-0001-nextjs-app-router.md) | Next.js App Router + RSC over Pages Router | Accepted |
| [0002](adr/adr-0002-prisma-over-alternatives.md) | Prisma over Drizzle/Kysely | Accepted |
| [0003](adr/adr-0003-supabase-auth-strategy.md) | Supabase Auth with Google + Magic Link + Password | Accepted |
| [0004](adr/adr-0004-price-feed-adapter-pattern.md) | Price-feed adapter pattern with cache table | Accepted |
| [0005](adr/adr-0005-unified-transactions-table.md) | Unified `transactions` table for income/expense/transfer | Accepted |
| [0006](adr/adr-0006-event-sourced-investment-txns.md) | Event-sourced `investment_txns` | Accepted |
| [0007](adr/adr-0007-vercel-cron.md) | Vercel Cron over external scheduler | Accepted |
| [0008](adr/adr-0008-folder-structure-conventions.md) | Folder structure and naming conventions | Accepted |
| [0009](adr/adr-0009-fifo-cost-basis.md) | FIFO cost basis for investment SELL transactions | Accepted |

---

## 15. Open questions (for PO / PM)

Items that don't block architecture but will surface during execution:

1. **Liability tracking.** Epic PRD mentions loans briefly. Should loan EMI auto-post an INTEREST expense + principal reduction? Currently treated as just an account type. Needs product call before Epic 02 story breakdown.
2. **Dividend as income vs. return.** Section 12 Q5 of main PRD. My recommendation: post as INCOME row AND tag `investment_holding_id` for portfolio attribution. Both. Needs PM sign-off.
3. **Crypto exchange-level tagging.** v1 ignores which exchange holds a crypto holding. If tax filing later needs per-exchange cost basis, schema needs revisiting.
4. **Sub-category aggregation.** Dashboard card 1 — do we roll sub-categories up to parent in the donut, or show them separately? UX (Sally) needs to answer during wireframes.

These are in the Epic 12 open-questions list; raising here to ensure they're tracked.

---

*End of architecture doc v1.0. Any change to this document requires a corresponding ADR.*
