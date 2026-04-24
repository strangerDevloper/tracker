# ADR-0002: Prisma over Drizzle and Kysely for ORM

**Status:** Accepted
**Date:** 2026-04-24
**Deciders:** Winston (Architect), Tushar (Owner)

---

## Context

The app will have ~15–20 tables with non-trivial relations (users → accounts → transactions → categories; holdings → investment_txns → valuations). We need a data-access layer that:
- Generates end-to-end TypeScript types from the schema.
- Handles migrations safely.
- Works with Supabase Postgres (via pooled connection).
- Supports transactions (atomic import commits, transfer pairs).
- Doesn't become a maintenance nightmare.

---

## Options considered

### 1. Prisma
- ✅ Industry standard; enormous community; richest AI-coding support.
- ✅ First-class migration tooling (`prisma migrate`).
- ✅ Declarative schema → auto-generated types.
- ✅ Transactions API is clean (`prisma.$transaction([...])`).
- ✅ Works with Supabase pooled connections (via `DIRECT_URL` for migrations).
- ⚠️ Bundle size concern historically; much improved in v5.
- ⚠️ Query engine binary requires attention in serverless (Vercel handles it).
- ⚠️ Complex joins/relations can generate N+1s if you're careless.

### 2. Drizzle ORM
- ✅ Lightweight, no query engine binary.
- ✅ SQL-like API (feels natural for SQL-literate devs).
- ✅ Excellent types.
- ⚠️ Smaller ecosystem; fewer tutorials.
- ⚠️ Migration tooling less mature (though improving).
- ⚠️ AI-coding support is weaker — Claude occasionally hallucinates Drizzle syntax.

### 3. Kysely
- ✅ Tiny, pure TS, no runtime codegen.
- ✅ Best-in-class query builder; perfect SQL type inference.
- ❌ Not really an ORM — you write SQL-style queries yourself.
- ❌ No built-in migrations (use `kysely-migration` or `node-pg-migrate`).
- ❌ More boilerplate for a solo dev.

### 4. Supabase JS client (query builder) alone
- ✅ Zero setup, native to Supabase.
- ❌ No types derived from schema.
- ❌ No migration story (would rely on Supabase CLI + raw SQL).
- ❌ Hits the REST endpoint — extra hop vs. direct Postgres.

---

## Decision

**We will use Prisma 5.x as the ORM and migration tool.**

---

## Rationale

1. **Type-safety end-to-end.** The single most important property for a money app is: the TypeScript type you see in code matches the column in the DB. Prisma generates this automatically from a single source of truth (`schema.prisma`). Drizzle does this too; Kysely mostly; Supabase client does not.

2. **Migrations are non-negotiable and Prisma has the best tooling.** `prisma migrate dev` catches bad migrations locally; `prisma migrate deploy` applies them in prod; shadow-DB validation catches drift. For a solo dev, this is the most-likely place to shoot yourself in the foot, and Prisma provides the most guardrails.

3. **Ecosystem + AI support.** The bug I'll hit in month 6 is more likely to be findable on Google for Prisma than Drizzle. LLM pair-programming is significantly better for Prisma (density of training data).

4. **Transactions are core to us.** Import commit (Epic 07) and transfer pairs (Epic 03) both require atomic multi-row writes. `prisma.$transaction([...])` is clean and well-documented.

5. **Supabase integration is solved.** Use the pooler URL (`DATABASE_URL` via pgBouncer port 6543) for app traffic; use the direct URL (`DIRECT_URL` via port 5432) for migrations. Well-documented pattern.

### Trade-offs knowingly accepted
- Larger bundle than Drizzle. For a personal app with 1 user, irrelevant.
- Occasional N+1 risk — mitigated by reviewing queries during code review and using `include` judiciously.
- Query engine binary adds ~30MB to deployment. Vercel handles it; no practical issue.

### Why not Drizzle, specifically
I'd pick Drizzle if we were bundle-constrained or team-SQL-fluent. Neither applies. The AI-coding quality gap is the clincher.

### Why not Kysely
Kysely is beautiful, but I'd be writing more SQL by hand, which is a step backwards for velocity on a form-CRUD-heavy v1. Consider for a future service where SQL control matters more than developer ergonomics.

---

## Consequences

- ✅ Schema is the single source of truth. Generated types flow everywhere.
- ✅ Migrations are code-reviewable and version-controlled.
- ✅ Transactions have a clean API.
- ⚠️ We must set up `DIRECT_URL` correctly for migrations or they fail on pooled-only connections. Ops doc covers this.
- ⚠️ Prisma's `select`/`include` boilerplate for nested relations can get verbose — wrap in helper functions when it does.
- 🔁 Reversibility: migrating off Prisma later is painful (touches every DB call) but possible. Low priority given the above.

---

## References

- [Prisma + Supabase guide](https://supabase.com/partners/integrations/prisma)
- [Connection pooling with Prisma](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- architecture.md §4
