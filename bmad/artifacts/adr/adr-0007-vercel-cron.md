# ADR-0007: Vercel Cron for scheduled jobs (v1), with an exit plan

**Status:** Accepted
**Date:** 2026-04-24
**Deciders:** Winston (Architect)

---

## Context

v1 has three scheduled jobs:
1. Price refresh (nightly, 11:30 PM IST)
2. Valuation recomputation (nightly, 11:45 PM IST)
3. Budget alert emails (daily, 8:00 PM IST)

v1.5 adds more (recurring transaction posting, weekly backups). We need a scheduler that's reliable, cheap, and doesn't require running a separate service.

---

## Options considered

### 1. Vercel Cron
- ✅ Native to the hosting platform. Zero extra setup.
- ✅ Free tier: 2 cron jobs, any schedule. Pro: unlimited.
- ✅ Triggers a regular Next.js API route — simple to implement and test.
- ⚠️ 10-second execution limit on Hobby; 60 seconds on Pro plans.
- ⚠️ No retry on failure (you build retries yourself).
- ⚠️ No observable execution history UI beyond function logs.

### 2. Supabase Edge Functions + `pg_cron`
- ✅ Runs close to the data; no egress.
- ✅ `pg_cron` is reliable.
- ❌ Edge functions use Deno, not Node — separates the cron code from the rest.
- ❌ Two runtimes to maintain.

### 3. External scheduler (Upstash QStash, GitHub Actions cron, cron-job.org)
- ✅ Retries built in (Upstash especially).
- ✅ Decoupled from hosting.
- ❌ Another vendor / free tier to babysit.
- ❌ GitHub Actions cron is notoriously imprecise (can drift by 10+ minutes).

### 4. Self-hosted cron on a VPS
- ❌ Contradicts our "fully managed" decision.

---

## Decision

**We will use Vercel Cron for v1. When we hit its limits (more than 2 jobs on Hobby, or needing reliable retries), we migrate to Upstash QStash as the chosen upgrade path.**

Free tier of Vercel = 2 crons; v1 has 3 jobs. We will **combine two** into a single invocation:
- `/api/cron/refresh-prices` at 11:30 PM IST → internally, after price refresh, also triggers valuation recomputation sequentially (same endpoint).
- `/api/cron/send-budget-alerts` at 8:00 PM IST.

Two cron slots, three jobs' worth of work. Upgrade to Vercel Pro ($20/mo) or QStash when we need more.

---

## Implementation pattern

### `vercel.json`
```json
{
  "crons": [
    { "path": "/api/cron/nightly-refresh", "schedule": "0 18 * * *" },
    { "path": "/api/cron/send-budget-alerts", "schedule": "30 14 * * *" }
  ]
}
```
(Vercel schedules are in UTC: 18:00 UTC = 23:30 IST, 14:30 UTC = 20:00 IST.)

### Endpoint template
```ts
// app/api/cron/nightly-refresh/route.ts
export const runtime = 'nodejs';
export const maxDuration = 60; // Pro plan; Hobby caps at 10

export async function POST(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  const started = Date.now();
  try {
    await refreshPrices();                  // step 1
    await recomputeValuations();            // step 2 (uses refreshed prices)
    logger.info({ ms: Date.now() - started }, 'nightly-refresh ok');
    return Response.json({ ok: true });
  } catch (e) {
    reportError(e, { context: 'nightly-refresh' });
    return new Response('Job failed', { status: 500 });
  }
}
```

### Idempotency
Every cron job is designed to be safely re-run same-day:
- Price upserts use `ON CONFLICT (identifier, asset_class, date) DO UPDATE`.
- Valuation upserts use `(holding_id, as_of_date)` unique key.
- Alert email dedupe table prevents double-sends.

### Observability
- Every run logs start, end, items processed, items failed, duration.
- A Sentry `captureMessage` fires on failure.
- Weekly: eyeball the Vercel function logs for anomalies.

---

## Rationale

1. **Simplest possible v1.** Vercel Cron requires zero new infrastructure.
2. **Same codebase.** The cron endpoint is a regular API route — tested the same way as everything else.
3. **Clear exit plan.** When we need retries or more slots, Upstash QStash is drop-in: it calls the same API route with the same auth header.
4. **10-second limit is not a problem yet.** v1 has <50 holdings in the worst case. Price refresh + valuation takes <2 seconds with batched fetches.

### Trade-offs knowingly accepted
- No automatic retry on failure. Mitigated by Sentry alert → manual re-trigger if it happens. For a personal app, once-a-month manual intervention is fine.
- No built-in run history UI. Function logs + our own logging are sufficient.
- If a cron fires while deploying, it may miss. Vercel's behavior is to skip, not queue. Accepted.

---

## Consequences

- ✅ No extra dependency.
- ✅ Migration path is understood and bounded.
- ⚠️ Must watch execution time. If any cron nears 10s on Hobby, either upgrade to Pro or split into smaller batches (per-asset-class endpoints).
- ⚠️ If Vercel Cron outage happens on the AMFI NAV update day, we miss that day's price. Next run picks up fresh data; staleness UI tells the user. Acceptable.
- 🔁 Reversibility: very high. Swap to QStash is a vercel.json → QStash schedule change; endpoint stays identical.

---

## References

- [Vercel Cron docs](https://vercel.com/docs/cron-jobs)
- [Upstash QStash](https://upstash.com/docs/qstash)
- Epic 04 (nightly refresh), Epic 05 (alert cron)
