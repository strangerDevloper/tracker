# ADR-0009: FIFO cost basis for investment SELL transactions

**Status:** Accepted
**Date:** 2026-04-24
**Deciders:** Winston (Architect)

---

## Context

When a user sells units of a holding (mutual fund, stock), they've typically purchased those units across multiple BUY/SIP events at different prices. To compute **realized gain** and **remaining invested amount**, we need a cost-basis policy: which units did they "sell"?

Indian tax law uses **FIFO** (First In, First Out) for mutual funds and equities. The app's computations should align with what the user sees in their tax filings.

---

## Options considered

### 1. FIFO (First In, First Out)
- ✅ Matches Indian tax treatment for MF + equity capital gains.
- ✅ Deterministic and auditable.
- ✅ Conservative — oldest units first means older gains get realized first.
- ⚠️ Requires tracking purchase lots, not just aggregate units.

### 2. Weighted average cost
- ✅ Simpler to implement (single running average).
- ❌ Does not match Indian tax law.
- ❌ Realized-gain numbers diverge from the user's actual tax view.

### 3. LIFO (Last In, First Out)
- Not applicable to Indian tax regime.

### 4. User-selectable per holding
- ✅ Maximum flexibility.
- ❌ Over-engineered for v1. Nobody actually needs this for a personal tracker.

---

## Decision

**We will use FIFO cost basis for all SELL transactions, applied within a single holding.**

No per-holding customization in v1. Add it in v1.5 only if there's a concrete reason.

---

## Algorithm

Given a SELL of `N` units at `p_sell` on date `d_sell`, for a holding with prior `BUY / SIP / BONUS` events:

1. Build a queue of **purchase lots**, oldest first. Each lot: `{ txn_date, units_remaining, price_per_unit }`.
2. BONUS events: `price_per_unit = 0` (no cost), `units_remaining = units`.
3. Pop units from the front of the queue until `N` is consumed.
4. For each consumed lot portion:
   - `realized_gain += (p_sell - lot.price_per_unit) * consumed_units`.
5. If the SELL is the last event in the queue, the queue tail represents remaining invested amount and units.

### Reference implementation sketch
```ts
// lib/finance/holdings.ts
export function fifoApply(events: InvestmentTxn[]) {
  const lots: Lot[] = [];
  let realizedGain = 0; // paise

  for (const e of events.sort(byDate)) {
    if (e.txnType === 'BUY' || e.txnType === 'SIP') {
      lots.push({
        date: e.txnDate,
        unitsRemaining: e.units!,
        pricePerUnit: e.pricePerUnit!,
      });
    } else if (e.txnType === 'BONUS') {
      lots.push({ date: e.txnDate, unitsRemaining: e.units!, pricePerUnit: new Decimal(0) });
    } else if (e.txnType === 'SELL') {
      let toSell = e.units!;
      while (toSell.gt(0) && lots.length > 0) {
        const lot = lots[0];
        const consume = Decimal.min(toSell, lot.unitsRemaining);
        const costOfConsumed = consume.times(lot.pricePerUnit);
        const proceedsOfConsumed = consume.times(e.pricePerUnit!);
        realizedGain += proceedsOfConsumed.minus(costOfConsumed).toNumber(); // careful: paise
        lot.unitsRemaining = lot.unitsRemaining.minus(consume);
        toSell = toSell.minus(consume);
        if (lot.unitsRemaining.eq(0)) lots.shift();
      }
      if (toSell.gt(0)) throw new AppError('SELL exceeds available units');
    }
    // DIVIDEND / INTEREST / WITHDRAWAL / MATURITY don't affect FIFO
  }

  const unitsHeld = lots.reduce((n, l) => n.plus(l.unitsRemaining), new Decimal(0));
  const investedRemaining = lots.reduce(
    (n, l) => n.plus(l.unitsRemaining.times(l.pricePerUnit)), new Decimal(0),
  );
  return { unitsHeld, investedRemaining, realizedGain };
}
```

---

## Rationale

1. **Tax alignment.** The number the user sees on our portfolio page should be the same number they'd see from their broker's capital gains report. Mismatch causes confusion and erodes trust.
2. **Deterministic.** Given the same inputs, FIFO always produces the same output. Easy to test, easy to audit.
3. **Well-understood.** FIFO is the default assumption; even non-financial users recognize the behavior ("oldest first").

### Trade-offs knowingly accepted
- FIFO can produce higher realized gains (and higher notional tax) in rising markets vs. weighted average. That's a factual accounting outcome, not a bug.
- Slightly more implementation complexity than average-cost. Well-documented reference implementation mitigates.

---

## Scope and edge cases

- **FIFO is per-holding.** Two holdings of the same scheme (e.g., direct vs. regular plan) are separate queues.
- **Partial sells** are handled lot-by-lot (the algorithm above).
- **Bonus shares** enter the queue at zero cost. When sold, entire proceeds are realized gain. Consistent with tax treatment.
- **Reverse splits / unit consolidation:** not modeled in v1. If encountered, user enters a manual adjustment (two events: SELL old units at cost, BUY new units at same basis). Flag for v1.5.
- **Stock splits:** same manual-adjustment handling for v1.
- **Dividend reinvestment:** DIVIDEND event with reinvested=true creates an implicit BUY lot at the DIV record date's NAV. Implementation detail in Epic 04 Story 04.2.

---

## Consequences

- ✅ Numbers match the user's tax filings.
- ✅ Algorithm is testable with golden fixtures.
- ⚠️ Must persist enough history to compute FIFO — i.e., don't aggregate old events away.
- ⚠️ If FIFO math changes (bug fix), all snapshots must be invalidated + rebuilt. `valuation_schema_version` column handles this.
- 🔁 Reversibility: moderate. Switching to a different cost-basis policy later would require recomputing historical gains, which is an accounting event, not just a code change.

---

## References

- Indian Income Tax Act — Section 45 (capital gains) + Rule 2F (FIFO for mutual funds).
- Epic 04 Story 04.2, 04.10
- ADR-0006 (event-sourced investment txns)
