# ADR-0006: Event-sourced `investment_txns` ledger

**Status:** Accepted
**Date:** 2026-04-24
**Deciders:** Winston (Architect)

---

## Context

Investment holdings (Epic 04) have a running state — units held, invested amount, realized/unrealized gains — that changes with every BUY, SELL, SIP, DIVIDEND, BONUS, WITHDRAWAL, MATURITY event. We need to decide whether:
- The holding's *current state* is stored directly and mutated on each event, OR
- Only the *events* are stored, and state is derived by replaying them.

---

## Options considered

### 1. Event-sourced ledger + derived state
Store every `investment_txn` as an immutable event. Derive `units_held`, `invested_amount`, `realized_gain` by replaying events. Materialize snapshots in `holding_valuations` for performance.

### 2. Mutated holding state
Each BUY/SELL updates a `units_held` column on the holding in-place. Events are logged but not load-bearing.

### 3. Hybrid: store events AND mutate state on write
Double-write on every event. State is kept in sync with events.

---

## Decision

**We will use option 1 — event-sourced `investment_txns` are the source of truth; state is derived, with snapshots materialized nightly in `holding_valuations`.**

---

## Why this matters for a personal finance app

Investment accounting is unforgiving:
- **Backdated entries are common.** User remembers a ₹5,000 dividend from 3 months ago. Mutating state on a backdated entry means recomputing everything downstream anyway.
- **Corrections happen.** User logged the wrong price. With events, the fix is to edit one event and recompute. With mutated state, you're guessing what the state should be after the fix.
- **XIRR needs the full cashflow history.** Epic 04 Story 04.10 requires the complete series of dated cashflows. If state is mutated, the history has to be reconstructed from separate logs — painful.

Mutated state is a local optimization that loses to event-sourcing the moment you need to recompute.

---

## How it works

### Source of truth
```prisma
model InvestmentTxn {
  id            String     @id @default(uuid())
  holdingId     String     @map("holding_id")
  txnType       InvTxnType @map("txn_type")
  units         Decimal?           // set for BUY/SELL/SIP/BONUS
  pricePerUnit  Decimal?  @map("price_per_unit")
  amount        Int        // paise
  txnDate       DateTime   @map("txn_date")
  notes         String?

  holding       InvestmentHolding @relation(...)

  @@index([holdingId, txnDate])
}

enum InvTxnType {
  BUY SELL SIP DIVIDEND INTEREST BONUS WITHDRAWAL MATURITY
}
```

### Derivation helpers (pure functions in `lib/finance/holdings.ts`)

```ts
export function computeUnitsHeld(txns: InvestmentTxn[]): Decimal {
  return txns.reduce((n, t) => {
    if (t.txnType === 'BUY' || t.txnType === 'SIP' || t.txnType === 'BONUS') return n.plus(t.units!);
    if (t.txnType === 'SELL') return n.minus(t.units!);
    return n; // DIVIDEND / INTEREST / WITHDRAWAL / MATURITY don't change units
  }, new Decimal(0));
}

export function computeInvested(txns: InvestmentTxn[]): Int /* paise */ {
  // FIFO cost basis — see ADR-0009
  return fifoInvestedAmount(txns);
}

export function computeRealizedGain(txns: InvestmentTxn[]): Int { ... }
```

### Snapshot layer — `holding_valuations`
Nightly cron runs `computeAndSnapshot(holdingId, asOfDate)`:
1. Load all `investment_txns` for the holding.
2. Compute derived state.
3. Read latest price from `asset_prices` (or use deterministic formula for FD/PPF/EPF).
4. Compute `current_value`, `unrealized_gain`, `xirr`.
5. Upsert one row in `holding_valuations` for (holdingId, asOfDate).

Dashboard reads from `holding_valuations` — **no re-derivation on read**. This gives O(1) read latency regardless of how many events a holding has.

### Invariants
- `investment_txns` is **append-only in spirit** — edits and deletes are allowed (Story 04.9 AC-5), but each edit invalidates and recomputes snapshots.
- `holding_valuations` is a cache. If it disappears, it rebuilds from events on the next cron run.

---

## Rationale

1. **Auditability.** Every change to a holding is traceable to an event. Critical for money.
2. **Backdated entries are correct.** Log an old event → trigger recompute → state is correct. No "fix-up" logic.
3. **XIRR computation is natural.** The event list *is* the cashflow series.
4. **Replay is cheap.** 99% of holdings will have <100 events. Replay is microseconds.
5. **Snapshot table solves the performance concern.** Dashboards don't replay — they read the snapshot.

### Trade-offs knowingly accepted
- Edits are allowed (v1 doesn't keep full edit history). Acceptable: the user is solo; trust the user. v2 could add append-only `investment_txn_edits` if audit needs grow.
- Snapshot staleness during the day. Price + valuation only refresh nightly. Acceptable; we're not a day-trading app.

---

## Consequences

- ✅ Backdated entries just work.
- ✅ Corrections are safe (recompute from events).
- ✅ XIRR has its natural input available.
- ⚠️ Any new derived field must be added to the compute helpers — which means code review rule: never compute derived state inline in a query.
- ⚠️ If a compute function changes (bug fix in FIFO logic), we must invalidate + rebuild snapshots. Add a `valuation_schema_version` column to track when code changes require re-snapshot.
- 🔁 Reversibility: high. Mutated state can be introduced later without breaking anything — it'd just shadow the event log.

---

## References

- Epic 04 Stories 04.2, 04.10
- ADR-0009 (FIFO cost basis)
- architecture.md §4
