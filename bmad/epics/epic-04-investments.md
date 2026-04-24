# Epic 04 — Investments (Ledger + Live Valuation)

**Status:** drafted
**Owner:** Tushar
**Depends on:** Epic 01 (auth), Epic 02 (accounts — for broker/bank tagging)
**Unblocks:** Epic 06 (portfolio card in dashboard)
**Estimated duration:** ~2.5 weeks (largest epic)

---

## Why this epic exists

Investments are where the app transcends Excel. The user holds assets across **mutual funds, stocks, FDs, PPF, EPF, crypto, gold, and real estate**. Today reconciling them means logging into 5 apps. This epic delivers a **unified ledger with live valuation** so the user sees a single net-worth number.

This is the **largest and highest-risk epic** because it depends on external APIs (AMFI, Yahoo/NSE, CoinGecko) and unforgiving financial math (XIRR, deterministic FD accruals).

---

## Scope — in

- Holdings CRUD across asset classes: `MUTUAL_FUND`, `STOCK`, `FD`, `RD`, `PPF`, `EPF`, `CRYPTO`, `GOLD`, `REAL_ESTATE`, `OTHER`.
- Investment transaction ledger: `BUY`, `SELL`, `SIP`, `DIVIDEND`, `INTEREST`, `BONUS`, `WITHDRAWAL`, `MATURITY`.
- Live price fetching for MF (AMFI), stocks (Yahoo Finance fallback Alpha Vantage), crypto (CoinGecko).
- Deterministic valuation for FD / RD / PPF / EPF from interest-rate formulas.
- Manual current value entry for gold / real estate / other.
- Nightly cron job that refreshes prices and writes `holding_valuations` snapshots.
- XIRR calculation per holding (Newton's method).
- Holdings list view with invested / current / absolute return / XIRR columns.
- Holding detail view with transaction history.

## Scope — out

- ❌ Automatic import from broker APIs (Zerodha Kite, Groww) — v2.
- ❌ Dividend / bonus auto-fetch from AMFI — v1.5.
- ❌ Tax-loss harvesting suggestions — v2+.
- ❌ Goal tracking ("retire by 50") — v1.5.
- ❌ Asset allocation recommendations — v2+.

---

## User stories

### Story 04.1 — Create a holding (all asset classes)
**As a** user
**I want** to create a holding of any asset class
**So that** I can start tracking it.

**Acceptance criteria:**
- [ ] AC-1: Holding form asks for asset class, name, identifier (scheme code / ticker / ISIN / symbol).
- [ ] AC-2: For MF: autocomplete scheme names from cached AMFI scheme list.
- [ ] AC-3: For stocks: user types NSE/BSE ticker; validation that it resolves.
- [ ] AC-4: For FD/RD/PPF/EPF: form asks for principal, interest rate %, start date, maturity date (PPF: defaults to 15 years).
- [ ] AC-5: For crypto: coin ID autocomplete from CoinGecko list.
- [ ] AC-6: For gold/real-estate/other: free-text name + "track by manual value" flag.
- [ ] AC-7: Optional link to an `account_id` (which broker/bank holds it).

**Dependencies:** Epic 02 done. Cached scheme / ticker lists (pre-seeded or fetched on demand).
**Status:** drafted

### Story 04.2 — Investment transaction entry
**As a** user
**I want** to record BUY / SELL / SIP / DIVIDEND events
**So that** my ledger is event-sourced and auditable.

**Acceptance criteria:**
- [ ] AC-1: Select holding → add transaction.
- [ ] AC-2: Fields by txn_type:
  - `BUY` / `SIP`: units, price_per_unit, amount (auto-calc), date
  - `SELL`: units, price_per_unit, amount, date
  - `DIVIDEND` / `INTEREST`: amount, date, optional "reinvested" flag
  - `BONUS`: units granted, date
  - `WITHDRAWAL` / `MATURITY`: amount, date
- [ ] AC-3: Holding's units_held = SUM(BUY) + SUM(SIP) + SUM(BONUS) − SUM(SELL).
- [ ] AC-4: Invested amount = SUM(BUY) + SUM(SIP) − SUM(SELL proceeds) (for cost basis; exact method = FIFO, noted as ADR).

**Dependencies:** 04.1
**Status:** drafted

### Story 04.3 — Price-feed adapter: Mutual Funds (AMFI)
**As the** system
**I want** to fetch MF NAVs daily from AMFI
**So that** MF holdings show live current value.

**Acceptance criteria:**
- [ ] AC-1: Vercel Cron runs nightly at 11:30 PM IST.
- [ ] AC-2: Fetches AMFI's daily NAV text file, parses it, upserts into `asset_prices` (scheme_code + date + nav).
- [ ] AC-3: On failure, logs error to Sentry and proceeds; last-known price is used.
- [ ] AC-4: Cache lookup: `asset_prices` WHERE identifier = scheme_code ORDER BY date DESC LIMIT 1.

**Dependencies:** Architecture ADR-0004 (price-feed adapter pattern).
**Status:** drafted

### Story 04.4 — Price-feed adapter: Stocks
**As the** system
**I want** to fetch NSE/BSE stock prices
**So that** stock holdings show live value.

**Acceptance criteria:**
- [ ] AC-1: Primary source: Yahoo Finance API (unofficial). Fallback: Alpha Vantage (250 calls/day free).
- [ ] AC-2: Batched fetch (all user's tickers at once).
- [ ] AC-3: Runs on same nightly cron as 04.3.
- [ ] AC-4: Exchange suffix handled (`TCS.NS`, `RELIANCE.BO`).
- [ ] AC-5: Fallback logic tested: disable primary → secondary fetches.

**Dependencies:** 04.3 adapter pattern.
**Status:** drafted

### Story 04.5 — Price-feed adapter: Crypto (CoinGecko)
**As the** system
**I want** to fetch crypto prices from CoinGecko
**So that** crypto holdings show live INR value.

**Acceptance criteria:**
- [ ] AC-1: Uses free `/simple/price` endpoint with `vs_currency=inr`.
- [ ] AC-2: Batched fetch, respects 50 calls/min rate limit.
- [ ] AC-3: Runs on same nightly cron.
- [ ] AC-4: Coin IDs validated on holding creation (04.1 AC-5).

**Dependencies:** 04.3 adapter pattern.
**Status:** drafted

### Story 04.6 — Deterministic valuation: FD / RD / PPF / EPF
**As the** system
**I want** to compute current value of fixed-rate instruments from formulas
**So that** I don't depend on external APIs for them.

**Acceptance criteria:**
- [ ] AC-1: FD: `current_value = principal * (1 + rate/100 * years_elapsed)` for simple interest, or compound if specified.
- [ ] AC-2: RD: sum of monthly installments compounded at quarterly intervals.
- [ ] AC-3: PPF: compound annually at government rate (configurable; default 7.1% 2026).
- [ ] AC-4: EPF: compound annually at EPFO rate (configurable; default 8.25%).
- [ ] AC-5: Computed at every valuation-refresh run. Stored in `holding_valuations`.

**Dependencies:** none (pure math).
**Status:** drafted

### Story 04.7 — Manual valuation: Gold / Real Estate / Other
**As a** user
**I want** to enter the current value of illiquid assets manually
**So that** net worth reflects them.

**Acceptance criteria:**
- [ ] AC-1: For holdings flagged as "manual value," holding detail page shows an "Update current value" button.
- [ ] AC-2: Form asks for current value + as-of date (defaults today).
- [ ] AC-3: Stored as a row in `asset_prices` with `source = MANUAL`.
- [ ] AC-4: Dashboard / holding list uses the latest manual value; shows "Last updated {N} days ago" if stale (>90 days).

**Dependencies:** 04.1
**Status:** drafted

### Story 04.8 — Holding list view with portfolio table
**As a** user
**I want** to see all holdings in a table with invested / current / return / XIRR
**So that** I can assess performance at a glance.

**Acceptance criteria:**
- [ ] AC-1: Table columns: name, asset class, invested, current, absolute return ₹, absolute return %, XIRR %, % of portfolio.
- [ ] AC-2: Sortable by any column.
- [ ] AC-3: Grouped view toggle: by asset class.
- [ ] AC-4: "Last refreshed" timestamp visible.
- [ ] AC-5: Totals row at bottom.

**Dependencies:** 04.2 + 04.3/4/5/6/7 (needs valuations).
**Status:** drafted

### Story 04.9 — Holding detail view
**As a** user
**I want** to drill into a holding to see its transaction history and performance
**So that** I can audit and understand returns.

**Acceptance criteria:**
- [ ] AC-1: Shows metadata (name, asset class, identifier, start date).
- [ ] AC-2: Summary: invested, current, absolute ₹/%, XIRR.
- [ ] AC-3: Chronological transaction list (BUY/SIP/DIVIDEND/etc).
- [ ] AC-4: For auto-priced assets: NAV/price chart (12-month).
- [ ] AC-5: "Add transaction" and "Edit holding" actions.

**Dependencies:** 04.2, 04.8
**Status:** drafted

### Story 04.10 — XIRR computation & nightly snapshot
**As the** system
**I want** to compute XIRR per holding nightly
**So that** it's available instantly on dashboard reads.

**Acceptance criteria:**
- [ ] AC-1: Cashflow series = all `investment_txns` for the holding + current valuation as final cashflow.
- [ ] AC-2: XIRR computed via Newton's method; fallback to bisection if Newton doesn't converge in 50 iterations.
- [ ] AC-3: Result stored in `holding_valuations` with `as_of_date = today`.
- [ ] AC-4: Unit tests cover: positive return, negative return, single-cashflow edge case, convergence failure.

**Dependencies:** 04.3, 04.4, 04.5, 04.6, 04.7 (needs valuations to compute).
**Status:** drafted

---

## Data model impact

```prisma
model InvestmentHolding {
  id            String      @id @default(uuid())
  userId        String      @map("user_id")
  assetClass    AssetClass  @map("asset_class")
  name          String
  identifier    String?     // scheme_code, ticker, coin_id, ISIN — null for illiquid
  accountId     String?     @map("account_id")
  status        HoldingStatus @default(ACTIVE)
  isManualValue Boolean     @default(false) @map("is_manual_value")
  metadata      Json        @default("{}")
  createdAt     DateTime    @default(now())

  user          User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  txns          InvestmentTxn[]
  valuations    HoldingValuation[]
}

model InvestmentTxn {
  id          String     @id @default(uuid())
  holdingId   String     @map("holding_id")
  txnType     InvTxnType @map("txn_type")
  units       Decimal?
  pricePerUnit Decimal?  @map("price_per_unit")
  amount      Int        // paise
  txnDate     DateTime   @map("txn_date")
  notes       String?

  holding     InvestmentHolding @relation(fields: [holdingId], references: [id], onDelete: Cascade)

  @@index([holdingId, txnDate])
}

model AssetPrice {
  id          String    @id @default(uuid())
  identifier  String
  assetClass  AssetClass @map("asset_class")
  date        DateTime
  price       Decimal
  source      PriceSource
  createdAt   DateTime   @default(now())

  @@unique([identifier, assetClass, date])
  @@index([identifier, date])
}

model HoldingValuation {
  id              String   @id @default(uuid())
  holdingId       String   @map("holding_id")
  asOfDate        DateTime @map("as_of_date")
  investedAmount  Int      @map("invested_amount")
  currentValue    Int      @map("current_value")
  realizedGain    Int      @map("realized_gain")
  unrealizedGain  Int      @map("unrealized_gain")
  xirr            Decimal?

  holding         InvestmentHolding @relation(fields: [holdingId], references: [id], onDelete: Cascade)

  @@unique([holdingId, asOfDate])
}

enum AssetClass { MUTUAL_FUND STOCK FD RD PPF EPF CRYPTO GOLD REAL_ESTATE OTHER }
enum HoldingStatus { ACTIVE CLOSED MATURED }
enum InvTxnType { BUY SELL SIP DIVIDEND INTEREST BONUS WITHDRAWAL MATURITY }
enum PriceSource { AMFI YAHOO ALPHA_VANTAGE COINGECKO METALS_API MANUAL DERIVED }
```

---

## API surface

| Method | Path | Purpose |
|---|---|---|
| POST/GET/PATCH | `/api/holdings[...]` | Holding CRUD |
| POST/GET/PATCH/DELETE | `/api/holdings/[id]/txns[...]` | Investment transactions |
| POST | `/api/holdings/[id]/manual-value` | Manual value update |
| GET | `/api/portfolio` | Aggregated portfolio snapshot |
| GET | `/api/holdings/[id]/price-history` | Price chart data |
| POST | `/api/cron/refresh-prices` | Cron endpoint (protected by `CRON_SECRET`) |
| POST | `/api/cron/recompute-valuations` | Cron endpoint |

---

## UX references

- Holding creation form (per asset class variants) → `front-end-spec.md § Add Holding`
- Investment transaction entry → `front-end-spec.md § Investment Txn`
- Portfolio table → `front-end-spec.md § Portfolio Table`
- Holding detail → `front-end-spec.md § Holding Detail`

---

## Risks

- **Yahoo Finance unofficial API drift.** Breakage is a question of when, not if. **Mitigation:** Alpha Vantage fallback; adapter pattern from ADR-0004; Sentry alerts.
- **AMFI file format changes.** **Mitigation:** parser has schema validation; fails loudly.
- **XIRR convergence failures** on weird cashflows (all negative, single point). **Mitigation:** unit tests; bisection fallback; mark as null if truly undefined.
- **FIFO vs. average cost** for SELL transactions. **Mitigation:** ADR documents choice (default: FIFO); computations isolated in a pure helper.
- **Paise-integer arithmetic for Decimals.** **Mitigation:** `bigint` / `Decimal` types throughout; unit tests for rounding.

---

## Definition of done (epic-level)

- [ ] All 10 stories `done`.
- [ ] I can add a holding for each asset class, log txns, and see valuation.
- [ ] Nightly cron refreshes prices successfully for 3+ consecutive nights.
- [ ] XIRR matches independent calculation for a test case.
- [ ] Portfolio total matches manual reconciliation ±2%.
- [ ] Price-feed fallback tested (primary disabled → secondary takes over).
- [ ] `CHANGELOG.md` has Epic 04 entry.
- [ ] ADR-0004 (price-feed adapter), ADR-0006 (event-sourced investment_txns), and an FIFO ADR exist.
