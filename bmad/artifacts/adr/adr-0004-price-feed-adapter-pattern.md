# ADR-0004: Price-feed adapter pattern with a shared cache table

**Status:** Accepted
**Date:** 2026-04-24
**Deciders:** Winston (Architect)

---

## Context

Epic 04 requires live valuation across MFs (AMFI), stocks (Yahoo/Alpha Vantage), crypto (CoinGecko), and optional gold (MetalPriceAPI). These sources:
- Have different APIs, rate limits, response formats.
- Have different reliability profiles — Yahoo is an unofficial API and breaks.
- Must be used by both the nightly cron and (potentially) on-demand refresh in v1.5.
- Must not become scattered fetch calls across the codebase.

---

## Options considered

### 1. Single adapter interface + registry + shared cache table
Each source implements a common `PriceAdapter` interface. A `registry` picks the right adapter per holding and handles fallback chains. All results persist in one `asset_prices` table.

### 2. Per-source modules called ad-hoc wherever needed
Simpler on day 1. Decays quickly — "who calls AMFI?" becomes a grep hunt.

### 3. Third-party aggregator (e.g., a paid service that covers all sources)
Exists for stocks + crypto; no single vendor covers Indian MFs + PPF formulas. Would still need per-source code for the gaps. Also adds a paid dependency.

---

## Decision

**We will implement a `PriceAdapter` interface + a `registry` that selects and falls back across adapters. All price results write to a single shared `asset_prices` table keyed by `(identifier, asset_class, date)`.**

---

## Pattern

### Interface
```ts
// lib/prices/types.ts
export interface PriceAdapter {
  readonly id: PriceSource;
  readonly assetClasses: AssetClass[];
  canHandle(holding: { assetClass: AssetClass; identifier: string | null }): boolean;
  fetchLatest(identifiers: string[]): Promise<PriceResult[]>;
}

export type PriceResult =
  | { ok: true; identifier: string; date: Date; price: Decimal }
  | { ok: false; identifier: string; error: string };
```

### Registry + fallback
```ts
// lib/prices/registry.ts
const chains: Record<AssetClass, PriceAdapter[]> = {
  MUTUAL_FUND: [amfiAdapter],                     // AMFI only
  STOCK:       [yahooAdapter, alphaVantageAdapter], // fallback chain
  CRYPTO:      [coinGeckoAdapter],
  GOLD:        [metalPriceApiAdapter, manualAdapter],
  // FD/RD/PPF/EPF use deterministicAdapter (not fetched, computed)
  // REAL_ESTATE, OTHER use manualAdapter
};

export async function refreshPrices(holdings: Holding[]) {
  const byClass = groupBy(holdings, h => h.assetClass);
  for (const [cls, hs] of Object.entries(byClass)) {
    for (const adapter of chains[cls]) {
      const ids = hs.map(h => h.identifier!).filter(Boolean);
      const results = await adapter.fetchLatest(ids);
      const ok = results.filter(r => r.ok);
      const failed = results.filter(r => !r.ok);
      await upsertPrices(ok, adapter.id);
      if (failed.length === 0) break; // all succeeded, skip next in chain
      // else, next adapter in chain tries the failed identifiers
    }
  }
}
```

### Shared cache — `asset_prices`
```prisma
model AssetPrice {
  id          String      @id @default(uuid())
  identifier  String      // scheme_code / ticker / coin_id
  assetClass  AssetClass  @map("asset_class")
  date        DateTime    // date of the price observation (date, not timestamp)
  price       Decimal
  source      PriceSource
  createdAt   DateTime    @default(now())

  @@unique([identifier, assetClass, date])  // one price per identifier per day
  @@index([identifier, date])
}
```

### On read
Portfolio / holding views read via `latestPrice(identifier, assetClass)` helper that returns the most recent `asset_price` row. If the price is stale beyond a threshold, UI shows "Last refreshed N days ago."

---

## Rationale

1. **Adapter pattern isolates blast radius.** When (not if) Yahoo's unofficial API changes response shape, only `lib/prices/yahoo.ts` breaks. Nothing else knows about Yahoo.
2. **Fallback chains are declarative.** The chain for STOCK is two entries; adding a third source later is one line of code.
3. **Shared cache avoids re-hitting APIs.** Dashboard reads don't trigger external calls — they read `asset_prices`. Cron owns the freshness.
4. **Uniform storage enables analytics.** Price history (for holding-detail charts, Epic 04 Story 04.9 AC-4) comes for free — just query `asset_prices` by date.
5. **Manual values fit the same model.** Gold/real-estate "manual value entry" writes a row with `source = MANUAL`. Read path is identical.

### Trade-offs knowingly accepted
- The registry is lightly hard-coded. Adding a new asset class needs a code change (not config). For v1, that's fine.
- Batch failures are handled per-adapter; if both Yahoo *and* Alpha Vantage fail on the same night, we fall through to "use yesterday's price." UI surfaces staleness.

---

## Consequences

- ✅ Single place to add or replace a source.
- ✅ Dashboards are fast — they read a table, not external APIs.
- ✅ Graceful degradation (stale prices beat broken prices).
- ⚠️ A silent-failure class: if AMFI file format changes subtly, parser may return "success" with bad data. Mitigation: schema-validate parsed rows; alert on >20% miss rate.
- ⚠️ Source-specific quirks (Yahoo's `.NS` / `.BO` suffixes, CoinGecko coin-IDs) live *inside* the respective adapter, never leak out.
- 🔁 Reversibility: high. Swapping an adapter is a one-file change.

---

## References

- [AMFI NAV file format](https://www.amfiindia.com/spages/NAVAll.txt)
- [Yahoo Finance unofficial endpoints](https://github.com/ranaroussi/yfinance) (reference implementation)
- [Alpha Vantage API docs](https://www.alphavantage.co/documentation/)
- [CoinGecko API v3](https://www.coingecko.com/en/api/documentation)
- Epic 04 Stories 04.3, 04.4, 04.5, 04.6, 04.7
