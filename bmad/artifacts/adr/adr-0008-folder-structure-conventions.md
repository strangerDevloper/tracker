# ADR-0008: Folder structure and naming conventions

**Status:** Accepted
**Date:** 2026-04-24
**Deciders:** Winston (Architect)

---

## Context

Without a pre-agreed structure, Dev (James) will improvise — and so will Claude when pair-programming. Three sessions in, we'll have `components/Button.tsx` and `components/ui/button.tsx` and `src/components/button/index.tsx`. This ADR fixes the shape.

---

## Decision

### Top-level layout
```
.
├── app/              # Next.js App Router — routes + layouts only
├── components/       # React components (presentational + domain)
├── lib/              # Non-React domain logic, helpers, adapters
├── prisma/           # Schema + migrations + seed
├── tests/            # Unit + integration + e2e tests
├── types/            # Shared TypeScript types (non-Prisma)
├── scripts/          # One-off scripts (seed data, dev utilities)
├── public/           # Static assets
└── bmad/             # Planning artifacts (PRD, epics, ADRs, stories)
```

### `app/` — route groups
```
app/
├── (auth)/
│   └── login/page.tsx
├── (finance)/                    # authenticated routes; middleware enforces
│   ├── layout.tsx                # app shell
│   ├── dashboard/
│   ├── transactions/
│   ├── investments/
│   ├── budgets/
│   └── settings/
├── api/
│   ├── {resource}/route.ts       # REST-style endpoints
│   └── cron/{job}/route.ts
├── layout.tsx
├── page.tsx                      # public landing
└── middleware.ts
```

### `components/` — 4 sub-folders, clear boundaries
```
components/
├── ui/                 # shadcn-generated primitives (Button, Input, Dialog...)
├── charts/             # Recharts wrappers — isolated, swap-ready
├── forms/              # Shared form primitives (FormField, CurrencyInput, ...)
└── finance/            # Domain components (QuickExpenseEntry, HoldingCard, ...)
```

Rules:
- `ui/` — only shadcn-owned primitives. Don't put domain logic here.
- `charts/` — a thin adapter layer. If we swap Recharts for Visx, this is the only folder that changes.
- `forms/` — reusable inputs (`<CurrencyInput />`, `<DatePicker />`, `<CategorySelect />`).
- `finance/` — multi-input domain components composed from the above three.

### `lib/` — the "everything that isn't React" folder
```
lib/
├── db/
│   ├── client.ts           # singleton Prisma client
│   └── with-auth.ts        # RLS-aware query helper
├── auth/
│   ├── server.ts           # createServerClient for RSC
│   ├── client.ts           # createBrowserClient
│   └── get-authed-user.ts  # throws if unauth
├── finance/                # pure domain logic — no DB, no side effects
│   ├── money.ts
│   ├── xirr.ts
│   ├── networth.ts
│   ├── budgets.ts
│   ├── transactions.ts     # transactionsForAnalytics()
│   └── holdings.ts
├── prices/                 # price-feed adapters (ADR-0004)
├── validation/             # shared Zod schemas
├── email/
│   ├── send.ts             # Resend wrapper
│   └── templates/
├── logger/
│   └── index.ts            # structured logging
└── errors/
    └── app-error.ts        # standard error types
```

Rule: `lib/finance/*` is **pure** — no imports from `lib/db/` or any Prisma. Pure logic is trivially testable and reusable on the WhatsApp bot.

### `tests/`
```
tests/
├── unit/          # Mirrors lib/ structure. Fast. No DB.
├── integration/   # API routes + DB round-trip. Real Supabase local.
├── e2e/           # Playwright. Against vercel preview or localhost.
└── fixtures/      # Shared test data factories
```

---

## Naming conventions

### Files
- React components: `PascalCase.tsx` (matches the component name, e.g. `QuickExpenseEntry.tsx`).
- Non-React files: `kebab-case.ts` (e.g., `get-authed-user.ts`, `transactions-for-analytics.ts`).
- Route files: Next.js convention (`page.tsx`, `layout.tsx`, `route.ts`).

### Variables & functions
- Variables, functions: `camelCase`.
- Types, interfaces, enums: `PascalCase`.
- Constants that are truly constant: `SCREAMING_SNAKE_CASE`.

### Database (Postgres / Prisma)
- Table names: `snake_case`, pluralized (`transactions`, `investment_holdings`).
- Column names: `snake_case` in DB; `camelCase` in Prisma with `@map()`.
- Foreign keys: `{entity}_id`.
- Timestamps: `created_at`, `updated_at`, `archived_at`, `deleted_at`.

### Routes
- API paths: plural nouns (`/api/transactions`, not `/api/transaction`).
- Page routes: lowercase, readable (`/investments`, `/investments/[id]`).

---

## Import ordering (enforced by ESLint / Prettier)

```ts
// 1. Node / framework
import { NextRequest } from 'next/server';

// 2. Third-party
import { z } from 'zod';
import { Decimal } from 'decimal.js';

// 3. Internal — grouped by folder, alphabetical
import { prisma } from '@/lib/db/client';
import { getAuthedUser } from '@/lib/auth/get-authed-user';
import { transactionsForAnalytics } from '@/lib/finance/transactions';

// 4. Components
import { Button } from '@/components/ui/button';

// 5. Types
import type { Transaction } from '@prisma/client';
```

---

## Code-review rules derived from this ADR

1. **New files go in existing folders.** Don't create a new top-level folder without an ADR.
2. **`lib/finance/*` stays pure.** No DB imports. CI rule (eslint import restriction).
3. **`components/ui/*` stays shadcn-owned.** Don't add domain logic there.
4. **Every new endpoint uses Zod validation.** No bare `req.json()` in a route handler.
5. **Money as `Int` (paise) everywhere except display code.** Display code is only in components.

---

## Rationale

1. **Predictability beats cleverness.** A solo dev's biggest risk is future-self confusion. A boring, consistent layout is the cure.
2. **Clear swap boundaries.** If we change charting library, swap one folder. If we change auth provider, swap one folder. Nothing bleeds across.
3. **Pure-logic isolation.** `lib/finance/*` being pure is what lets us reuse it in a WhatsApp Cloudflare Worker later.
4. **Structure matches BMAD.** Epics and ADRs live next to the code in `bmad/`; planning and execution don't drift.

---

## Consequences

- ✅ Every new story has an obvious "where does this go" answer.
- ✅ Code review has a short list of structural rules to check.
- ⚠️ Requires discipline. The one missed "new top-level folder" PR is where drift starts. Use the `.github/CODEOWNERS` or a linter if we can.
- 🔁 Reversibility: moderate. Refactors are annoying but fine while the app is small.

---

## References

- [Next.js App Router conventions](https://nextjs.org/docs/app/building-your-application/routing/colocation)
- [shadcn/ui install guide](https://ui.shadcn.com/docs/installation/next)
- architecture.md §3
